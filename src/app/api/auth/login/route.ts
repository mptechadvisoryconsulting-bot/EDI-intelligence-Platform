import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(user);
  return NextResponse.json({ ok: true, user: { username: user.username, name: user.name } });
}
