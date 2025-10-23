import { NextRequest, NextResponse } from "next/server";
import { consumeCode } from "@/lib/authcodes";
import { issueAccessToken } from "@/lib/tokens";
import { sha256Base64Url } from "@/lib/utils";
import { validateRedirect } from "@/lib/clients";
import { getUserByEmail } from "@/lib/users";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const grant_type = params.get("grant_type");
  const code = params.get("code") || "";
  const redirect_uri = params.get("redirect_uri") || "";
  const client_id = params.get("client_id") || "";
  const code_verifier = params.get("code_verifier") || "";

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  const item = consumeCode(code);
  if (!item) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  if (item.client_id !== client_id) {
    return NextResponse.json({ error: "client_mismatch" }, { status: 400 });
  }
  if (!validateRedirect(client_id, redirect_uri) || item.redirect_uri !== redirect_uri) {
    return NextResponse.json({ error: "redirect_mismatch" }, { status: 400 });
  }

  const expected = item.code_challenge;
  const actual = sha256Base64Url(code_verifier);
  if (expected !== actual) {
    return NextResponse.json({ error: "invalid_verifier" }, { status: 400 });
  }

  const user = getUserByEmail(item.userEmail)!;
  const token = await issueAccessToken(user.id, user.email);
  return NextResponse.json(token);
}
