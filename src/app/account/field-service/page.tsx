import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FieldServiceToday } from "@/components/field-service-today";
import { getSession } from "@/lib/auth";
import { requireAccountContext } from "@/lib/account-context";
import { db } from "@/lib/db";
import { assertRoleCapability } from "@/lib/business/canonical-validation";
import {
  normalizeFieldServiceRole,
  technicianAllowedNextStatuses,
} from "@/lib/business/field-service-access";
import { allowedTransitions } from "@/lib/business/workflow";

const CLOSED_STATUSES = ["closed", "cancelled"];

export default async function FieldServicePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const account = await requireAccountContext();
  let canUseFieldService = true;
  try {
    assertRoleCapability(account.membershipRole, "field_service");
  } catch {
    canUseFieldService = false;
  }

  if (!canUseFieldService) {
    return (
      <AppShell user={session}>
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <h1 className="text-2xl font-semibold text-white">Field Service</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Your current account role does not include field-service access.</p>
        </div>
      </AppShell>
    );
  }

  const role = normalizeFieldServiceRole(account.membershipRole);
  const technician = role === "field_technician";
  const workOrders = await db.workOrder.findMany({
    where: {
      accountId: account.accountId,
      status: { notIn: CLOSED_STATUSES },
      ...(technician ? { assignedUserId: account.user.id } : {}),
    },
    include: { customer: { select: { displayName: true } } },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  const jobs = workOrders.map((job) => ({
    id: job.id,
    workOrderNumber: job.workOrderNumber,
    serviceType: job.serviceType,
    status: job.status,
    serviceAddress: job.serviceAddress,
    scheduledStart: job.scheduledStart?.toISOString() ?? null,
    scheduledEnd: job.scheduledEnd?.toISOString() ?? null,
    arrivalWindow: job.arrivalWindow,
    customerName: job.customer.displayName,
    allowedNextStatuses: technician
      ? [...technicianAllowedNextStatuses(job.status)]
      : [...allowedTransitions("work_order", job.status)],
  }));

  return (
    <AppShell user={session}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Operations</p>
            <h1 className="mt-1 text-2xl font-semibold ai-gradient-text">Field Service</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              {technician
                ? "Your assigned work only. Update job progress without exposing unrelated account administration or financial data."
                : "Review active field work, schedule progress, and governed status transitions across this account."}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <span className="font-semibold text-white">{jobs.length}</span> active job{jobs.length === 1 ? "" : "s"}
          </div>
        </div>
        <FieldServiceToday initialJobs={jobs} />
      </div>
    </AppShell>
  );
}
