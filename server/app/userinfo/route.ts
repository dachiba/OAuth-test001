import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer (.+)$/i);
  if (!m) return NextResponse.json({ error: "missing_token" }, { status: 401 });
  try {
    const payload = await verifyAccessToken(m[1]);
    return NextResponse.json({ sub: payload.sub, email: payload.email });
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
}
