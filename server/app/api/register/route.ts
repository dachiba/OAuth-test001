import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    await createUser(email, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
