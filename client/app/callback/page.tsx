"use client";

import { useEffect, useRef, useState } from "react";

export default function CallbackPage() {
  const [msg, setMsg] = useState("Exchanging code...");
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true; // React Strict Mode の重複実行を防ぐ

    (async () => {
      const sp = new URLSearchParams(window.location.search);
      const code = sp.get("code");
      const state = sp.get("state");
      const exState = sessionStorage.getItem("oauth_state");
      if (!code || !state || state !== exState) {
        setMsg("Invalid state/code");
        return;
      }
      const verifier = sessionStorage.getItem("pkce_verifier");
      if (!verifier) {
        setMsg("Missing PKCE verifier");
        return;
      }
      const server =
        process.env.NEXT_PUBLIC_OAUTH_SERVER_URL ||
        process.env.OAUTH_SERVER_URL ||
        "http://localhost:4000";
      const clientBase =
        process.env.NEXT_PUBLIC_CLIENT_BASE_URL ||
        process.env.CLIENT_BASE_URL ||
        "http://localhost:3000";
      const clientId =
        process.env.NEXT_PUBLIC_CLIENT_ID || process.env.CLIENT_ID || "client-demo";
      const redirectPath =
        process.env.NEXT_PUBLIC_REDIRECT_PATH || process.env.REDIRECT_PATH || "/callback";
      const redirectUri = `${clientBase}${redirectPath}`;

      const res = await fetch(`${server}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          code_verifier: verifier,
        }).toString(),
      });
      if (!res.ok) {
        setMsg("Token exchange failed");
        return;
      }
      const token = await res.json();

      const u = await fetch(`${server}/userinfo`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!u.ok) {
        setMsg("userinfo failed");
        return;
      }
      const info = await u.json();
      const q = new URLSearchParams({ email: info.email || "" });
      sessionStorage.removeItem("pkce_verifier");
      sessionStorage.removeItem("oauth_state");
      window.location.href = `/profile?${q.toString()}`;
    })();
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <p>{msg}</p>
    </main>
  );
}
