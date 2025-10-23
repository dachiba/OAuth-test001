# Agent.md — OAuth Demo App (Phase 2: Implementation Instructions)

This document turns the Phase 1 spec into **concrete, runnable instructions** for Codex (or any engineer) to scaffold and implement the demo.  
Stack: **Next.js 13+ App Router**, TypeScript. Two apps: **/server** (OAuth Provider) and **/client** (OAuth Client).

> Goal recap: Minimal OAuth **Authorization Code + PKCE** demo, local only, no persistent DB. Show login → code → token → userinfo.

---

## 0) Repo Layout

```
oauth-demo/
├─ server/   # OAuth provider (Next.js App Router)
└─ client/   # OAuth client (Next.js App Router)
```

---

## 1) Create Apps & Install Deps

```bash
# from an empty folder
npm create next@latest server -- --ts --eslint --app --src-dir false --import-alias "@/*"
npm create next@latest client -- --ts --eslint --app --src-dir false --import-alias "@/*"

# common deps
cd server
npm i jose zod
cd ../client
npm i zod
```

> If using Node 18+, Web Crypto is available. For hashing in the client, we’ll use **SubtleCrypto**. For JWT in the server, we’ll use **jose**.

---

## 2) Environment Variables

### 2.1 `server/.env.local` (example)

```
SERVER_BASE_URL=http://localhost:4000
JWT_SECRET=dev-secret-for-demo
TOKEN_EXP_SECONDS=600

# register allowed clients + redirect URIs
CLIENTS_JSON=[{"client_id":"client-demo","redirect_uris":["http://localhost:3000/callback"]}]
```

### 2.2 `client/.env.local` (example)

```
CLIENT_BASE_URL=http://localhost:3000
OAUTH_SERVER_URL=http://localhost:4000
CLIENT_ID=client-demo
REDIRECT_PATH=/callback
```

---

## 3) package.json Scripts & Ports

### 3.1 `server/package.json`

```json
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "PORT=4000 next dev",
    "build": "next build",
    "start": "PORT=4000 next start"
  }
}
```

### 3.2 `client/package.json`

```json
{
  "name": "client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "PORT=3000 next dev",
    "build": "next build",
    "start": "PORT=3000 next start"
  }
}
```

---

## 4) Server Implementation (Next.js — App Router)

### 4.1 `server/lib/utils.ts`

```ts
// server/lib/utils.ts
import crypto from "crypto";

export function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(input: string) {
  const hash = crypto.createHash("sha256").update(input).digest();
  return Buffer.from(hash).toString("base64url");
}
```

### 4.2 `server/lib/users.ts` (in-memory)

```ts
// server/lib/users.ts
type User = { id: string; email: string; pwHash: string };
const users = new Map<string, User>(); // email -> user

import crypto from "crypto";

export async function createUser(email: string, password: string) {
  if (users.has(email)) throw new Error("exists");
  const id = crypto.randomBytes(16).toString("hex");
  const pwHash = crypto.createHash("sha256").update(password).digest("hex");
  const user = { id, email, pwHash };
  users.set(email, user);
  return user;
}

export async function verifyUser(email: string, password: string) {
  const u = users.get(email);
  if (!u) return null;
  const pwHash = crypto.createHash("sha256").update(password).digest("hex");
  return u.pwHash === pwHash ? u : null;
}

export function getUserByEmail(email: string) {
  return users.get(email) || null;
}
```

### 4.3 `server/lib/sessions.ts` (very simple cookie sessions)

```ts
// server/lib/sessions.ts
import { cookies } from "next/headers";
import { randomId } from "./utils";

type Session = { userEmail: string; createdAt: number };
const sessions = new Map<string, Session>(); // sid -> session

export function getCurrentSession() {
  const cookieStore = cookies();
  const sid = cookieStore.get("sid")?.value;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

export function requireSession() {
  const s = getCurrentSession();
  if (!s) throw new Error("no-session");
  return s;
}

export function setSession(email: string) {
  const sid = randomId(24);
  sessions.set(sid, { userEmail: email, createdAt: Date.now() });
  const cookieStore = cookies();
  cookieStore.set("sid", sid, { httpOnly: true, sameSite: "lax", path: "/" });
  return sid;
}
```

### 4.4 `server/lib/tokens.ts` (JWT)

