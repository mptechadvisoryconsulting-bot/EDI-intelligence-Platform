import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAccountErpLayout,
  layoutFieldsToSourceFields,
  saveAccountErpLayout,
  validateLayoutFields,
} from "@/lib/erp-layout";
import { parseUploadedErpLayout } from "@/lib/erp-layout/upload-parser";

async function withAuth<T>(handler: (userId: string) => Promise<T>) {
  try {
    const session = await requireSession();
    return await handler(session.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
  }
}

export async function GET() {
  return withAuth(async (userId) => {
    const layout = await getAccountErpLayout(userId);
    if (!layout) {
      return NextResponse.json({ configured: false });
    }
    return NextResponse.json({ configured: true, layout });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      const erpSystem = String(formData.get("erpSystem") ?? "").trim();
      const erpVersion = String(formData.get("erpVersion") ?? "").trim() || null;

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }
      if (!erpSystem) {
        return NextResponse.json({ error: "ERP system name is required" }, { status: 400 });
      }

      const fileName = file.name || "layout.csv";
      const buffer = Buffer.from(await file.arrayBuffer());
      const fields = await parseUploadedErpLayout(buffer, fileName, file.type);

      if (fields.length === 0) {
        return NextResponse.json(
          {
            error:
              "Could not parse any layout fields. Use CSV/Excel with Interface Column, Field Name, Rec Number, Start Column, Width; JSON/XML layout; or an Oracle Transaction Layout Definition Report in TXT/PDF format.",
          },
          { status: 400 }
        );
      }

      await saveAccountErpLayout(userId, {
        erpSystem,
        erpVersion,
        originalFileName: fileName,
        fields,
      });

      const saved = await getAccountErpLayout(userId);
      const validation = validateLayoutFields(fields);

      return NextResponse.json({
        ok: true,
        layout: saved,
        validation,
        sourceFieldPreview: layoutFieldsToSourceFields(fields).slice(0, 5),
      });
    } catch (error) {
      console.error("ERP layout upload error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (userId) => {
    const body = await request.json();
    const existing = await getAccountErpLayout(userId);

    if (!existing) {
      return NextResponse.json({ error: "No layout configured" }, { status: 404 });
    }

    const fields = body.fields ?? existing.fields;
    await saveAccountErpLayout(userId, {
      erpSystem: body.erpSystem ?? existing.erpSystem,
      erpVersion: body.erpVersion ?? existing.erpVersion,
      originalFileName: existing.originalFileName,
      fields,
    });

    const saved = await getAccountErpLayout(userId);
    return NextResponse.json({ ok: true, layout: saved });
  });
}

export async function DELETE() {
  return withAuth(async (userId) => {
    await db.erpLayoutProfile.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  });
}
