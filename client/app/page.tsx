"use client";

import { createPkcePair } from "@/lib/pkce";

export default function Home() {
  async function startLogin() {
    const base = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || process.env.CLIENT_BASE_URL;
    const clientBase = base || "http://localhost:3000";
    const server =
      process.env.NEXT_PUBLIC_OAUTH_SERVER_URL ||
      process.env.OAUTH_SERVER_URL ||
      "http://localhost:4000";
    const clientId =
      process.env.NEXT_PUBLIC_CLIENT_ID || process.env.CLIENT_ID || "client-demo";
    const redirectPath =
      process.env.NEXT_PUBLIC_REDIRECT_PATH || process.env.REDIRECT_PATH || "/callback";
    const redirectUri = `${clientBase}${redirectPath}`;

    const { verifier, challenge } = await createPkcePair();
    const state = crypto.randomUUID();

    sessionStorage.setItem("pkce_verifier", verifier);
    sessionStorage.setItem("oauth_state", state);

    const url = new URL("/authorize", server);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1rem" }}>
        OAuth Demo Client
      </h1>
      <button
        onClick={startLogin}
        style={{
          padding: "0.75rem 1.25rem",
          borderRadius: "6px",
          border: "none",
          backgroundColor: "#2563EB",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Login with OAuth Server
      </button>
      <p style={{ marginTop: "1rem" }}>
        First time? Register user at{" "}
        <a href="http://localhost:4000/register">server/register</a>.
      </p>
    </main>
  );
}