```ts
// server/lib/tokens.ts
import { SignJWT, jwtVerify } from "jose";

const enc = new TextEncoder();
const secret = process.env.JWT_SECRET!;

export async function issueAccessToken(sub: string, email: string) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Number(process.env.TOKEN_EXP_SECONDS || 600);
  const jwt = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(enc.encode(secret));
  return { access_token: jwt, token_type: "Bearer", expires_in: exp - now };
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, enc.encode(secret), {
    algorithms: ["HS256"],
  });
  return payload as { sub: string; email: string; iat: number; exp: number };
}
```

### 4.5 `server/lib/clients.ts` (allowed clients)

```ts
// server/lib/clients.ts
type Client = { client_id: string; redirect_uris: string[] };

let clients: Client[] = [];
export function loadClients() {
  if (!clients.length) {
    const raw = process.env.CLIENTS_JSON || "[]";
    clients = JSON.parse(raw);
  }
  return clients;
}

export function findClient(client_id: string) {
  return loadClients().find(c => c.client_id === client_id) || null;
}

export function validateRedirect(client_id: string, redirect_uri: string) {
  const c = findClient(client_id);
  if (!c) return false;
  return c.redirect_uris.includes(redirect_uri);
}
```

### 4.6 `server/lib/authcodes.ts` (authorization codes)

```ts
// server/lib/authcodes.ts
import { randomId } from "./utils";

type AuthCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  method: "S256";
  userEmail: string;
  createdAt: number;
};

const codes = new Map<string, AuthCode>();

export function createCode(input: Omit<AuthCode, "code" | "createdAt">) {
  const code = randomId(32);
  const item: AuthCode = { ...input, code, createdAt: Date.now() };
  codes.set(code, item);
  return item;
}

export function consumeCode(code: string) {
  const item = codes.get(code);
  if (!item) return null;
  codes.delete(code);
  return item;
}
```

### 4.7 Routes

#### 4.7.1 Register UI: `server/app/register/page.tsx`

```tsx
// server/app/register/page.tsx
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
    <main className="p-8">
      <h1>Register</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Create</button>
      </form>
      <p>{msg}</p>
    </main>
  );
}
```

#### 4.7.2 Register API: `server/app/register/route.ts`

```ts
// server/app/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    await createUser(email, password);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
```

#### 4.7.3 Login UI: `server/app/login/page.tsx` and API `server/app/login/route.ts`

```tsx
// server/app/login/page.tsx
"use client";
import { useState, useEffect } from "react";

export default function LoginPage({ searchParams }: { searchParams: { returnTo?: string } }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [returnTo, setReturnTo] = useState("");

  useEffect(() => {
    setReturnTo(searchParams?.returnTo || "/");
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) window.location.href = returnTo;
    else alert("login failed");
  }

  return (
    <main className="p-8">
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
    </main>
  );
}
```

```ts
// server/app/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/users";
import { setSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const u = await verifyUser(email, password);
  if (!u) return NextResponse.json({ error: "invalid" }, { status: 401 });
  setSession(u.email);
  return NextResponse.json({ ok: true });
}
```

#### 4.7.4 Authorize: `server/app/authorize/route.ts`

```ts
// server/app/authorize/route.ts
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
```

#### 4.7.5 Token: `server/app/token/route.ts`

```ts
// server/app/token/route.ts
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
  if (item.client_id !== client_id) return NextResponse.json({ error: "client_mismatch" }, { status: 400 });
  if (!validateRedirect(client_id, redirect_uri) || item.redirect_uri !== redirect_uri) {
    return NextResponse.json({ error: "redirect_mismatch" }, { status: 400 });
  }

  const expected = item.code_challenge;
  const actual = sha256Base64Url(code_verifier);
  if (expected !== actual) return NextResponse.json({ error: "invalid_verifier" }, { status: 400 });

  const user = getUserByEmail(item.userEmail)!;
  const token = await issueAccessToken(user.id, user.email);
  return NextResponse.json(token);
}
```

#### 4.7.6 UserInfo: `server/app/userinfo/route.ts`

```ts
// server/app/userinfo/route.ts
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
```

> Server done. Minimal but complete.

---

## 5) Client Implementation (Next.js — App Router)

### 5.1 `client/lib/pkce.ts`

```ts
// client/lib/pkce.ts
export async function sha256Base64Url(v: string) {
  const data = new TextEncoder().encode(v);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let s = "";
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function randomString(length = 64) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, x => ("0" + x.toString(16)).slice(-2)).join("");
}

export async function createPkcePair() {
  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}
```

