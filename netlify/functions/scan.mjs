export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "फक्त POST चालते" }, { status: 405 });
  const key = Netlify.env.get("GEMINI_API_KEY");
  if (!key) return Response.json({ error: "सर्व्हरवर GEMINI_API_KEY सेट केलेला नाही." }, { status: 500 });
  const model = Netlify.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "चुकीची विनंती" }, { status: 400 }); }
  const image = String(body.image || "");
  const list = String(body.list || "").slice(0, 8000);
  if (!image || image.length > 4000000) return Response.json({ error: "फोटो नाही किंवा खूप मोठा आहे." }, { status: 400 });

  const prompt =
    "The image shows a medicine strip/box or a doctor's prescription. Read every medicine in it.\n" +
    "For each medicine return:\n" +
    "- name: the medicine name exactly as written (keep English letters).\n" +
    "- salt: the composition/salt (keep English letters).\n" +
    "- use: what it is used for, written in simple MARATHI (Devanagari) in the everyday words that ordinary village and town people use, " +
    "NOT medical terms. Maximum 10 words. Say it like a neighbour would explain it. Examples: " +
    "diabetes medicine -> 'शुगरची गोळी'; blood pressure medicine -> 'बीपीची गोळी'; paracetamol -> 'ताप आणि अंगदुखीची गोळी'; " +
    "pantoprazole -> 'अॅसिडिटी, पोटातील जळजळीची गोळी'; cetirizine -> 'सर्दी, अॅलर्जीची गोळी'; " +
    "antibiotic -> 'जंतूंचा संसर्ग घालवणारी गोळी (अँटिबायोटिक)'; calcium -> 'हाडांसाठी कॅल्शियमची गोळी'. " +
    "Never use words like hypertension, diabetes mellitus, analgesic, antacid, antihistamine. " +
    "If it is a syrup, ointment, drops or injection, say so (सिरप, मलम, थेंब, इंजेक्शन) instead of 'गोळी'.\n" +
    "- idx: the number from the LIST below of the same medicine or the same salt, or null if none matches.\n" +
    "If you cannot read a medicine with certainty, skip it. Do not guess.\nLIST:\n" + list;

  const schema = {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" }, salt: { type: "STRING" },
            use: { type: "STRING", description: "Simple everyday MARATHI in Devanagari script, max 10 words, e.g. शुगरची गोळी, बीपीची गोळी. Never English or Hindi." },
            idx: { type: "INTEGER", nullable: true },
          },
          required: ["name", "salt", "use"],
        },
      },
    },
    required: ["items"],
  };

  let r;
  try {
    r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: prompt }] }],
        // मराठी (देवनागरी) साठी जास्त टोकन लागतात, म्हणून 600 ऐवजी 2000
        generationConfig: { temperature: 0, maxOutputTokens: 2000, responseMimeType: "application/json", responseSchema: schema },
      }),
    });
  } catch {
    return Response.json({ error: "Google शी कनेक्ट होता आले नाही." }, { status: 502 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = r.status === 429 ? "आजची मोफत मर्यादा संपली. थोड्या वेळाने प्रयत्न करा." : "स्कॅन झाले नाही (" + r.status + ").";
    return Response.json({ error: msg, detail: (data && data.error && data.error.message) || "" }, { status: 502 });
  }
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let items = [];
  try { items = JSON.parse(text).items || []; } catch {}
  return Response.json({ items });
}; 
