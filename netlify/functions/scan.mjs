export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405 });
  const key = Netlify.env.get("GEMINI_API_KEY");
  if (!key) return Response.json({ error: "Server me GEMINI_API_KEY set nahi hai." }, { status: 500 });
  const model = Netlify.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const image = String(body.image || "");
  const list = String(body.list || "").slice(0, 8000);
  if (!image || image.length > 4000000) return Response.json({ error: "Photo missing ya badi hai." }, { status: 400 });

  const prompt =
    "Image me dawa ka strip/box ya doctor ki parchi hai. Har dawa padho. " +
    "Har dawa ke liye: name (jo likha hai), salt (composition), use (kis kaam aati hai, Hinglish me max 8 shabd), " +
    "idx (neeche LIST ka wo number jo isi dawa ya isi salt ki hai, nahi ho to null). " +
    "Pakka na padh paao to us dawa ko chhod do. Andaza mat lagao.\nLIST:\n" + list;

  const schema = {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" }, salt: { type: "STRING" },
            use: { type: "STRING" }, idx: { type: "INTEGER", nullable: true },
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
        generationConfig: { temperature: 0, maxOutputTokens: 600, responseMimeType: "application/json", responseSchema: schema },
      }),
    });
  } catch {
    return Response.json({ error: "Google se connect nahi ho paya." }, { status: 502 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = r.status === 429 ? "Aaj ki free limit khatam ho gayi. Thodi der baad try karo." : "Scan nahi ho paya (" + r.status + ").";
    return Response.json({ error: msg, detail: (data && data.error && data.error.message) || "" }, { status: 502 });
  }
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let items = [];
  try { items = JSON.parse(text).items || []; } catch {}
  return Response.json({ items });
};
