const json = (obj, status = 200) =>
  Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const key = env.GEMINI_API_KEY;
  if (!key) return json({ error: "GEMINI_API_KEY सेट नाही." }, 500);
  const model = env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  let body;
  try { body = await request.json(); } catch { return json({ error: "चुकीची विनंती" }, 400); }
  const image = String(body.image || "");
  if (!image || image.length > 4000000) return json({ error: "फोटो नाही किंवा खूप मोठा आहे." }, 400);

  const prompt =
    "The image shows ONE medicine strip, box or bottle. Read it and return:\n" +
    "- name: the brand name exactly as written (keep English letters).\n" +
    "- company: the manufacturer / marketing company name if visible, else empty string.\n" +
    "- salt: the composition with strength, e.g. 'Paracetamol 650mg' (keep English letters).\n" +
    "Do not guess. If something is not clearly readable, return an empty string for it.";

  const schema = {
    type: "OBJECT",
    properties: { name: { type: "STRING" }, company: { type: "STRING" }, salt: { type: "STRING" } },
    required: ["name", "company", "salt"],
  };

  let r;
  try {
    r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 500, responseMimeType: "application/json", responseSchema: schema },
      }),
    });
  } catch {
    return json({ error: "Google शी कनेक्ट होता आले नाही." }, 502);
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: "स्कॅन झाले नाही (" + r.status + ")." }, 502);
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let out = {};
  try { out = JSON.parse(text); } catch {}
  return json({ name: out.name || "", company: out.company || "", salt: out.salt || "" });
}
