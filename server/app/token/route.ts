import { NextRequest } from "next/server";
import { consumeCode } from "@/lib/authcodes";
import { issueAccessToken } from "@/lib/tokens";
import { sha256Base64Url } from "@/lib/utils";
import { validateRedirect } from "@/lib/clients";
import { getUserByEmail } from "@/lib/users";
import { createCorsPreflight, jsonWithCors } from "@/lib/cors";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const body = await req.text();
  const params = new URLSearchParams(body);

  const grant_type = params.get("grant_type");
  const code = params.get("code") || "";
  const redirect_uri = params.get("redirect_uri") || "";
  const client_id = params.get("client_id") || "";
  const code_verifier = params.get("code_verifier") || "";

  if (grant_type !== "authorization_code") {
    return jsonWithCors({ error: "unsupported_grant_type" }, origin, { status: 400 });
  }

  const item = consumeCode(code);
  if (!item) return jsonWithCors({ error: "invalid_code" }, origin, { status: 400 });
  if (item.client_id !== client_id) {
    return jsonWithCors({ error: "client_mismatch" }, origin, { status: 400 });
  }
  if (!validateRedirect(client_id, redirect_uri) || item.redirect_uri !== redirect_uri) {
    return jsonWithCors({ error: "redirect_mismatch" }, origin, { status: 400 });
  }

  const expected = item.code_challenge;
  const actual = sha256Base64Url(code_verifier);
  if (expected !== actual) {
    return jsonWithCors({ error: "invalid_verifier" }, origin, { status: 400 });
  }

  const user = getUserByEmail(item.userEmail)!;
  const token = await issueAccessToken(user.id, user.email);
  return jsonWithCors(token, origin);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return createCorsPreflight(origin);
}
