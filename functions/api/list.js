const json = (obj, status = 200) =>
  Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

function one(d) {
  if (!d || typeof d !== "object") return null;
  const n = String(d.n ?? "").trim().slice(0, 120);
  const s = String(d.s ?? "").trim().slice(0, 200);
  const m = Number(d.m);
  const p = Number(d.p);
  if (!n || !Number.isFinite(m) || !Number.isFinite(p)) return null;
  if (m < 0 || p < 0 || m > 1000000 || p > 1000000) return null;
  const o = { n, s, m, p };
  const c = String(d.c ?? "").trim().slice(0, 120);
  if (c) o.c = c;                                   // कंपनी
  const t = Number(d.t);
  if (Number.isInteger(t) && t >= 1 && t <= 200) o.t = t;  // पॅकेटमधील गोळ्या
  return o;
}

function clean(arr) {
  if (!Array.isArray(arr) || arr.length > MAX_LIST) return null;
  const out = [];
  for (const d of arr) {
    const o = one(d);
    if (!o) return null;
    out.push(o);
  }
  return out;
}

// ---------- updates.json मधील नवीन औषधे आपोआप यादीत जोडणे ----------
// Claude GitHub वर updates.json मध्ये नवीन "batch" टाकतो. साइट उघडल्यावर
// न लावलेला batch एकदाच यादीत मिसळला जातो (पासवर्डची गरज नाही).
const low = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

const MAX_LIST = 10000;

// एका वेळी एकच batch, Map वापरून — Cloudflare ची CPU मर्यादा ओलांडू नये म्हणून.
function mergeBatch(list, meds) {
  const key = (o) => low(o.n) + "|" + (o.t || 0);
  const exact = new Map();
  const names = new Map();
  list.forEach((o, i) => {
    const k = key(o);
    if (!exact.has(k)) exact.set(k, i);
    const n = low(o.n);
    const e = names.get(n);
    if (e) e.count++; else names.set(n, { count: 1, i });
  });
  for (const d of meds) {
    const k = key(d);
    const n = low(d.n);
    let i = exact.get(k);
    if (i === undefined) {
      const e = names.get(n);
      if (e && e.count === 1 && !list[e.i].t) {              // जुने, पॅक नसलेले
        i = e.i;
        exact.delete(key(list[i]));
        exact.set(k, i);
      }
    }
    if (i !== undefined) { list[i] = d; continue; }
    list.push(d);
    exact.set(k, list.length - 1);
    const e = names.get(n);
    if (e) e.count++; else names.set(n, { count: 1, i: list.length - 1 });
  }
}

async function loadUpdates(request, env) {
  try {
    const u = new URL("/updates.json", request.url);
    const r = env.ASSETS ? await env.ASSETS.fetch(u) : await fetch(u);
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j.batches) ? j.batches : [];
  } catch {
    return [];
  }
}

async function applyUpdates(request, env, list) {
  const batches = await loadUpdates(request, env);
  if (!batches.length) return list;
  let applied = [];
  try { applied = (await env.MEDS.get("applied", { type: "json" })) || []; } catch {}
  const todo = batches.filter((b) => b && b.id && !applied.includes(b.id));
  if (!todo.length) return list;
  const b = todo[0];                                  // उरलेले batch पुढच्या वेळी
  const rm = (Array.isArray(b.remove) ? b.remove : []).map(low);
  const base = Array.isArray(list) ? list : [];
  const out = rm.length ? base.filter((o) => !rm.includes(low(o.n))) : base.slice();
  mergeBatch(out, (Array.isArray(b.meds) ? b.meds : []).map(one).filter(Boolean));
  if (out.length > MAX_LIST) return list;
  applied.push(b.id);
  await env.MEDS.put("list", JSON.stringify(out));
  await env.MEDS.put("applied", JSON.stringify(applied));
  return out;
}

export async function onRequestGet({ request, env }) {
  if (!env.MEDS) return json({ meds: null });
  try {
    let v = await env.MEDS.get("list", { type: "json" });
    try { v = await applyUpdates(request, env, v); } catch {}
    return json({ meds: v ?? null });
  } catch {
    return json({ meds: null });
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "चुकीची विनंती." }, 400); }

  const secret = env.OWNER_PASSWORD;
  if (!secret) return json({ error: "OWNER_PASSWORD सेट केलेला नाही." }, 500);
  if (typeof body.password !== "string" || body.password !== secret) {
    return json({ error: "पासवर्ड चुकीचा आहे." }, 401);
  }
  if (body.meds === undefined) return json({ ok: true });

  if (!env.MEDS) return json({ error: "KV (MEDS) जोडलेले नाही." }, 500);
  const meds = clean(body.meds);
  if (!meds) return json({ error: "यादी बरोबर नाही." }, 400);
  await env.MEDS.put("list", JSON.stringify(meds));
  return json({ ok: true });
}
