import { unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; documentId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id, documentId } = await params;

  const document = await db.document.findFirst({
    where: {
      id: documentId,
      projectId: id,
      project: { ownerId: session.id },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (document.filePath) {
    try {
      await unlink(document.filePath);
    } catch {
      // File may already be gone
    }
  }

  await db.document.delete({ where: { id: documentId } });

  return NextResponse.json({ ok: true });
}
