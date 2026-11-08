import { RX } from "../../match.js";
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
  return (isRx(d) ? "🔒 (डॉक्टरांच्या चिठ्ठीवरच मिळते)\n" : "") + "💊 *" + d.n + "*\n" + d.s + (d.m > 0 ? "\nMRP: " + rs(d.m) : "") + "\n✅ आमचा दर: *" + rs(d.p) + "*" + (d.m > 0 ? "  (बचत " + rs(d.m - d.p) + ")" : "");
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

// फोटो वाचणे /api/scan कडून (फक्त वाचन). यादीशी जुळवणी इथे साधी आणि निश्चित: AI ला यादी देत नाही,
// त्यामुळे चुकीचे औषध/दर जुळण्याचा धोका नाही.
async function readItems(image) {
  const r = await fetch(ORIGIN + "/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: image.data, raw: true }),
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j.raw) ? j.raw : [];
}

const isRx = (d) => RX.test((d.n + " " + d.s).toLowerCase());

function pick(meds, it) {
  const f = findByText(meds.filter((d) => !d.o), it.name || "");
  if (!f.length) return null;
  const nm = norm(it.name);
  return f.find((d) => norm(d.n) === nm) || (f.length === 1 ? f[0] : null);
}

async function handle(msg, meds) {
  const to = msg.from;
  if (msg.type === "text") {
    const q = msg.text.body.trim();
    if (/^(hi|hello|hii|hey|नमस्कार|नमस्ते|menu|मदत|help)\b/i.test(q) || q.length < 2) return send(to, HELP);
    const f = findByText(meds.filter((d) => !d.o), q);
    if (!f.length) return send(to, "माफ करा, \"" + q + "\" आमच्या यादीत सापडले नाही. औषधाचा फोटो पाठवा किंवा दुकानात विचारा." + FOOT);
    return send(to, f.map(line).join("\n\n") + FOOT);
  }
  if (msg.type === "image") {
    await send(to, "⏳ फोटो वाचत आहे, थोडा वेळ थांबा…");
    const image = await readImage(msg.image.id);
    if (image.data.length > 4000000) return send(to, "फोटो खूप मोठा आहे. थोडा लहान/जवळून फोटो पाठवा." + FOOT);
    const items = await readItems(image);
    if (items === null) return send(to, "फोटो वाचता आला नाही. थोड्या वेळाने पुन्हा पाठवा किंवा औषधाचे नाव लिहा." + FOOT);
    if (!items.length) return send(to, "औषध ओळखता आले नाही. स्पष्ट फोटो पाठवा किंवा नाव लिहा." + FOOT);
    let tot = 0, mrp = 0, n = 0, out = [];
    items.slice(0, 15).forEach((it, k) => {
      const d = pick(meds, it);
      let t = (k + 1) + ". *" + it.name + "*";
      if (it.salt) t += "\n" + (it.saltPrinted ? "" : "अंदाजे घटक: ") + it.salt;
      if (it.use) t += "\nउपयोग: " + it.use;
      if (d) {
        n++; tot += d.p; mrp += d.m > 0 ? d.m : d.p;
        t += (d.m > 0 ? "\nMRP: " + rs(d.m) : "") + "\n✅ आमचा दर: *" + rs(d.p) + "*";
        if (isRx(d)) t += "\n🔒 हे औषध फक्त डॉक्टरांच्या चिठ्ठीवर मिळते.";
      } else t += "\n❓ आमच्या यादीत सापडले नाही, दुकानात विचारा.";
      out.push(t);
    });
    let text = out.join("\n\n");
    if (n > 1) text += "\n\n🧾 एकूण (" + n + " औषधे): *" + rs(tot) + "*  (MRP " + rs(mrp) + ", बचत " + rs(mrp - tot) + ")";
    text += "\n\n⚠️ औषध घेण्यापूर्वी डॉक्टर किंवा फार्मासिस्टकडून खात्री करा. दर बदलू शकतात.";
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
  const raw = await req.text();
  // Meta ची सही तपासणे (WHATSAPP_APP_SECRET सेट असेल तर): बनावट संदेशांनी खर्च/मर्यादा संपवू नये
  const secret = env("WHATSAPP_APP_SECRET");
  if (secret) {
    const sig = (req.headers.get("x-hub-signature-256") || "").replace("sha256=", "");
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)));
    const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex.length !== sig.length || hex !== sig) return new Response("forbidden", { status: 403 });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }
  context.waitUntil(processBody(body));
  return new Response("ok", { status: 200 });
}
