import { NextRequest, NextResponse } from "next/server";
import { requireAccountContext } from "@/lib/account-context";
import {
  addWorkOrderPart,
  addWorkTimeEntry,
  captureWorkOrderSignoff,
  saveWorkOrderChecklist,
} from "@/lib/business/field-service-execution";

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number.NaN;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAccountContext();
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (action === "save_checklist") {
      const checklist = await saveWorkOrderChecklist({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        checklist: body.checklist,
      });
      return NextResponse.json({ ok: true, checklist });
    }

    if (action === "add_part") {
      const part = await addWorkOrderPart({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        description: typeof body.description === "string" ? body.description : "",
        quantity: numberValue(body.quantity),
        unitPriceMinor: numberValue(body.unitPriceMinor),
        catalogItemId: typeof body.catalogItemId === "string" ? body.catalogItemId : null,
      });
      return NextResponse.json({ ok: true, part });
    }

    if (action === "add_time") {
      const startedAt = dateValue(body.startedAt);
      const endedAt = body.endedAt == null ? null : dateValue(body.endedAt);
      if (!startedAt || (body.endedAt != null && !endedAt)) {
        return NextResponse.json({ error: "Valid startedAt/endedAt values are required" }, { status: 400 });
      }
      const entry = await addWorkTimeEntry({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        startedAt,
        endedAt,
        notes: typeof body.notes === "string" ? body.notes : null,
      });
      return NextResponse.json({ ok: true, timeEntry: entry });
    }

    if (action === "capture_signoff") {
      const signoff = await captureWorkOrderSignoff({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        signoff: body.signoff,
      });
      return NextResponse.json({ ok: true, signoff });
    }

    return NextResponse.json({ error: "Unsupported execution action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update work order execution";
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    if (message.includes("concurrently") || message.includes("locked")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
    }
    if (message === "Work order not found") return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
