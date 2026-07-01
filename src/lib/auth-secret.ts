export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("AUTH_SECRET is required in production");
  }
  return new TextEncoder().encode("edi-intelligence-dev-secret-local-only");
}
