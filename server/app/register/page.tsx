"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setMsg(r.ok ? "registered" : "failed");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "420px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Register</h1>
      <form
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}
        onSubmit={onSubmit}
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
          style={{ padding: "0.5rem 0.75rem", backgroundColor: "#2563EB", color: "#fff", border: "none", borderRadius: "4px" }}
        >
          Create
        </button>
      </form>
      <p style={{ marginTop: "0.75rem" }}>{msg}</p>
    </main>
  );
}
