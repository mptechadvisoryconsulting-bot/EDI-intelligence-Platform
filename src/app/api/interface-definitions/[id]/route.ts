import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";
import { getInterfaceDefinition } from "@/lib/interface-definitions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;
  const { id } = await params;
  const definition = await getInterfaceDefinition(session.id, id);
  if (!definition) {
    return NextResponse.json({ error: "Interface definition not found" }, { status: 404 });
  }
  return NextResponse.json({ definition });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;
  const { id } = await params;
  const body = await request.json();
  const current = await db.transactionInterfaceDefinition.findFirst({
    where: { id, userId: session.id },
  });
  if (!current) {
    return NextResponse.json({ error: "Interface definition not found" }, { status: 404 });
  }

  const status = body.status === "active" || body.status === "archived" ? body.status : undefined;
  const updated = await db.transactionInterfaceDefinition.update({
    where: { id },
    data: {
      status,
      description:
        body.description !== undefined
          ? String(body.description).trim() || null
          : undefined,
    },
  });
  return NextResponse.json({ ok: true, definition: updated });
}
