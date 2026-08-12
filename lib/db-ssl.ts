// node-postgres does strict TLS certificate-chain verification. Managed
// Postgres providers (Supabase, Neon, Render, Heroku, etc.) commonly hit
// "self-signed certificate in certificate chain" as a result, even though
// the connection is genuinely encrypted — their cert chain just isn't one
// Node trusts by default. And a `?sslmode=require` query param in the
// connection string doesn't fix this: recent `pg` versions treat
// `sslmode=require` as an alias for `verify-full`, which re-enables the
// exact verification we're trying to relax.
//
// The fix: don't rely on `sslmode` in the connection string at all — pass
// `ssl: { rejectUnauthorized: false }` explicitly instead (still TLS, just
// not verifying the CA chain). We only do this for non-local hosts, since
// a local Postgres (for local dev) typically isn't running TLS at all.
export function sslConfigFor(connectionString: string): { rejectUnauthorized: boolean } | undefined {
  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    return undefined;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return undefined;
  }
  return { rejectUnauthorized: false };
}
