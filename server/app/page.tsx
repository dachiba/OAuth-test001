export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "1rem" }}>
        OAuth Demo Server
      </h1>
      <p>Use this server to issue authorization codes and tokens with PKCE.</p>
      <ul style={{ marginTop: "1rem", paddingLeft: "1rem" }}>
        <li>
          <a href="/register">Create account</a>
        </li>
        <li>
          <a href="/login">Sign in</a>
        </li>
      </ul>
    </main>
  );
}
