const json = (obj, status = 200) =>
  Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

function clean(arr) {
  if (!Array.isArray(arr) || arr.length > 3000) return null;
  const out = [];
  for (const d of arr) {
    if (!d || typeof d !== "object") return null;
    const n = String(d.n ?? "").trim().slice(0, 120);
    const s = String(d.s ?? "").trim().slice(0, 200);
    const m = Number(d.m);
    const p = Number(d.p);
    if (!n || !Number.isFinite(m) || !Number.isFinite(p)) return null;
    if (m < 0 || p < 0 || m > 1000000 || p > 1000000) return null;
    out.push({ n, s, m, p });
  }
  return out;
}

export async function onRequestGet({ env }) {
  if (!env.MEDS) return json({ meds: null });
  try {
    const v = await env.MEDS.get("list", { type: "json" });
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
