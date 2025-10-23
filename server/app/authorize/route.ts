import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/sessions";
import { createCode } from "@/lib/authcodes";
import { validateRedirect } from "@/lib/clients";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id") || "";
  const redirect_uri = url.searchParams.get("redirect_uri") || "";
  const response_type = url.searchParams.get("response_type");
  const state = url.searchParams.get("state") || "";
  const code_challenge = url.searchParams.get("code_challenge") || "";
  const code_challenge_method = url.searchParams.get("code_challenge_method") || "";

  if (response_type !== "code") {
    return NextResponse.json({ error: "unsupported_response_type" }, { status: 400 });
  }
  if (!validateRedirect(client_id, redirect_uri)) {
    return NextResponse.json({ error: "invalid_redirect" }, { status: 400 });
  }
  if (!code_challenge || code_challenge_method !== "S256") {
    return NextResponse.json({ error: "pkce_required" }, { status: 400 });
  }

  const session = getCurrentSession();
  if (!session) {
    const loginUrl = new URL("/login", process.env.SERVER_BASE_URL);
    loginUrl.searchParams.set("returnTo", url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  const code = createCode({
    client_id,
    redirect_uri,
    code_challenge,
    method: "S256",
    userEmail: session.userEmail,
  });

  const redirect = new URL(redirect_uri);
  redirect.searchParams.set("code", code.code);
  if (state) redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect, { status: 302 });
}
