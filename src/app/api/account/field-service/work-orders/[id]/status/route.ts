import { NextRequest, NextResponse } from "next/server";
import { requireAccountContext } from "@/lib/account-context";
import { db } from "@/lib/db";
import {
  assertCanViewWorkOrder,
  assertTechnicianStatusChangeAllowed,
} from "@/lib/business/field-service-access";
import { transitionWorkOrderStatus } from "@/lib/business/workflow-service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAccountContext();
    const { id } = await context.params;
    const body = (await request.json()) as { nextStatus?: unknown };
    const nextStatus = typeof body.nextStatus === "string" ? body.nextStatus.trim() : "";
    if (!nextStatus) {
      return NextResponse.json({ error: "nextStatus is required" }, { status: 400 });
    }

    const workOrder = await db.workOrder.findFirst({
      where: { id, accountId: account.accountId },
      select: { id: true, status: true, assignedUserId: true },
    });
    if (!workOrder) return NextResponse.json({ error: "Work order not found" }, { status: 404 });

    assertCanViewWorkOrder(account.membershipRole, account.user.id, workOrder.assignedUserId);
    assertTechnicianStatusChangeAllowed(account.membershipRole, workOrder.status, nextStatus);

    const updated = await transitionWorkOrderStatus({
      accountId: account.accountId,
      workOrderId: workOrder.id,
      nextStatus,
      actorUserId: account.user.id,
    });

    return NextResponse.json({ ok: true, workOrder: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update work order";
    if (message === "Forbidden" || message.includes("cannot perform")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.startsWith("Invalid work_order transition") || message.includes("concurrently")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized — please sign in again" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
