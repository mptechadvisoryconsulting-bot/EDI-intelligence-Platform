import { NextRequest, NextResponse } from "next/server";
import { requireAccountContext } from "@/lib/account-context";
import { inspectKpiWorkbook } from "@/lib/kpi/workbook-inspector";

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const WORKBOOK_EXTENSIONS = new Set(["xlsx", "xls"]);

export async function POST(request: NextRequest) {
  try {
    const account = await requireAccountContext();
    const formData = await request.formData();
    const upload = formData.get("file");

    if (!upload || typeof upload === "string") {
      return NextResponse.json({ error: "Workbook file is required" }, { status: 400 });
    }

    const fileName = upload.name || "workbook.xlsx";
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!WORKBOOK_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "This preview currently accepts XLS/XLSX workbooks only" },
        { status: 415 }
      );
    }

    if (upload.size <= 0) {
      return NextResponse.json({ error: "Workbook is empty" }, { status: 400 });
    }
    if (upload.size > MAX_WORKBOOK_BYTES) {
      return NextResponse.json(
        { error: "Workbook exceeds the 10 MB preview limit" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    let inspection;
    try {
      inspection = inspectKpiWorkbook(buffer);
    } catch (error) {
      console.warn("KPI workbook preview rejected malformed workbook", {
        accountId: account.accountId,
        fileName,
        error: error instanceof Error ? error.message : "unknown",
      });
      return NextResponse.json(
        { error: "Unable to inspect this workbook. Confirm it is a valid XLS/XLSX file." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      previewOnly: true,
      file: {
        name: fileName,
        size: upload.size,
      },
      inspection,
      confirmationRequired: true,
      persisted: false,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
  }
}
