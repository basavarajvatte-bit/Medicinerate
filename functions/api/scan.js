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
// घटकांची वेगवेगळी स्पेलिंग एकच मानायची: Amoxycillin = Amoxicillin, Clavulanate = Clavulanic acid
const SKIP = new Set(["sodium", "potassium", "hydrochloride", "sulphate", "sulfate", "acid", "tablet", "tablets", "capsule", "capsules", "besilate", "besylate", "maleate", "mesylate", "mesilate", "fumarate", "hyclate", "bitartrate", "trihydrate", "dihydrate", "monohydrate", "prolonged", "release", "extended", "sustained", "retard", "controlled"]);
const canon = (w) => ({ amoxycillin: "amoxicillin", clavulanate: "clavulanic", clavulanic: "clavulanic", acetaminophen: "paracetamol" }[w] || w);
const words = (s) => new Set(norm(s).split(" ").filter((w) => w.length >= 4 && /^[a-z]+$/.test(w) && !SKIP.has(w)).map(canon));
const sameSet = (a, b) => a.size > 0 && a.size === b.size && [...a].every((x) => b.has(x));
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
// हळूहळू विरघळणारी गोळी (SR/ER/XL/PR/CR/OD/LA/TR/Retard) साध्या गोळीपेक्षा वेगळी मानायची
const relOf = (t) => / (sr|er|xl|xr|pr|cr|od|la|tr|retard|prolonged|extended|sustained|controlled) /.test(" " + norm(t) + " ") ? "r" : "";
// नाव तुलना करताना Tab, Inj असे शब्द काढायचे
const brandOf = (t) => norm(t).replace(/\b(tab|tabs|tablet|tablets|cap|caps|capsule|capsules|inj|injection|syp|syrup)\b/g, " ");
const firstWord = (t) => brandOf(t).trim().split(/\s+/)[0] || "";
const fixMr = (t) => String(t || "").replace(/अ\u200d?ॅ/g, "ॲ");
function saltText(salt, str, printed) {
  const s = String(salt || "").trim(), t = String(str || "").trim();
  if (!s) return "";
  const need = [...nums(t)];
  const have = nums(s);
  if (!t) return printed === false ? s : s + " (ताकद दिसली नाही)";
  return need.length && need.every((n) => have.has(n)) ? s : s + " " + t;
}

function parseList(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const k = line.indexOf(": ");
    if (k < 1) continue;
    const idx = parseInt(line.slice(0, k), 10);
    if (!Number.isFinite(idx)) continue;
    const rest = line.slice(k + 2);
    // शेवटच्या ) ची जोडी शोधायची, म्हणजे Paracetamol (500mg) असा घटकही नीट वाचला जाईल
    const c = rest.lastIndexOf(")");
    let o = -1;
    for (let i = c - 1, depth = 1; i >= 0 && c > 0; i--) {
      if (rest[i] === ")") depth++;
      else if (rest[i] === "(" && --depth === 0) { o = i; break; }
    }
    const n = o > 0 ? rest.slice(0, o).trim() : rest.trim();
    const s = o > 0 && c > o ? rest.slice(o + 1, c).trim() : "";
    out.push({ idx, n, s, nn: nums(n + " " + s), sw: words(s), f: formOf(n + " " + s), r: relOf(n + " " + s) });
  }
  return out;
}

function bestMatch(it, meds) {
  const itNums = nums(it.name + " " + it.salt + " " + it.strength);
  const itForm = formOf(it.name + " " + it.form);
  const unknown = /unknown/i.test(String(it.form || "")) && !itForm;  // परचीवर प्रकार लिहिलेला नाही
  const itWords = words(it.salt);
  const itRel = relOf(it.name + " " + it.salt + " " + (it.strength || "") + " " + (it.form || ""));
  let best = null, bestScore = 0, by = "name";
  for (const d of meds) {
    if (!unknown && d.f !== itForm) continue;             // इंजेक्शन ≠ गोळी
    let nameSim = dice(brandOf(it.name), brandOf(d.n)) - (unknown && d.f ? 0.01 : 0);
    if (!numsCompatible(itNums, d.nn)) continue;          // Dolo 650 ≠ Dolo 500
    // Evion + 400mg = Evion 400 : पहिले नाव आणि ताकद जुळली तर तेच औषध
    const a = firstWord(it.name), inNum = nums(it.name), dNum = nums(d.n);
    const nameNumsOk = !inNum.size || !dNum.size || numsCompatible(inNum, dNum);
    if (a.length >= 4 && a === firstWord(d.n) && itNums.size && d.nn.size && nameNumsOk) nameSim = 1;
    // घटक फोटोत छापलेला नसेल तर त्यावरून पर्याय दाखवायचा नाही
    const saltSim = it.saltPrinted === false || (unknown && d.f) || itRel !== d.r ? 0 : jacc(itWords, d.sw);
    const score = Math.max(nameSim, saltSim * 0.95);
    if (score > bestScore) { bestScore = score; best = d; by = nameSim >= saltSim * 0.95 ? "name" : "salt"; }
  }
  return best && bestScore >= 0.72 ? { idx: best.idx, by, d: best } : { idx: null, by: "", d: null };
}

