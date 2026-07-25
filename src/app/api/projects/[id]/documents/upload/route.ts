import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import { db } from "@/lib/db";
import {
  buildParseSummary,
  parseUploadedFile,
  saveUploadedFile,
  validateUpload,
} from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

async function getOwnedProject(id: string, ownerId: string) {
  return db.implementationProject.findFirst({ where: { id, ownerId } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;

  const project = await getOwnedProject(id, session.id);
  if (!project) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const docType = String(formData.get("type") ?? "guide");
  const docName = String(formData.get("name") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const validationError = validateUpload(file.name, file.size);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalFileName = file.name;
  const mimeType = file.type || "application/octet-stream";
  const name = docName || originalFileName;

  const document = await db.document.create({
    data: {
      projectId: id,
      name,
      type: docType,
      originalFileName,
      mimeType,
      fileSize: buffer.length,
      status: "processing",
    },
  });

  try {
    const filePath = await saveUploadedFile(id, document.id, originalFileName, buffer);
    const parsed = await parseUploadedFile(buffer, originalFileName, mimeType, docType);
    const parseSummary = buildParseSummary(parsed);

    const updated = await db.document.update({
      where: { id: document.id },
      data: {
        filePath,
        parsedContent: JSON.stringify(parsed),
        parseSummary,
        status: parsed.warnings.length ? "parsed_with_warnings" : "parsed",
        parsedAt: new Date(),
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    await db.document.update({
      where: { id: document.id },
      data: { status: "failed" },
    });
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  const { id } = await params;

  const project = await getOwnedProject(id, session.id);
  if (!project) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  const documents = await db.document.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
      parseSummary: true,
      parsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(documents);
}
