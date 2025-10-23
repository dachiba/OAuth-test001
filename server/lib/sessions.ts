import { cookies } from "next/headers";
import { randomId } from "./utils";

type Session = { userEmail: string; createdAt: number };

const sessions = new Map<string, Session>(); // sid -> session

export function getCurrentSession() {
  const cookieStore = cookies();
  const sid = cookieStore.get("sid")?.value;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

export function requireSession() {
  const session = getCurrentSession();
  if (!session) throw new Error("no-session");
  return session;
}

export function setSession(email: string) {
  const sid = randomId(24);
  sessions.set(sid, { userEmail: email, createdAt: Date.now() });
  const cookieStore = cookies();
  cookieStore.set("sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
  return sid;
}
