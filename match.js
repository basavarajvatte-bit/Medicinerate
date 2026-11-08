// स्कॅनमधील औषध आणि आपली यादी जुळवणे. सर्व्हर (functions/api/scan.js) आणि ग्राहकाचा फोन (order.js) दोघेही हीच फाईल वापरतात.
// ---------- मिलवणी (matching) : AI नाही, आपला कोड करतो ----------
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const compact = (s) => norm(s).replace(/ /g, "");

// CPU वाचवण्यासाठी: एकदा काढलेले grams लक्षात ठेवायचे (Cloudflare मोफत प्लॅनची CPU मर्यादा)
const GC = new Map();
function grams(s) {
  const key = String(s || "");
  const hit = GC.get(key);
  if (hit) return hit;
  const g = gramsRaw(key);
  if (GC.size > 30000) GC.clear();
  GC.set(key, g);
  return g;
}
function gramsRaw(s) {
  const c = compact(s);
  const g = new Map();
  if (c.length < 3) { if (c) g.set(c, 1); return g; }
  for (let i = 0; i <= c.length - 3; i++) {
    const t = c.slice(i, i + 3);
    g.set(t, (g.get(t) || 0) + 1);
  }
  return g;
}
const GS = new WeakMap();
const gsum = (g) => { let n = GS.get(g); if (n === undefined) { n = 0; g.forEach((v) => (n += v)); GS.set(g, n); } return n; };
function dice(a, b) {
  const A = grams(a), B = grams(b);
  const sa = gsum(A), sb = gsum(B);
  let inter = 0;
  if (!sa || !sb) return 0;
  if (2 * Math.min(sa, sb) / (sa + sb) < 0.5) return 0;   // लांबी खूप वेगळी: जुळणे शक्य नाही
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

let LAST_TEXT = null, LAST_LIST = null;
export function parseList(text) {
  if (text === LAST_TEXT && LAST_LIST) return LAST_LIST;
  const out = parseListRaw(text);
  LAST_TEXT = text; LAST_LIST = out;
  return out;
}
function parseListRaw(text) {
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
    out.push({ idx, n, s, nn: nums(n + " " + s), sw: words(s), f: formOf(n + " " + s), r: relOf(n + " " + s), b: brandOf(n), fw: firstWord(n), dn: nums(n) });
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
  const itBrand = brandOf(it.name), a = firstWord(it.name), inNum = nums(it.name);
  for (const d of meds) {
    if (!unknown && d.f !== itForm) continue;             // इंजेक्शन ≠ गोळी
    if (!numsCompatible(itNums, d.nn)) continue;          // Dolo 650 ≠ Dolo 500
    let nameSim = dice(itBrand, d.b) - (unknown && d.f ? 0.01 : 0);
    // Evion + 400mg = Evion 400 : पहिले नाव आणि ताकद जुळली तर तेच औषध
    const dNum = d.dn;
    const nameNumsOk = !inNum.size || !dNum.size || numsCompatible(inNum, dNum);
    if (a.length >= 4 && a === d.fw && itNums.size && d.nn.size && nameNumsOk) nameSim = 1;
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


// AI ने वाचलेली औषधे + आपली यादी = ग्राहकाला दाखवायच्या ओळी
// ask.second(names) आणि ask.uses(salts) : दुसऱ्या AI ला विचारण्यासाठी
export async function finishItems(rawItems, meds, ask) {
  const askUse = [], askSalt = [];
  const items = rawItems.map((it) => {
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
    if (!known && guess) askSalt.push({ row, it });
    if (known && guess && m.d.s) askUse.push(row);
    return row;
  });
  if (askSalt.length) {
    const ans = await ask.second(askSalt.map((x) => x.it.name + (x.it.form ? " (" + x.it.form + ")" : "")));
    askSalt.forEach((x, i) => {
      const a = ans[i] || {};
      // दोन्ही AI चे घटक जुळले तरच ग्राहकाला दाखवायचे
      const s1 = String(x.it.salt || "").trim(), s2 = String(a.salt || "").trim();
      if (!s1 || jacc(words(x.it.salt), words(a.salt)) < 0.5) {
        // AI एकमत नाही: तरी अंदाजे घटक दाखवायचे, खात्रीची सूचना देऊन
        const g = s1 ? saltText(x.it.salt, x.it.strength, false) : s2 ? saltText(a.salt, "", false) : "";
        if (g) {
          x.row.salt = "अंदाजे घटक: " + g + " (दुकानात खात्री करा)";
          x.row.use = fixMr((s1 ? x.it.use : a.use) || x.it.use || a.use);
        }
        return;
      }
      {
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
    const uses = await ask.uses(askUse.map((r) => r.salt));
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
  return items;
}

// डॉक्टरांच्या चिठ्ठीवरच मिळणारी औषधे. order.js मध्येही हीच यादी आहे — दोन्ही ठिकाणी सारखी ठेवा.
export const RX = /tramadol|tapentadol|codeine|morphine|fentanyl|buprenorphine|alprazolam|clonazepam|lorazepam|diazepam|etizolam|zolpidem|nitrazepam|clobazam|pregabalin|gabapentin|sumatriptan|rizatriptan|naratriptan|zolmitriptan|ergotamine|levothyroxine|thyroxine|carbimazole|methimazole|insulin|warfarin|acenocoumarol|apixaban|rivaroxaban|dabigatran|enoxaparin|heparin|clopidogrel|ticagrelor|prasugrel|lithium|haloperidol|olanzapine|quetiapine|risperidone|aripiprazole|clozapine|sertraline|escitalopram|fluoxetine|paroxetine|venlafaxine|duloxetine|mirtazapine|amitriptyline|nortriptyline|levetiracetam|lamotrigine|oxcarbazepine|carbamazepine|valpro|phenytoin|phenobarbit|topiramate|lacosamide|methotrexate|carboplatin|cisplatin|oxaliplatin|docetaxel|paclitaxel|doxorubicin|epirubicin|gemcitabine|pemetrexed|capecitabine|etoposide|irinotecan|cyclophosphamide|tamoxifen|anastrozole|letrozole|exemestane|bicalutamide|enzalutamide|abiraterone|apalutamide|gefitinib|erlotinib|afatinib|osimertinib|lenvatinib|palbociclib|ribociclib|abemaciclib|nivolumab|pembrolizumab|trastuzumab|bevacizumab|leuprolide|goserelin|degarelix|fulvestrant|megestrol|cabergoline|misoprostol|mifepristone|methylergometrine|isotretinoin|prednisolone|dexamethasone|methylprednisolone|hydrocortisone|linezolid|meropenem|imipenem|piperacillin|colistin|vancomycin|teicoplanin|ceftriaxone|cefoperazone|cefixime|cefpodoxime|cefuroxime|amoxy|azithro|clarithro|ciproflox|oflox|doxycycline|metronidazole|tinidazole|ornidazole|amikacin|gentamicin|tadalafil|sildenafil|finasteride|dutasteride|silodosin|alfuzosin|torsemide|torasemide|furosemide|spironolactone|ivabradine|sacubitril|ranolazine|nicorandil|amiodarone|digoxin/;
