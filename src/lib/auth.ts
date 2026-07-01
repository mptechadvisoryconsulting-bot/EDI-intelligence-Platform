import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { getAuthSecret } from "./auth-secret";

function secretKey() {
  return getAuthSecret();
}

export type SessionUser = {
  id: string;
  username: string;
  name: string | null;
  role: string;
};

export async function verifyCredentials(username: string, password: string) {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  } satisfies SessionUser;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: (payload.name as string | null) ?? null,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
