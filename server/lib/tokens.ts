import { SignJWT, jwtVerify } from "jose";

const enc = new TextEncoder();
const secret = process.env.JWT_SECRET!;

export async function issueAccessToken(sub: string, email: string) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Number(process.env.TOKEN_EXP_SECONDS || 600);
  const jwt = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(enc.encode(secret));
  return { access_token: jwt, token_type: "Bearer", expires_in: exp - now };
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, enc.encode(secret), {
    algorithms: ["HS256"],
  });
  return payload as { sub: string; email: string; iat: number; exp: number };
}
