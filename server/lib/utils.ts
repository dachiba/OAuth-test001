import crypto from "crypto";

export function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(input: string) {
  const hash = crypto.createHash("sha256").update(input).digest();
  return Buffer.from(hash).toString("base64url");
}
