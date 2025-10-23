import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/users";
import { setSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const user = await verifyUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  await setSession(user.email);
  return NextResponse.json({ ok: true });
}
