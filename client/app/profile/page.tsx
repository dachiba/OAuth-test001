import Link from "next/link";

type ProfileProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Profile({ searchParams }: ProfileProps) {
  const params = await searchParams;
  const value = params?.email;
  const email = Array.isArray(value) ? value[0] : value || "(unknown)";
  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Logged in</h1>
      <p style={{ marginTop: "0.75rem" }}>
        logged in as: <strong>{email}</strong>
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link href="/">back</Link>
      </p>
    </main>
  );
}
