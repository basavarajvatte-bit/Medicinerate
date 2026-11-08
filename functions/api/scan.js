const json = (obj, status = 200) =>
  Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

import { parseList, finishItems } from "../../match.js";

// ---------- AI : फक्त फोटो वाचतो ----------
const PROMPT =
  "The image shows a medicine strip/box or a doctor's prescription. Read every medicine in it.\n" +
  "The photo may be rotated, upside down, sideways, tilted, blurry, partly cut or taken at an angle: still read the text in whatever direction it runs. Never refuse because of orientation or quality; give your best reading.\n" +
  "For each medicine return:\n" +
  "- name: the medicine name exactly as written (keep English letters).\n" +
  "- salt: the complete composition with every ingredient, names only (keep English letters). " +
  "Combination medicines have many ingredients: list all of them. Doctors usually write only the brand name, so when the composition is not printed, " +
  "give the known composition of this brand from your own knowledge. Return an empty string only if you do not recognise the brand at all.\n" +
  "Keep the salt form if printed (e.g. Metoprolol Succinate, Metoprolol Tartrate). If the name or label shows a slow-release type " +
  "(SR, ER, XL, XR, PR, CR, OD, LA, TR, Retard), or this brand is known to be a slow-release product even if not written " +
  "(for example Glycomet-GP and Gluconorm-G are prolonged-release), add it at the end of salt, e.g. 'Metformin SR'. " +
  "Also give the salt form the brand uses (e.g. Betaloc = Metoprolol Tartrate, Prolomet XL = Metoprolol Succinate).\n" +
  "- saltPrinted: true if the composition or generic name is printed or written in the image, false if it came from your own knowledge.\n" +
  "- strength: the strength of every ingredient exactly as printed, e.g. '40mg', '500mg + 125mg', '4mg/2ml'. " +
  "Look carefully on the whole strip, box or prescription. A number that is part of the medicine name, like 'PSAM 40', counts as printed: " +
  "return it with its unit if the unit is visible, otherwise return only the number. If it is not printed but you gave the composition from your knowledge, " +
  "give the usual strength of this brand too. Otherwise return an empty string.\n" +
  "- form: one of tablet, capsule, injection, syrup, drops, ointment, other, unknown. Use only what the image shows; if it does not show the form, use unknown.\n" +
  "- use: what it is used for, in simple MARATHI (Devanagari), everyday words of ordinary village and town people, " +
  "NOT medical terms. Maximum 8 words. Examples: diabetes -> 'शुगरची गोळी'; blood pressure -> 'बीपीची गोळी'; " +
  "paracetamol -> 'ताप आणि अंगदुखीची गोळी'; pantoprazole -> 'ॲसिडिटी, पोटातील जळजळीची गोळी'; " +
  "cetirizine -> 'सर्दी, ॲलर्जीची गोळी'; antibiotic -> 'जंतूंचा संसर्ग घालवणारी गोळी (अँटिबायोटिक)'; " +
  "calcium -> 'हाडांसाठी कॅल्शियमची गोळी'. Never use words like hypertension, analgesic, antacid, antihistamine. " +
  "If it is a syrup, ointment, drops or injection, say so (सिरप, मलम, थेंब, इंजेक्शन) instead of 'गोळी'.\n" +
  "If you cannot read a medicine with certainty, skip it. Do not guess.";

const SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          salt: { type: "STRING" },
          saltPrinted: { type: "BOOLEAN" },
          strength: { type: "STRING" },
          form: { type: "STRING" },
          use: { type: "STRING", description: "Simple everyday MARATHI in Devanagari, max 8 words. Never English or Hindi." },
        },
        required: ["name", "salt", "saltPrinted", "strength", "form", "use"],
      },
    },
  },
  required: ["items"],
};

// आपल्या यादीतील घटकावरून मराठी उपयोग (फोटोतील अंदाजावरून नाही)
async function usesFor(salts, model, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text:
          "For each composition below, write what it is used for in simple everyday MARATHI (Devanagari), maximum 8 words, no medical terms. " +
          "If it is an injection, syrup, drops or ointment, say so. Return one string for each line, in the same order.\n" +
          salts.map((x, i) => (i + 1) + ". " + x).join("\n") }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 500, responseMimeType: "application/json",
          responseSchema: { type: "ARRAY", items: { type: "STRING" } } },
      }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const t = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const a = JSON.parse(t);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// दुसरे मत: दुसऱ्या AI ला फक्त नावावरून घटक विचारणे. दोघांचे जुळले तरच दाखवायचे.
