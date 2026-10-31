import { getStore } from "@netlify/blobs";

const H = { "Cache-Control": "no-store" };
const json = (obj, status = 200) => Response.json(obj, { status, headers: H });

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

export default async (req) => {
  const store = getStore("medicines");

  // Sab customers: list padh sakte hain
  if (req.method === "GET") {
    try {
      const meds = await store.get("list", { type: "json" });
      return json({ meds: meds ?? null });
    } catch {
      return json({ meds: null });
    }
  }

  // Sirf owner: password ke saath list save kar sakta hai
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "चुकीची विनंती." }, 400);
    }
    const secret = process.env.OWNER_PASSWORD;
    if (!secret) return json({ error: "Netlify मध्ये OWNER_PASSWORD सेट केलेला नाही." }, 500);
    if (typeof body.password !== "string" || body.password !== secret) {
      return json({ error: "पासवर्ड चुकीचा आहे." }, 401);
    }
    // Sirf password check karna ho (login)
    if (body.meds === undefined) return json({ ok: true });

    const meds = clean(body.meds);
    if (!meds) return json({ error: "यादी बरोबर नाही." }, 400);
    await store.setJSON("list", meds);
    return json({ ok: true });
  }

  return json({ error: "परवानगी नाही." }, 405);
};
