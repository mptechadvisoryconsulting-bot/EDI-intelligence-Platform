import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccountErpLayout } from "@/lib/erp-layout/account";
import { detectLayoutFormat } from "@/lib/erp-layout/parser";
import { generateMappingMatrixExport } from "@/lib/exports/translator-formats";
import { toExportMappingRow } from "@/lib/exports/mapping-rows";
import { activeTransactionCodes } from "@/lib/exports/transaction-grouping";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireSession();
  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type") ?? "mapping_matrix";
  const transaction = request.nextUrl.searchParams.get("transaction")?.trim() || undefined;

  const project = await db.implementationProject.findFirst({
    where: { id, ownerId: session.id },
    include: {
      artifacts: true,
      mappingRecommendations: { orderBy: [{ targetSegment: "asc" }, { targetElement: "asc" }] },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (type === "mapping_matrix" || type === "mapping_matrix_xlsx") {
    if (project.mappingRecommendations.length === 0) {
      return NextResponse.json({ error: "No mappings found. Run analysis first." }, { status: 404 });
    }

    const codes = activeTransactionCodes(project.transactions);
    if (transaction && !codes.includes(transaction)) {
      return NextResponse.json(
        { error: `Transaction ${transaction} is not in project scope (${codes.join(", ")})` },
        { status: 400 }
      );
    }

    const accountLayout = await getAccountErpLayout(session.id);
    const layoutFields = accountLayout?.fields ?? [];

    const exportResult = generateMappingMatrixExport(
      {
        name: project.name,
        customer: project.customer,
        tradingPartner: project.tradingPartner,
        erpSystem: project.erpSystem || accountLayout?.erpSystem || "",
        erpVersion: project.erpVersion ?? accountLayout?.erpVersion,
        translatorTarget: project.translatorTarget,
        transactions: project.transactions,
        layoutFileName: accountLayout?.originalFileName,
        layoutFormat: layoutFields.length ? detectLayoutFormat(layoutFields) : null,
      },
      project.mappingRecommendations.map(toExportMappingRow),
      layoutFields,
      transaction
    );

    const txSuffix = transaction ? `-${transaction}` : codes.length > 1 ? "-by-transaction" : "";
    const filename = `${project.name.replace(/[^a-z0-9-_]+/gi, "_")}-mapping-matrix${txSuffix}.${exportResult.extension}`;

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

  const artifact = project.artifacts.find((a) => a.type === type);
  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found. Run analysis first." }, { status: 404 });
  }

  const csvTypes = ["qa_test_plan_csv", "edi_compare_csv"];
  const extension = csvTypes.includes(type) ? "csv" : "txt";
  const filename = `${project.name.replace(/[^a-z0-9-_]+/gi, "_")}-${type}.${extension}`;

  return new NextResponse(artifact.content, {
    headers: {
      "Content-Type": csvTypes.includes(type) ? "text/csv" : "text/plain",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