async function secondOpinion(list, model, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text:
          "You are an experienced Indian pharmacist. For each Indian medicine brand below, independently give its complete composition (names only, in English) " +
          "and what it is used for in simple everyday MARATHI (Devanagari), maximum 8 words, no medical terms. Say if it is an injection, syrup, drops or ointment. " +
          "Use the brand name, its number and its form. Do not assume a composition just because the name sounds similar to another brand. " +
          "If you are not sure, return an empty salt. Return one object for each line, in the same order.\n" +
          list.map((x, i) => (i + 1) + ". " + x).join("\n") }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 800, responseMimeType: "application/json",
          responseSchema: { type: "ARRAY", items: { type: "OBJECT",
            properties: { salt: { type: "STRING" }, use: { type: "STRING" } }, required: ["salt", "use"] } } },
      }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const t = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const a = JSON.parse(t);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Google ला कॉल ----------
async function callGemini(model, think, image, key, signal) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: PROMPT }] }],
      generationConfig: Object.assign(
        { temperature: 0, maxOutputTokens: 1500, responseMimeType: "application/json", responseSchema: SCHEMA },
        think ? { thinkingConfig: { thinkingLevel: think } } : {}
      ),
    }),
  });
  const data = await r.json().catch(() => ({}));
  return { r, data };
}

// एका मॉडेलचा प्रयत्न: यशस्वी {ok:true, items} किंवा अपयश {fail:true}
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
    return { ok: true, items: Array.isArray(parsed.items) ? parsed.items : [] };
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
  if (!key) return json({ error: "सर्व्हरवर GEMINI_API_KEY सेट केलेला नाही." }, 500);

  const models = [
    env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
    env.GEMINI_FALLBACK_MODEL2 || "gemini-flash-latest",
  ].map((m) => String(m).trim()).filter((m, i, a) => m && a.indexOf(m) === i);

  let body;
  try { body = await request.json(); } catch { return json({ error: "चुकीची विनंती" }, 400); }
  // फोनवरून जुळवणी करताना लागणारे छोटे प्रश्न (फोटो नाही)
  if (body.mode === "second") return json({ out: await secondOpinion((body.names || []).slice(0, 30).map(String), models[1] || models[0], key) });
  if (body.mode === "uses") return json({ out: await usesFor((body.salts || []).slice(0, 30).map(String), models[0], key) });
  const image = String(body.image || "");
  if (!image || image.length > 4000000) return json({ error: "फोटो नाही किंवा खूप मोठा आहे." }, 400);

  const think = String(env.THINK || "").trim();
  const hedgeMs = parseInt(env.HEDGE_MS || "2500", 10) || 2500;

  let res = await race(models, think, image, key, hedgeMs);
  // सगळे मॉडेल अपयशी (मर्यादा सोडून): एकदा पुन्हा पूर्ण प्रयत्न
  if (res.failed && (res.last || {}).status !== 429) res = await race(models, "", image, key, 1500);
  const tAi = Date.now() - t0;

  if (res.failed) {
    const l = res.last || {};
    const msg = l.status === 429
      ? "आजची मोफत मर्यादा संपली. थोड्या वेळाने प्रयत्न करा."
      : "स्कॅन झाले नाही (" + (l.status || "नेटवर्क") + ")" + (l.detail ? ": " + String(l.detail).slice(0, 200) : "") + ".";
    return json({ error: msg, detail: l.detail || "" }, 502);
  }

  // नवीन पद्धत: फक्त AI चे वाचन परत, जुळवणी ग्राहकाच्या फोनवर (सर्व्हरचा CPU वाचतो)
  if (body.raw) return json({ raw: res.items, ms: { ai: tAi, model: res.model, backup: res.idx > 0 } });
  const meds = parseList(String(body.list || "").slice(0, 400000));
  const items = await finishItems(res.items, meds, {
    second: (names) => secondOpinion(names, models[1] || models[0], key),
    uses: (salts) => usesFor(salts, models[0], key),
  });
  return json({
    items,
    ms: { ai: tAi, total: Date.now() - t0, model: res.model, backup: res.idx > 0, think: res.idx === 0 ? (think || "default") : "n/a" },
  });
}
