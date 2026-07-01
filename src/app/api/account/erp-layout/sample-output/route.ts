import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccountErpLayout } from "@/lib/erp-layout/account";
import { verifyLayoutAgainstSample } from "@/lib/erp-layout/sample-verify";

async function withAuth<T>(handler: (userId: string) => Promise<T>) {
  try {
    const session = await requireSession();
    return await handler(session.id);
  } catch {
    return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId) => {
    const layout = await getAccountErpLayout(userId);
    if (!layout) {
      return NextResponse.json({ error: "Configure ERP layout before uploading sample output" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Sample output file is required" }, { status: 400 });
    }

    const fileName = file.name || "sample-output.txt";
    const content = await file.text();

    if (!content.trim()) {
      return NextResponse.json({ error: "Sample file is empty" }, { status: 400 });
    }

    await db.erpLayoutProfile.update({
      where: { userId },
      data: {
        sampleOutputFileName: fileName,
        sampleOutputContent: content,
      },
    });

    const verification = verifyLayoutAgainstSample(layout.fields, content, fileName);

    return NextResponse.json({
      ok: true,
      sampleOutputFileName: fileName,
      verification,
    });
  });
}

export async function DELETE() {
  return withAuth(async (userId) => {
    await db.erpLayoutProfile.updateMany({
      where: { userId },
      data: {
        sampleOutputFileName: null,
        sampleOutputContent: null,
      },
    });
    return NextResponse.json({ ok: true });
  });
}
