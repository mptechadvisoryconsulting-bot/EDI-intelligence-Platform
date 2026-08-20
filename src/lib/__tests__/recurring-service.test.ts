import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceRecurringOccurrence,
  parseSupportedRecurrenceRule,
  recurringWorkOrderIdempotencyKey,
} from "@/lib/business/recurring-service";

test("monthly recurrence clamps end-of-month safely", () => {
  const next = advanceRecurringOccurrence(new Date("2026-01-31T15:30:00.000Z"), "monthly");
  assert.equal(next.toISOString(), "2026-02-28T15:30:00.000Z");
});

test("quarterly recurrence preserves time and clamps date", () => {
  const next = advanceRecurringOccurrence(new Date("2026-11-30T09:00:00.000Z"), "quarterly");
  assert.equal(next.toISOString(), "2027-02-28T09:00:00.000Z");
});

test("supported RRULE intervals are deterministic", () => {
  assert.deepEqual(parseSupportedRecurrenceRule("FREQ=WEEKLY;INTERVAL=2"), { unit: "weeks", interval: 2 });
  assert.equal(
    advanceRecurringOccurrence(new Date("2026-08-20T12:00:00.000Z"), "FREQ=WEEKLY;INTERVAL=2").toISOString(),
    "2026-09-03T12:00:00.000Z",
  );
});

test("recurring idempotency key is stable per agreement version and occurrence", () => {
  const occurrence = new Date("2026-08-20T12:00:00.000Z");
  const first = recurringWorkOrderIdempotencyKey({ serviceAgreementId: "agreement_1", scheduleVersion: 3, occurrence });
  const second = recurringWorkOrderIdempotencyKey({ serviceAgreementId: "agreement_1", scheduleVersion: 3, occurrence });
  assert.equal(first, second);
  assert.match(first, /^recurring:agreement_1:v3:/);
});

test("unsupported recurrence rules fail instead of guessing", () => {
  assert.throws(() => parseSupportedRecurrenceRule("every-so-often"), /Unsupported recurrence rule/);
});
