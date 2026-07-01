import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/login-rate-limit";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rateKey = `${ip}:${username.toLowerCase()}`;
  const rate = checkLoginRateLimit(rateKey);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  clearLoginRateLimit(rateKey);
  await createSession(user);
  return NextResponse.json({ ok: true, user: { username: user.username, name: user.name } });
}
