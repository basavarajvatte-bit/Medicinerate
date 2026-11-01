const G = "https://graph.facebook.com/v21.0/";
let E = {};
let ORIGIN = "";
const env = (k) => E[k];

const SHOP = "तुळजाभवानी मेडिकल";
const FOOT = "\n\n📍 नवीन बसस्टँड समोर, तुळजापूर\n📞 9673643799";
const HELP =
  "🙏 नमस्कार! " + SHOP + " मध्ये आपले स्वागत आहे.\n\n" +
  "📷 औषधाचा किंवा डॉक्टरांच्या चिठ्ठीचा फोटो पाठवा, किंवा औषधाचे नाव लिहा (उदा. Dolo 650).\n" +
  "आम्ही लगेच आमचा दर सांगू." + FOOT;

async function send(to, body) {
  await fetch(G + env("WHATSAPP_PHONE_ID") + "/messages", {
    method: "POST",
    headers: { Authorization: "Bearer " + env("WHATSAPP_TOKEN"), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
}

async function loadMeds() {
  const r = await fetch(ORIGIN + "/api/list", { cache: "no-store" });
  const j = await r.json();
  return Array.isArray(j.meds) ? j.meds : [];
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f ]/g, " ").replace(/\s+/g, " ").trim();
const rs = (x) => "₹" + Math.round(x * 100) / 100;

function findByText(meds, q) {
  const words = norm(q).split(" ").filter((w) => w.length > 1);
  if (!words.length) return [];
  return meds
    .map((d) => {
      const hay = norm(d.n + " " + d.s);
      const hit = words.filter((w) => hay.includes(w)).length;
      return { d, score: hit / words.length };
    })
    .filter((o) => o.score >= 0.99)
    .slice(0, 4)
    .map((o) => o.d);
}

function line(d) {
  return "💊 *" + d.n + "*\n" + d.s + "\nMRP: " + rs(d.m) + "\n✅ आमचा दर: *" + rs(d.p) + "*  (बचत " + rs(d.m - d.p) + ")";
}

async function readImage(mediaId) {
  const h = { Authorization: "Bearer " + env("WHATSAPP_TOKEN") };
  const meta = await (await fetch(G + mediaId, { headers: h })).json();
  const img = await fetch(meta.url, { headers: h });
  const mime = img.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await img.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const data = btoa(bin);
  return { mime, data };
}

async function askGemini(image, meds) {
  const list = meds.map((d, i) => i + ": " + d.n + " (" + d.s + ")").join("\n").slice(0, 12000);
  const prompt =
    "Image me dawa ka strip/box ya doctor ki parchi hai. Har dawa padho. " +
    "Har dawa ke liye: name (jo likha hai), salt (composition), use (kis kaam aati hai, Marathi me max 8 shabd), " +
    "idx (neeche LIST ka wo number jo isi dawa ya isi salt ki hai, nahi ho to null). " +
    "Pakka na padh paao to us dawa ko chhod do. Andaza mat lagao.\nLIST:\n" + list;
  const schema = {
    type: "OBJECT",
    properties: { items: { type: "ARRAY", items: { type: "OBJECT",
      properties: { name: { type: "STRING" }, salt: { type: "STRING" }, use: { type: "STRING" }, idx: { type: "INTEGER", nullable: true } },
      required: ["name", "salt", "use"] } } },
    required: ["items"],
  };
  const model = env("GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: image.mime, data: image.data } }, { text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 700, responseMimeType: "application/json", responseSchema: schema },
    }),
  });
  const j = await r.json();
  const t = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  try { return JSON.parse(t).items || []; } catch { return []; }
}

async function handle(msg, meds) {
  const to = msg.from;
  if (msg.type === "text") {
    const q = msg.text.body.trim();
    if (/^(hi|hello|hii|hey|नमस्कार|नमस्ते|menu|मदत|help)\b/i.test(q) || q.length < 2) return send(to, HELP);
    const f = findByText(meds, q);
    if (!f.length) return send(to, "माफ करा, \"" + q + "\" आमच्या यादीत सापडले नाही. औषधाचा फोटो पाठवा किंवा दुकानात विचारा." + FOOT);
    return send(to, f.map(line).join("\n\n") + FOOT);
  }
  if (msg.type === "image") {
    await send(to, "⏳ फोटो वाचत आहे, थोडा वेळ थांबा…");
    const image = await readImage(msg.image.id);
    const items = await askGemini(image, meds);
    if (!items.length) return send(to, "औषध ओळखता आले नाही. स्पष्ट फोटो पाठवा किंवा नाव लिहा." + FOOT);
    let tot = 0, mrp = 0, n = 0, out = [];
    items.forEach((it, k) => {
      const d = it.idx != null ? meds[it.idx] : null;
      let t = (k + 1) + ". *" + it.name + "*\n" + it.salt + "\nउपयोग: " + it.use;
      if (d) { n++; tot += d.p; mrp += d.m; t += "\nMRP: " + rs(d.m) + "\n✅ आमचा दर: *" + rs(d.p) + "*"; }
      else t += "\n❓ आमच्या यादीत नाही, दुकानात विचारा.";
      out.push(t);
    });
    let text = out.join("\n\n");
    if (n > 1) text += "\n\n🧾 एकूण (" + n + " औषधे): *" + rs(tot) + "*  (MRP " + rs(mrp) + ", बचत " + rs(mrp - tot) + ")";
    text += "\n\n⚠️ औषध घेण्यापूर्वी फार्मासिस्टकडून खात्री करा.";
    return send(to, text + FOOT);
  }
  return send(to, HELP);
}

async function processBody(body) {
  try {
    const msgs = (body.entry || []).flatMap((e) => (e.changes || []).flatMap((c) => c.value?.messages || []));
    if (!msgs.length) return;
    const meds = await loadMeds();
    for (const m of msgs) {
      try { await handle(m, meds); } catch (e) { console.error("handle error", e); }
    }
  } catch (e) { console.error(e); }
}

export async function onRequest(context) {
  const req = context.request;
  E = context.env || {};
  ORIGIN = new URL(req.url).origin;
  if (req.method === "GET") {
    const u = new URL(req.url);
    if (u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === env("VERIFY_TOKEN")) {
      return new Response(u.searchParams.get("hub.challenge"), { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("ok");
  let body;
  try { body = await req.json(); } catch { return new Response("ok"); }
  context.waitUntil(processBody(body));
  return new Response("ok", { status: 200 });
}
