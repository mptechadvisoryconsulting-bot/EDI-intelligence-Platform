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

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAccountContext();
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = stringValue(body.action);

    if (action === "save_checklist") {
      const expectedUpdatedAt = dateValue(body.expectedUpdatedAt);
      if (!expectedUpdatedAt) {
        return NextResponse.json({ error: "Valid expectedUpdatedAt is required" }, { status: 400 });
      }
      const checklist = await saveWorkOrderChecklist({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        checklist: body.checklist,
        expectedUpdatedAt,
      });
      return NextResponse.json({ ok: true, checklist });
    }

    if (action === "add_part") {
      const idempotencyKey = stringValue(body.idempotencyKey);
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
      const part = await addWorkOrderPart({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        idempotencyKey,
        description: stringValue(body.description),
        quantity: numberValue(body.quantity),
        unitPriceMinor: numberValue(body.unitPriceMinor),
        catalogItemId: typeof body.catalogItemId === "string" ? body.catalogItemId : null,
      });
      return NextResponse.json({ ok: true, part });
    }

    if (action === "add_time") {
      const idempotencyKey = stringValue(body.idempotencyKey);
      if (!idempotencyKey) return NextResponse.json({ error: "idempotencyKey is required" }, { status: 400 });
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
        idempotencyKey,
        startedAt,
        endedAt,
        notes: typeof body.notes === "string" ? body.notes : null,
      });
      return NextResponse.json({ ok: true, timeEntry: entry });
    }

    if (action === "capture_signoff") {
      const expectedUpdatedAt = dateValue(body.expectedUpdatedAt);
      if (!expectedUpdatedAt) {
        return NextResponse.json({ error: "Valid expectedUpdatedAt is required" }, { status: 400 });
      }
      const signoff = await captureWorkOrderSignoff({
        accountId: account.accountId,
        workOrderId: id,
        actorUserId: account.user.id,
        membershipRole: account.membershipRole,
        signoff: body.signoff,
        expectedUpdatedAt,
      });
      return NextResponse.json({ ok: true, signoff });
    }

    return NextResponse.json({ error: "Unsupported execution action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update work order execution";
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    if (message.includes("concurrently") || message.includes("locked") || message.includes("Idempotency key was already used")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
    }
    if (message === "Work order not found") return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
