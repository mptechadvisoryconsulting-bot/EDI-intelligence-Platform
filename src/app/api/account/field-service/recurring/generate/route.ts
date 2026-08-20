import { NextRequest, NextResponse } from "next/server";
import { requireAccountContext } from "@/lib/account-context";
import { generateNextRecurringWorkOrder } from "@/lib/business/recurring-service";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(value: unknown) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function POST(request: NextRequest) {
  try {
    const account = await requireAccountContext();
    const body = (await request.json()) as Record<string, unknown>;
    const serviceAgreementId = stringValue(body.serviceAgreementId);
    if (!serviceAgreementId) {
      return NextResponse.json({ error: "serviceAgreementId is required" }, { status: 400 });
    }

    const throughDate = optionalDate(body.throughDate);
    if (throughDate === null) {
      return NextResponse.json({ error: "throughDate must be a valid date" }, { status: 400 });
    }

    const result = await generateNextRecurringWorkOrder({
      accountId: account.accountId,
      actorUserId: account.user.id,
      membershipRole: account.membershipRole,
      serviceAgreementId,
      throughDate,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate recurring work";
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    if (message.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
    if (message === "Service agreement not found") return NextResponse.json({ error: message }, { status: 404 });
    if (message.includes("concurrently")) return NextResponse.json({ error: message }, { status: 409 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
