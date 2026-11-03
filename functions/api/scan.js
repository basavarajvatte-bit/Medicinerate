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
    out.push({ idx, n, s, nn: nums(n + " " + s), sw: words(s) });
  }
  return out;
}

function bestMatch(it, meds) {
  const itNums = nums(it.name + " " + it.salt);
  const itWords = words(it.salt);
  let best = null, bestScore = 0, by = "name";
  for (const d of meds) {
    if (!numsCompatible(itNums, d.nn)) continue;          // Dolo 650 ≠ Dolo 500
    const nameSim = dice(it.name, d.n);
    const saltSim = jacc(itWords, d.sw);
    const score = Math.max(nameSim, saltSim * 0.95);
    if (score > bestScore) { bestScore = score; best = d; by = nameSim >= saltSim * 0.95 ? "name" : "salt"; }
  }
  return best && bestScore >= 0.72 ? { idx: best.idx, by } : { idx: null, by: "" };
}

// ---------- AI : फक्त फोटो वाचतो ----------
const PROMPT =
  "The image shows a medicine strip/box or a doctor's prescription. Read every medicine in it.\n" +
  "For each medicine return:\n" +
  "- name: the medicine name exactly as written (keep English letters).\n" +
  "- salt: the composition/salt (keep English letters).\n" +
  "- use: what it is used for, in simple MARATHI (Devanagari), everyday words of ordinary village and town people, " +
  "NOT medical terms. Maximum 8 words. Examples: diabetes -> 'शुगरची गोळी'; blood pressure -> 'बीपीची गोळी'; " +
  "paracetamol -> 'ताप आणि अंगदुखीची गोळी'; pantoprazole -> 'अॅसिडिटी, पोटातील जळजळीची गोळी'; " +
  "cetirizine -> 'सर्दी, अॅलर्जीची गोळी'; antibiotic -> 'जंतूंचा संसर्ग घालवणारी गोळी (अँटिबायोटिक)'; " +
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
          use: { type: "STRING", description: "Simple everyday MARATHI in Devanagari, max 8 words. Never English or Hindi." },
        },
        required: ["name", "salt", "use"],
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
    return { name: String(it.name || ""), salt: String(it.salt || ""), use: String(it.use || ""), idx: m.idx, by: m.by };
  });
  return json({
    items,
    ms: { ai: tAi, total: Date.now() - t0, model: res.model, backup: res.idx > 0, think: res.idx === 0 ? (think || "default") : "n/a" },
  });
}
