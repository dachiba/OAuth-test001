import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/users";
import { setSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const u = await verifyUser(email, password);
  if (!u) return NextResponse.json({ error: "invalid" }, { status: 401 });
  setSession(u.email);
  return NextResponse.json({ ok: true });
}
