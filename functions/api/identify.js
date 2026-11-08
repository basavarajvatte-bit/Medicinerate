import { checkOwner } from "../../lib/auth.js";
const json = (obj, status = 200) =>
  Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

const PROMPT =
  "The image shows ONE medicine strip, box or bottle. Read it and return:\n" +
  "- name: the brand name exactly as written (keep English letters).\n" +
  "- company: the manufacturer / marketing company name if visible, else empty string.\n" +
  "- salt: the composition with strength, e.g. 'Paracetamol 650mg' (keep English letters).\n" +
  "Do not guess. If something is not clearly readable, return an empty string for it.";

const SCHEMA = {
  type: "OBJECT",
  properties: { name: { type: "STRING" }, company: { type: "STRING" }, salt: { type: "STRING" } },
  required: ["name", "company", "salt"],
};

// ---------- Google ला कॉल ----------
async function callGemini(model, think, image, key, signal) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: PROMPT }] }],
      generationConfig: Object.assign(
        { temperature: 0, maxOutputTokens: 500, responseMimeType: "application/json", responseSchema: SCHEMA },
        think ? { thinkingConfig: { thinkingLevel: think } } : {}
      ),
    }),
  });
  const data = await r.json().catch(() => ({}));
  return { r, data };
}

// एका मॉडेलचा प्रयत्न
async function tryModel(name, think, image, key, ctrl) {
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    let out = await callGemini(name, think, image, key, ctrl.signal);
    if (out.r.status === 400 && think) out = await callGemini(name, "", image, key, ctrl.signal);
    if (!out.r.ok) {
      const detail = String((out.data && out.data.error && out.data.error.message) || "");
      return { fail: true, status: out.r.status, detail };
    }
    const text = (out.data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    let parsed;
    try { parsed = JSON.parse(text); } catch { return { fail: true, status: 200, detail: "unreadable" }; }
    return { ok: true, data: parsed || {} };
  } catch {
    return { fail: true, status: 0, detail: "timeout/network" };
  } finally {
    clearTimeout(timer);
  }
}

// शर्यत: मॉडेल 1 लगेच; hedgeMs नंतर किंवा अपयशावर पुढचा. जो आधी बरोबर उत्तर देईल तो जिंकतो.
function race(models, think, image, key, hedgeMs) {
  return new Promise((resolve) => {
    const ctrls = models.map(() => new AbortController());
    const started = models.map(() => false);
    let done = false, failed = 0, last = null;
    const finish = (v) => {
      if (done) return;
      done = true;
      ctrls.forEach((c) => { try { c.abort(); } catch {} });
      resolve(v);
    };
    const start = (i) => {
      if (done || i >= models.length || started[i]) return;
      started[i] = true;
      if (i + 1 < models.length) setTimeout(() => start(i + 1), hedgeMs);
      tryModel(models[i], i === 0 ? think : "", image, key, ctrls[i]).then((res) => {
        if (done) return;
        if (res.ok) return finish(Object.assign({}, res, { model: models[i], idx: i }));
        last = res;
        failed++;
        start(i + 1);
        if (failed === models.length) finish({ failed: true, last });
      });
    };
    start(0);
  });
}

export async function onRequestPost({ request, env }) {
  const t0 = Date.now();
  const key = env.GEMINI_API_KEY;
  if (!key) return json({ error: "GEMINI_API_KEY सेट नाही." }, 500);

  const models = [
    env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
    env.GEMINI_FALLBACK_MODEL2 || "gemini-flash-latest",
  ].map((m) => String(m).trim()).filter((m, i, a) => m && a.indexOf(m) === i);

  let body;
  try { body = await request.json(); } catch { return json({ error: "चुकीची विनंती" }, 400); }

  // फक्त दुकान मालकासाठी
  const bad = await checkOwner(request, env, body.password);
  if (bad) return json({ error: bad.error }, bad.status);

  const image = String(body.image || "");
  if (!image || image.length > 4000000) return json({ error: "फोटो नाही किंवा खूप मोठा आहे." }, 400);

  const think = String(env.THINK || "").trim();
  const hedgeMs = parseInt(env.HEDGE_MS || "2500", 10) || 2500;

  const res = await race(models, think, image, key, hedgeMs);

  if (res.failed) {
    const l = res.last || {};
    const msg = l.status === 429
      ? "आजची मोफत मर्यादा संपली. थोड्या वेळाने प्रयत्न करा."
      : "स्कॅन झाले नाही (" + (l.status || "नेटवर्क") + ")" + (l.detail ? ": " + String(l.detail).slice(0, 200) : "") + ".";
    return json({ error: msg, detail: l.detail || "" }, 502);
  }

  const d = res.data || {};
  return json({
    name: String(d.name || "").trim(),
    company: String(d.company || "").trim(),
    salt: String(d.salt || "").trim(),
    ms: { total: Date.now() - t0, model: res.model, backup: res.idx > 0 },
  });
}
