import { NextRequest, NextResponse } from "next/server";
import { requireAccountContext } from "@/lib/account-context";
import { prepareInvoiceFromCompletedWorkOrder } from "@/lib/business/work-order-invoice";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("dueAt must be an ISO date/time string");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error("dueAt must be a valid date/time");
  return parsed;
}

function optionalMinor(value: unknown, field: string) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer in minor currency units`);
  }
  return value;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAccountContext();
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const invoiceNumber = stringValue(body.invoiceNumber);
    if (!invoiceNumber) return NextResponse.json({ error: "invoiceNumber is required" }, { status: 400 });

    const invoice = await prepareInvoiceFromCompletedWorkOrder({
      accountId: account.accountId,
      actorUserId: account.user.id,
      workOrderId: id,
      invoiceNumber,
      dueAt: optionalDate(body.dueAt),
      currency: stringValue(body.currency) || undefined,
      notes: typeof body.notes === "string" ? body.notes : null,
      taxTotalMinor: optionalMinor(body.taxTotalMinor, "taxTotalMinor"),
      laborRateMinorPerHour: body.laborRateMinorPerHour == null
        ? null
        : optionalMinor(body.laborRateMinorPerHour, "laborRateMinorPerHour"),
      laborDescription: typeof body.laborDescription === "string" ? body.laborDescription : null,
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare invoice";
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
    }
    if (message === "Work order not found") return NextResponse.json({ error: message }, { status: 404 });
    if (message.includes("already linked") || message.includes("already used") || message.includes("different source")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
