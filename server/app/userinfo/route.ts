import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/tokens";
import { createCorsPreflight, jsonWithCors } from "@/lib/cors";

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer (.+)$/i);
  if (!m) return jsonWithCors({ error: "missing_token" }, origin, { status: 401 });
  try {
    const payload = await verifyAccessToken(m[1]);
    return jsonWithCors({ sub: payload.sub, email: payload.email }, origin);
  } catch {
    return jsonWithCors({ error: "invalid_token" }, origin, { status: 401 });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return createCorsPreflight(origin);
}
