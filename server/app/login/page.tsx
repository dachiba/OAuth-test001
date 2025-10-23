"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = returnTo;
    } else {
      alert("login failed");
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "420px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Login</h1>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}
      >
        <input
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem 0.75rem",
            backgroundColor: "#2563EB",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Login
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "2rem", maxWidth: "420px", margin: "0 auto" }}>
          <p>Loading...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
