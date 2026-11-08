// मालकाचा पासवर्ड तपासणे: वेळ-स्थिर तुलना + चुकीच्या प्रयत्नांवर मर्यादा.
// list.js, log.js, identify.js तिघेही हेच वापरतात.
async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const A = new Uint8Array(x), B = new Uint8Array(y);
  let r = 0;
  for (let i = 0; i < A.length; i++) r |= A[i] ^ B[i];
  return r === 0;
}

// ठीक असेल तर null, नाहीतर {status, error}
export async function checkOwner(request, env, password) {
  const secret = env.OWNER_PASSWORD;
  if (!secret) return { status: 500, error: "OWNER_PASSWORD सेट केलेला नाही." };
  const ip = request.headers.get("CF-Connecting-IP") || "x";
  const fk = "fail:" + ip;
  let fails = 0;
  if (env.MEDS) { try { fails = parseInt((await env.MEDS.get(fk)) || "0", 10) || 0; } catch {} }
  if (fails >= 5) return { status: 429, error: "खूप चुकीचे प्रयत्न. 15 मिनिटांनी पुन्हा करा." };
  if (typeof password !== "string" || !(await same(password, secret))) {
    if (env.MEDS) { try { await env.MEDS.put(fk, String(fails + 1), { expirationTtl: 900 }); } catch {} }
    return { status: 401, error: "पासवर्ड चुकीचा आहे." };
  }
  if (fails && env.MEDS) { try { await env.MEDS.delete(fk); } catch {} }
  return null;
}
