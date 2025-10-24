import crypto from "crypto";

type User = { id: string; email: string; pwHash: string };

declare global {
  var __oauthDemoUsers: Map<string, User> | undefined;
}

const users =
  globalThis.__oauthDemoUsers ??
  (globalThis.__oauthDemoUsers = new Map<string, User>([
    [
      "test@example.com",
      {
        id: "seed-user",
        email: "test@example.com",
        pwHash: "f40801e575e14bb373dbcc83dde8f12768958b05b1b677152badba106ed95753",
      },
    ],
  ])); // email -> user

export async function createUser(email: string, password: string) {
  if (users.has(email)) throw new Error("exists");
  const id = crypto.randomBytes(16).toString("hex");
  const pwHash = crypto.createHash("sha256").update(password).digest("hex");
  const user = { id, email, pwHash };
  users.set(email, user);
  return user;
}

export async function verifyUser(email: string, password: string) {
  const user = users.get(email);
  if (!user) return null;
  const pwHash = crypto.createHash("sha256").update(password).digest("hex");
  return user.pwHash === pwHash ? user : null;
}

export function getUserByEmail(email: string) {
  return users.get(email) || null;
}