### 5.2 Top Page: `client/app/page.tsx` (Login button)

```tsx
// client/app/page.tsx
"use client";
import { createPkcePair } from "@/lib/pkce";

export default function Home() {
  async function startLogin() {
    const base = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || process.env.CLIENT_BASE_URL;
    const clientBase = base || "http://localhost:3000";
    const server = process.env.NEXT_PUBLIC_OAUTH_SERVER_URL || process.env.OAUTH_SERVER_URL || "http://localhost:4000";
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || process.env.CLIENT_ID || "client-demo";
    const redirectPath = process.env.NEXT_PUBLIC_REDIRECT_PATH || process.env.REDIRECT_PATH || "/callback";
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
    <main className="p-8">
      <h1>OAuth Demo Client</h1>
      <button onClick={startLogin}>Login with OAuth Server</button>
      <p>First time? Register user at <a href="http://localhost:4000/register">server/register</a>.</p>
    </main>
  );
}
```

### 5.3 Callback: `client/app/callback/page.tsx`

```tsx
// client/app/callback/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function CallbackPage() {
  const [msg, setMsg] = useState("Exchanging code...");

  useEffect(() => {
    (async () => {
      const sp = new URLSearchParams(window.location.search);
      const code = sp.get("code");
      const state = sp.get("state");
      const exState = sessionStorage.getItem("oauth_state");
      if (!code || !state || state !== exState) {
        setMsg("Invalid state/code"); return;
      }
      const verifier = sessionStorage.getItem("pkce_verifier")!;
      const server = process.env.NEXT_PUBLIC_OAUTH_SERVER_URL || process.env.OAUTH_SERVER_URL || "http://localhost:4000";
      const clientBase = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || process.env.CLIENT_BASE_URL || "http://localhost:3000";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || process.env.CLIENT_ID || "client-demo";
      const redirectPath = process.env.NEXT_PUBLIC_REDIRECT_PATH || process.env.REDIRECT_PATH || "/callback";
      const redirectUri = `${clientBase}${redirectPath}`;

      const res = await fetch(`${server}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier
        }).toString()
      });
      if (!res.ok) { setMsg("Token exchange failed"); return; }
      const token = await res.json();

      const u = await fetch(`${server}/userinfo`, {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      if (!u.ok) { setMsg("userinfo failed"); return; }
      const info = await u.json();
      const q = new URLSearchParams({ email: info.email || "" });
      window.location.href = `/profile?${q.toString()}`;
    })();
  }, []);

  return <main className="p-8"><p>{msg}</p></main>;
}
```

### 5.4 Profile page: `client/app/profile/page.tsx`

```tsx
// client/app/profile/page.tsx
export default function Profile({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams?.email || "(unknown)";
  return (
    <main className="p-8">
      <h1>Logged in</h1>
      <p>logged in as: <strong>{email}</strong></p>
      <a href="/">back</a>
    </main>
  );
}
```

---

## 6) Runbook

```bash
# 1) server
cd server
npm run dev  # http://localhost:4000

# 2) client
cd ../client
npm run dev  # http://localhost:3000
```

1. Open `http://localhost:4000/register` and create a user.  
2. Visit `http://localhost:3000/` → click **Login**.  
3. Login on server → approve → redirected to `/callback` → `/profile` shows your email.

---

## 7) cURL Debug (optional)

```bash
# after you get a code in callback URL:
curl -X POST http://localhost:4000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=...&redirect_uri=http://localhost:3000/callback&client_id=client-demo&code_verifier=..."
```

```bash
# then
curl http://localhost:4000/userinfo -H "Authorization: Bearer <access_token>"
```

---

## 8) Minimal Tests (checklist)

- PKCE verification fails for wrong `code_verifier`.  
- `state` mismatch blocks the flow.  
- Unknown `client_id` or `redirect_uri` is rejected.  
- `access_token` is HS256-signed JWT and expires per `TOKEN_EXP_SECONDS`.  
- `/userinfo` rejects missing/invalid token.

*(Optionally add unit tests for pkce utils and token issue/verify using Vitest.)*

---

## 9) Notes & Next Steps

- For production-like demos, add: **HTTPS**, **refresh tokens**, **scopes**, **DB persistence**, CSRF cookie on server forms, rate limits.  
- To enable OIDC, add ID Token issuance and `.well-known/openid-configuration`.

---

**End of Phase 2** — This file, together with Phase 1, allows immediate implementation and local run.
