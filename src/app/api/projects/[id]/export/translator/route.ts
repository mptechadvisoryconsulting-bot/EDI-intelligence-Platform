import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getImplementationInterface } from "@/lib/interface-definitions";
import { detectLayoutFormat } from "@/lib/erp-layout/parser";
import { generateTranslatorExport, type TranslatorFormat } from "@/lib/exports/translator-formats";
import { toExportMappingRow } from "@/lib/exports/mapping-rows";
import { activeTransactionCodes } from "@/lib/exports/transaction-grouping";

type Params = { params: Promise<{ id: string }> };

const FORMATS: TranslatorFormat[] = ["sterling", "cleo", "boomi", "opentext", "clarification_email"];

const FORMAT_LABELS: Record<TranslatorFormat, string> = {
  sterling: "sterling-mrs",
  cleo: "cleo",
  boomi: "boomi",
  opentext: "opentext",
  clarification_email: "clarification",
};

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const format = (request.nextUrl.searchParams.get("format") ?? "sterling") as TranslatorFormat;
  const transaction = request.nextUrl.searchParams.get("transaction")?.trim() || undefined;
  const output = (request.nextUrl.searchParams.get("output") ?? "xlsx") as "xlsx" | "csv";

  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
  }

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      mappingRecommendations: { orderBy: [{ targetSegment: "asc" }, { targetElement: "asc" }] },
      openQuestions: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Implementation not found" }, { status: 404 });
  }

  if (project.mappingRecommendations.length === 0 && format !== "clarification_email") {
    return NextResponse.json({ error: "Run analysis before exporting translator handoff." }, { status: 400 });
  }

  const codes = activeTransactionCodes(project.transactions);
  if (transaction && !codes.includes(transaction)) {
    return NextResponse.json(
      { error: `Transaction ${transaction} is not in implementation scope (${codes.join(", ")})` },
      { status: 400 }
    );
  }

  const accountLayout = await getImplementationInterface({
    userId: session.id,
    transactions: project.transactions,
    interfaceDefinitionId: project.interfaceDefinitionId,
  });
  const layoutFields = accountLayout?.fields ?? [];

  const meta = {
    name: project.name,
    customer: project.customer,
    tradingPartner: project.tradingPartner,
    erpSystem: project.erpSystem || accountLayout?.erpSystem || "",
    erpVersion: project.erpVersion ?? accountLayout?.erpVersion,
    translatorTarget: project.translatorTarget,
    transactions: project.transactions,
    layoutFileName: accountLayout?.originalFileName,
    layoutFormat: layoutFields.length ? detectLayoutFormat(layoutFields) : null,
  };

  const exportResult = generateTranslatorExport(
    format,
    meta,
    project.mappingRecommendations.map(toExportMappingRow),
    project.openQuestions.map((q) => q.question),
    layoutFields,
    transaction,
    output === "csv" ? "csv" : "xlsx"
  );

  const label = FORMAT_LABELS[format];
  const txSuffix = transaction ? `-${transaction}` : transaction === undefined && codes.length > 1 ? "-by-transaction" : "";
  const filename = `${project.name.replace(/[^a-z0-9-_]+/gi, "_")}-${label}${txSuffix}.${exportResult.extension}`;

  const body =
    exportResult.kind === "binary"
      ? new Uint8Array(exportResult.content)
      : exportResult.content;

  return new NextResponse(body, {
    headers: {
      "Content-Type": exportResult.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