// यादीतील त्याच घटकाची, त्याच ताकदीची आणि त्याच प्रकारची सर्व औषधे
function sameSalt(sw, nn, form, unknown, meds, rel) {
  return meds.filter((d) => {
    if ((rel || "") !== d.r) return false;   // SR ≠ साधी गोळी
    if (!unknown && d.f !== form) return false;
    if (unknown && d.f) return false;
    return sameSet(sw, d.sw) && numsCompatible(nn, d.nn);
  }).map((d) => ({ i: d.idx, st: "same" }));
}
const isUnknown = (it) => /unknown/i.test(String(it.form || "")) && !formOf(it.name + " " + it.form);
function saltOptions(it, meds) {
  return sameSalt(words(it.salt), nums(it.name + " " + it.salt + " " + it.strength),
    formOf(it.name + " " + it.form), isUnknown(it), meds, relOf(it.name + " " + it.salt + " " + (it.strength || "") + " " + (it.form || "")));
}
// नावातच घटक असेल (Paracetamol 500) तर तो घटक छापलेलाच आहे
const nameIsSalt = (it) => { const a = words(it.salt), b = words(it.name); return a.size > 0 && [...a].every((x) => b.has(x)); };

// ---------- AI : फक्त फोटो वाचतो ----------
const PROMPT =
  "The image shows a medicine strip/box or a doctor's prescription. Read every medicine in it.\n" +
  "For each medicine return:\n" +
  "- name: the medicine name exactly as written (keep English letters).\n" +
  "- salt: the complete composition with every ingredient, names only (keep English letters). " +
  "Combination medicines have many ingredients: list all of them. Doctors usually write only the brand name, so when the composition is not printed, " +
  "give the known composition of this brand from your own knowledge. Return an empty string only if you do not recognise the brand at all.\n" +
  "Keep the salt form if printed (e.g. Metoprolol Succinate, Metoprolol Tartrate). If the name or label shows a slow-release type " +
  "(SR, ER, XL, XR, PR, CR, OD, LA, TR, Retard), add it at the end of salt, e.g. 'Metformin SR'.\n" +
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
  const timer = setTimeout(() => ctrl.abort(), 7000);
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

  const askUse = [], askSalt = [];
  const items = res.items.map((it) => {
    if (it.saltPrinted === false && nameIsSalt(it)) it.saltPrinted = true;
    const m = bestMatch(it, meds);
    const known = m.by === "name" && m.d;   // नावाने जुळले: आपल्या यादीतील नाव आणि घटक खरे मानायचे
    const guess = it.saltPrinted === false; // घटक फोटोत नाहीत: AI चा अंदाज ग्राहकाला दाखवायचा नाही
    const row = {
      name: known ? m.d.n : String(it.name || ""),
      salt: known && m.d.s ? m.d.s : guess ? "घटकांची माहिती दुकानात मिळेल." : saltText(it.salt, it.strength, it.saltPrinted),
      use: guess ? "" : fixMr(it.use), idx: m.idx, by: m.by, alts: [], exact: known ? m.d.idx : null,
    };
    Object.defineProperty(row, "_sw", { value: words(it.salt), enumerable: false });
    Object.defineProperty(row, "_nn", { value: nums(it.name + " " + it.salt + " " + (it.strength || "")), enumerable: false });
    if (known) row.alts = m.d.s ? sameSalt(m.d.sw, m.d.nn, m.d.f, false, meds, m.d.r) : [{ i: m.d.idx, st: "same" }];
    else if (!guess) row.alts = saltOptions(it, meds);
    if (known && !row.alts.some((a) => a.i === m.d.idx)) row.alts.push({ i: m.d.idx, st: "same" });
    if (!known) row.idx = row.alts.length ? row.alts[0].i : null;
    if (!known && guess && String(it.salt || "").trim()) askSalt.push({ row, it });
    if (known && guess && m.d.s) askUse.push(row);
    return row;
  });
  if (askSalt.length) {
    const second = models[1] || models[0];
    const ans = await secondOpinion(askSalt.map((x) => x.it.name + (x.it.form ? " (" + x.it.form + ")" : "")), second, key);
    askSalt.forEach((x, i) => {
      const a = ans[i] || {};
      // दोन्ही AI चे घटक जुळले तरच ग्राहकाला दाखवायचे
      if (jacc(words(x.it.salt), words(a.salt)) >= 0.5) {
        x.row.salt = saltText(x.it.salt, x.it.strength, false);
        x.row.use = fixMr(a.use || x.it.use);
        // दोन्ही AI चे सर्व घटक जुळले तरच यादीतील औषध पर्याय म्हणून दाखवायचे
        if (sameSet(words(x.it.salt), words(a.salt))) {
          x.row.alts = saltOptions(x.it, meds);
          if (x.row.alts.length) { x.row.idx = x.row.alts[0].i; x.row.by = "salt"; }
        }
      }
    });
  }
  if (askUse.length) {
    const uses = await usesFor(askUse.map((r) => r.salt), models[0], key);
    askUse.forEach((r, i) => { r.use = fixMr(uses[i]); });
  }
  // त्याच घटकाचे पण वेगळ्या ताकदीचे औषध: फक्त माहितीसाठी दाखवायचे (निवडता येणार नाही)
  for (const r of items) {
    if (r.alts.length || !r._sw || !r._sw.size) continue;
    const FORMW = new Set(["succinate", "tartrate"]);
    const same = meds.filter((d) => [...r._sw].every((x) => d.sw.has(x)) && [...d.sw].every((x) => r._sw.has(x) || FORMW.has(x)));
    const st = [...new Set(same.map((d) => ((String(d.s).match(/(\d+(?:\.\d+)?)\s*mg/i) || [])[1])).filter(Boolean))]
      .sort((a, b) => parseFloat(a) - parseFloat(b));
    const sameMg = same.filter((d) => r._nn && r._nn.size && d.nn.size && numsCompatible(r._nn, d.nn));
    if (sameMg.length) r.otherType = sameMg.map((d) => d.idx);
    else if (st.length) r.otherStr = st.map((x) => x + "mg");
  }
  return json({
    items,
    ms: { ai: tAi, total: Date.now() - t0, model: res.model, backup: res.idx > 0, think: res.idx === 0 ? (think || "default") : "n/a" },
  });
}
