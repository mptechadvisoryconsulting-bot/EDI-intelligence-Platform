export type WorkflowKind = "product_order" | "service_order" | "work_order" | "invoice";

const TRANSITIONS: Record<WorkflowKind, Record<string, readonly string[]>> = {
  product_order: {
    requested: ["confirmed", "cancelled"],
    confirmed: ["picking", "backordered", "cancelled"],
    backordered: ["confirmed", "cancelled"],
    picking: ["packed", "partially_fulfilled", "backordered", "cancelled"],
    partially_fulfilled: ["picking", "packed", "shipped", "cancelled"],
    packed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: ["invoiced", "closed"],
    invoiced: ["closed"],
    closed: [],
    cancelled: [],
  },
  service_order: {
    requested: ["reviewed", "confirmed", "cancelled"],
    reviewed: ["confirmed", "on_hold", "cancelled"],
    confirmed: ["scheduled", "on_hold", "cancelled"],
    scheduled: ["in_progress", "rescheduled", "no_show", "cancelled"],
    rescheduled: ["scheduled", "cancelled"],
    no_show: ["rescheduled", "cancelled", "closed"],
    on_hold: ["confirmed", "scheduled", "cancelled"],
    in_progress: ["completed", "on_hold"],
    completed: ["invoiced", "closed"],
    invoiced: ["closed"],
    closed: [],
    cancelled: [],
  },
  work_order: {
    requested: ["scheduled", "cancelled"],
    scheduled: ["dispatched", "in_progress", "rescheduled", "no_show", "cancelled"],
    dispatched: ["in_progress", "rescheduled", "cancelled"],
    rescheduled: ["scheduled", "cancelled"],
    no_show: ["rescheduled", "cancelled", "closed"],
    in_progress: ["completion_review", "on_hold"],
    on_hold: ["scheduled", "in_progress", "cancelled"],
    completion_review: ["completed", "in_progress"],
    completed: ["invoiced", "closed"],
    invoiced: ["closed"],
    closed: [],
    cancelled: [],
  },
  invoice: {
    draft: ["finalized", "void"],
    finalized: ["sent", "void"],
    sent: ["partially_paid", "paid", "past_due", "void"],
    partially_paid: ["paid", "past_due", "void"],
    past_due: ["partially_paid", "paid", "void"],
    paid: [],
    void: [],
  },
};

/** Return the governed next statuses for a platform workflow state. */
export function allowedTransitions(kind: WorkflowKind, currentStatus: string): readonly string[] {
  return TRANSITIONS[kind][currentStatus] ?? [];
}

/** Guard against arbitrary or out-of-order state changes. */
export function canTransition(kind: WorkflowKind, currentStatus: string, nextStatus: string): boolean {
  return allowedTransitions(kind, currentStatus).includes(nextStatus);
}

/** Throw before persisting an invalid state change. */
export function assertWorkflowTransition(kind: WorkflowKind, currentStatus: string, nextStatus: string) {
  if (!canTransition(kind, currentStatus, nextStatus)) {
    throw new Error(`Invalid ${kind} transition: ${currentStatus} -> ${nextStatus}`);
  }
}
