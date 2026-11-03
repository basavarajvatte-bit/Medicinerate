const json = (obj, status = 200) =>
  Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

// ---------- मिलवणी (matching) : AI नाही, आपला कोड करतो ----------
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const compact = (s) => norm(s).replace(/ /g, "");

function grams(s) {
  const c = compact(s);
  const g = new Map();
  if (c.length < 3) { if (c) g.set(c, 1); return g; }
  for (let i = 0; i <= c.length - 3; i++) {
    const t = c.slice(i, i + 3);
    g.set(t, (g.get(t) || 0) + 1);
  }
  return g;
}
function dice(a, b) {
  const A = grams(a), B = grams(b);
  let sa = 0, sb = 0, inter = 0;
  A.forEach((v) => (sa += v));
  B.forEach((v) => (sb += v));
  if (!sa || !sb) return 0;
  A.forEach((v, k) => { if (B.has(k)) inter += Math.min(v, B.get(k)); });
  return (2 * inter) / (sa + sb);
}
const nums = (s) => new Set(String(s || "").match(/\d+/g) || []);
function numsCompatible(a, b) {
  if (!a.size || !b.size) return true;
  for (const x of a) if (b.has(x)) return true;
  return false;
}
const words = (s) => new Set(norm(s).split(" ").filter((w) => w.length >= 4 && /^[a-z]+$/.test(w)));
function jacc(a, b) {
  if (!a.size || !b.size) return 0;
  let i = 0;
  a.forEach((x) => { if (b.has(x)) i++; });
  return i / (a.size + b.size - i);
}

// औषधाचा प्रकार: गोळी/कॅप्सूल "" मानतो. प्रकार वेगळा असेल तर पर्याय दाखवायचा नाही.
function formOf(t) {
  const x = " " + norm(t) + " ";
  if (/ (inj|injection|vial|amp|ampoule) /.test(x)) return "inj";
  if (/ (syp|syr|syrup|susp|suspension|liquid) /.test(x)) return "liq";
  if (/ (drop|drops) /.test(x)) return "drop";
  if (/ (cream|oint|ointment|gel|lotion) /.test(x)) return "top";
  return "";
}
// नाव तुलना करताना Tab, Inj असे शब्द काढायचे
const brandOf = (t) => norm(t).replace(/\b(tab|tabs|tablet|tablets|cap|caps|capsule|capsules|inj|injection|syp|syrup)\b/g, " ");
const fixMr = (t) => String(t || "").replace(/अ\u200d?ॅ/g, "ॲ");
function saltText(salt, str, printed) {
  const s = String(salt || "").trim(), t = String(str || "").trim();
  if (!s) return "घटक फोटोत दिसले नाहीत. दुकानात विचारा.";
  const need = [...nums(t)];
  const have = nums(s);
  const full = !t ? s + " (ताकद दिसली नाही)" : need.length && need.every((n) => have.has(n)) ? s : s + " " + t;
  return printed === false ? full + " (अंदाजे, दुकानात खात्री करा)" : full;
}

function parseList(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const k = line.indexOf(": ");
    if (k < 1) continue;
    const idx = parseInt(line.slice(0, k), 10);
    if (!Number.isFinite(idx)) continue;
    const rest = line.slice(k + 2);
    const o = rest.lastIndexOf("("), c = rest.lastIndexOf(")");
    const n = o > 0 ? rest.slice(0, o).trim() : rest.trim();
    const s = o > 0 && c > o ? rest.slice(o + 1, c).trim() : "";
    out.push({ idx, n, s, nn: nums(n + " " + s), sw: words(s), f: formOf(n + " " + s) });
  }
  return out;
}

function bestMatch(it, meds) {
  const itNums = nums(it.name + " " + it.salt + " " + it.strength);
  const itForm = formOf(it.name + " " + it.form);
  const unknown = /unknown/i.test(String(it.form || "")) && !itForm;  // परचीवर प्रकार लिहिलेला नाही
  const itWords = words(it.salt);
  let best = null, bestScore = 0, by = "name";
  for (const d of meds) {
    if (!unknown && d.f !== itForm) continue;             // इंजेक्शन ≠ गोळी
    const nameSim = dice(brandOf(it.name), brandOf(d.n)) - (unknown && d.f ? 0.01 : 0);
    if (!numsCompatible(itNums, d.nn)) continue;          // Dolo 650 ≠ Dolo 500
    // घटक फोटोत छापलेला नसेल तर त्यावरून पर्याय दाखवायचा नाही
    const saltSim = it.saltPrinted === false || (unknown && d.f) ? 0 : jacc(itWords, d.sw);
    const score = Math.max(nameSim, saltSim * 0.95);
    if (score > bestScore) { bestScore = score; best = d; by = nameSim >= saltSim * 0.95 ? "name" : "salt"; }
  }
  return best && bestScore >= 0.72 ? { idx: best.idx, by, d: best } : { idx: null, by: "", d: null };
}

// ---------- AI : फक्त फोटो वाचतो ----------
const PROMPT =
  "The image shows a medicine strip/box or a doctor's prescription. Read every medicine in it.\n" +
  "For each medicine return:\n" +
  "- name: the medicine name exactly as written (keep English letters).\n" +
  "- salt: the complete composition with every ingredient, names only (keep English letters). " +
  "Combination medicines have many ingredients: list all of them. If the composition is not printed in the image, " +
  "write it only if you are sure of every ingredient of this exact brand, otherwise return an empty string.\n" +
  "- saltPrinted: true if the composition or generic name is printed or written in the image, false if it came from your own knowledge.\n" +
  "- strength: the strength of every ingredient exactly as printed, e.g. '40mg', '500mg + 125mg', '4mg/2ml'. " +
  "Look carefully on the whole strip, box or prescription. A number that is part of the medicine name, like 'PSAM 40', counts as printed: " +
  "return it with its unit if the unit is visible, otherwise return only the number. If no strength is printed anywhere, return an empty string. Never guess.\n" +
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
  const image = String(body.image || "");
  if (!image || image.length > 4000000) return json({ error: "फोटो नाही किंवा खूप मोठा आहे." }, 400);
  const meds = parseList(String(body.list || "").slice(0, 400000));

  const think = String(env.THINK || "").trim();
  const hedgeMs = parseInt(env.HEDGE_MS || "2500", 10) || 2500;

  const res = await race(models, think, image, key, hedgeMs);
  const tAi = Date.now() - t0;

  if (res.failed) {
    const l = res.last || {};
    const msg = l.status === 429
      ? "आजची मोफत मर्यादा संपली. थोड्या वेळाने प्रयत्न करा."
      : "स्कॅन झाले नाही (" + (l.status || "नेटवर्क") + ")" + (l.detail ? ": " + String(l.detail).slice(0, 200) : "") + ".";
    return json({ error: msg, detail: l.detail || "" }, 502);
  }

  const items = res.items.map((it) => {
    const m = bestMatch(it, meds);
    const known = m.by === "name" && m.d;   // नावाने जुळले: आपल्या यादीतील नाव आणि घटक खरे मानायचे
    return {
      name: known ? m.d.n : String(it.name || ""),
      salt: known && m.d.s ? m.d.s : saltText(it.salt, it.strength, it.saltPrinted),
      use: fixMr(it.use), idx: m.idx, by: m.by,
    };
  });
  return json({
    items,
    ms: { ai: tAi, total: Date.now() - t0, model: res.model, backup: res.idx > 0, think: res.idx === 0 ? (think || "default") : "n/a" },
  });
}
