import crypto from "crypto";

type User = { id: string; email: string; pwHash: string };

const users = new Map<string, User>(); // email -> user

export async function createUser(email: string, password: string) {
  if (users.has(email)) throw new Error("exists");
  const id = crypto.randomBytes(16).toString("hex");
  const pwHash = crypto.createHash("sha256").update(password).digest("hex");
  const user = { id, email, pwHash };
  users.set(email, user);
  return user;
}

export async function verifyUser(email: string, password: string) {
  const u = users.get(email);
  if (!u) return null;
  const pwHash = crypto.createHash("sha256").update(password).digest("hex");
  return u.pwHash === pwHash ? u : null;
}

export function getUserByEmail(email: string) {
  return users.get(email) || null;
}
