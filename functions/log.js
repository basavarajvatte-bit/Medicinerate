const json = (o, s = 200) =>
  Response.json(o, { status: s, headers: { "Cache-Control": "no-store" } });
const istDay = (off = 0) =>
  new Date(Date.now() + 19800000 - off * 86400000).toISOString().slice(0, 10);
const clean = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, 80);

export async function onRequestPost({ request, env }) {
  if (!env.MEDS) return json({ error: "KV जोडलेले नाही." }, 500);
  let b;
  try { b = await request.json(); } catch { return json({ error: "चुकीची विनंती" }, 400); }

  if (b.report) {
    if (!env.OWNER_PASSWORD || b.password !== env.OWNER_PASSWORD)
      return json({ error: "पासवर्ड चुकीचा आहे." }, 401);
    const days = b.days === 7 ? 7 : 1;
    const all = {};
    for (let i = 0; i < days; i++) {
      const d = await env.MEDS.get("scanlog:" + istDay(i), "json");
      if (!d) continue;
      for (const k in d) {
        if (!all[k]) all[k] = { ...d[k] };
        else all[k].c += d[k].c;
      }
    }
    return json({ items: Object.values(all) });
  }

  const items = Array.isArray(b.items) ? b.items.slice(0, 20) : [];
  if (!items.length) return json({ ok: true });
  const key = "scanlog:" + istDay(0);
  const d = (await env.MEDS.get(key, "json")) || {};
  for (const it of items) {
    const n = clean(it.n);
    if (!n) continue;
    const k = n.toLowerCase();
    const e = d[k] || { n, s: clean(it.s), f: false, c: 0 };
    e.c += 1;
    e.f = !!it.f;
    if (!e.s) e.s = clean(it.s);
    d[k] = e;
  }
  if (Object.keys(d).length <= 500)
    await env.MEDS.put(key, JSON.stringify(d), { expirationTtl: 60 * 86400 });
  return json({ ok: true });
}
