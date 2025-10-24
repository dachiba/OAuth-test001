import { cookies } from "next/headers";
import { randomId } from "./utils";

type Session = { userEmail: string; createdAt: number };

declare global {
  var __oauthDemoSessions: Map<string, Session> | undefined;
}

const sessions =
  globalThis.__oauthDemoSessions ??
  (globalThis.__oauthDemoSessions = new Map<string, Session>()); // sid -> session

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid")?.value;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("no-session");
  return session;
}

export async function setSession(email: string) {
  const sid = randomId(24);
  sessions.set(sid, { userEmail: email, createdAt: Date.now() });
  const cookieStore = await cookies();
  cookieStore.set("sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
  return sid;
}
