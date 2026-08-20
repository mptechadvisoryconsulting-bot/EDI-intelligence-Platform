import { NextRequest, NextResponse } from "next/server";
import { requireAccountContext } from "@/lib/account-context";
import { createKpiProposal, reviewKpiProposal } from "@/lib/kpi/proposal-service";

const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const WORKBOOK_EXTENSIONS = new Set(["xlsx", "xls"]);
const REVIEW_ROLES = new Set(["owner", "admin", "manager"]);

function parseStringList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const account = await requireAccountContext();
    const formData = await request.formData();
    const upload = formData.get("file");
    const sourceSheet = typeof formData.get("sourceSheet") === "string" ? String(formData.get("sourceSheet")) : "";

    if (!upload || typeof upload === "string") {
      return NextResponse.json({ error: "Workbook file is required" }, { status: 400 });
    }
    const fileName = upload.name || "workbook.xlsx";
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!WORKBOOK_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "KPI proposals currently accept XLS/XLSX workbooks only" }, { status: 415 });
    }
    if (upload.size <= 0) return NextResponse.json({ error: "Workbook is empty" }, { status: 400 });
    if (upload.size > MAX_WORKBOOK_BYTES) {
      return NextResponse.json({ error: "Workbook exceeds the 10 MB proposal limit" }, { status: 413 });
    }
    if (!sourceSheet.trim()) return NextResponse.json({ error: "Source sheet is required" }, { status: 400 });

    const buffer = Buffer.from(await upload.arrayBuffer());
    const proposal = await createKpiProposal(account.accountId, account.user.id, {
      fileName,
      fileSize: upload.size,
      buffer,
      sourceSheet,
      dimensions: parseStringList(formData.get("dimensions")),
      measures: parseStringList(formData.get("measures")),
    });

    return NextResponse.json({ ok: true, proposal, confirmationRequired: proposal.status === "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create KPI proposal";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const account = await requireAccountContext();
    if (!REVIEW_ROLES.has(account.membershipRole)) {
      return NextResponse.json({ error: "Your account role cannot confirm KPI dashboard proposals" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const proposalId = typeof body.proposalId === "string" ? body.proposalId.trim() : "";
    const decision = body.decision === "confirm" || body.decision === "reject" ? body.decision : null;
    if (!proposalId || !decision) {
      return NextResponse.json({ error: "proposalId and a confirm/reject decision are required" }, { status: 400 });
    }

    const proposal = await reviewKpiProposal(account.accountId, account.user.id, proposalId, decision);
    return NextResponse.json({ ok: true, proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review KPI proposal";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message.includes("not found") ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
