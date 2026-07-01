import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

async function getOwnedProject(id: string, ownerId: string) {
  return db.implementationProject.findFirst({ where: { id, ownerId } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();

  const project = await getOwnedProject(id, session.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const document = await db.document.create({
    data: {
      projectId: id,
      name: String(body.name ?? "Untitled document"),
      type: String(body.type ?? "guide"),
      status: "uploaded",
    },
  });

  return NextResponse.json(document, { status: 201 });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;

  const project = await getOwnedProject(id, session.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const documents = await db.document.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
