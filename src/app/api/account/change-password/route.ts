import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";

export async function POST(request: NextRequest) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 12) {
    return NextResponse.json({ error: "New password must be at least 12 characters" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });

  return NextResponse.json({ ok: true });
}
