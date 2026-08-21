import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAuthoritativePropertyEvidence,
  mayUseAsAuthoritativePropertyEvidence,
  validatePropertyImageDescriptor,
  validatePropertyType,
  validatePropertyZones,
} from "@/lib/business/property-intelligence";

test("accepts governed residential and commercial property types only", () => {
  assert.equal(validatePropertyType("residential"), "residential");
  assert.equal(validatePropertyType("commercial"), "commercial");
  assert.throws(() => validatePropertyType("warehouse-script"), /residential or commercial/);
});

test("validates bounded property zone hierarchy and rejects duplicates, missing parents, and cycles", () => {
  const zones = [
    { id: "building-a", name: "Building A" },
    { id: "loading-dock", name: "Loading Dock", parentId: "building-a" },
  ];

  assert.equal(validatePropertyZones(zones), zones);
  assert.throws(
    () => validatePropertyZones([{ id: "yard", name: "Front Yard" }, { id: "yard", name: "Back Yard" }]),
    /Duplicate property zone id/,
  );
  assert.throws(
    () => validatePropertyZones([{ id: "unit-3", name: "HVAC Unit 3", parentId: "roof" }]),
    /Unknown property zone parent/,
  );
  assert.throws(
    () => validatePropertyZones([
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ]),
    /cannot contain cycles/,
  );
});

test("canonicalizes parent ids before relationship and cycle validation", () => {
  const zones = [
    { id: "building-a", name: "Building A" },
    { id: "loading-dock", name: "Loading Dock", parentId: "  building-a  " },
  ];

  validatePropertyZones(zones);
  assert.equal(zones[1].parentId, "building-a");

  assert.throws(
    () =>
      validatePropertyZones([
        { id: "a", name: "A", parentId: "  b  " },
        { id: "b", name: "B", parentId: " a " },
      ]),
    /cannot contain cycles/,
  );
});

test("requires provider provenance for licensed address imagery", () => {
  assert.doesNotThrow(() =>
    validatePropertyImageDescriptor({
      source: "licensed_provider",
      providerName: "Example Provider",
      sourceReference: "provider-image-123",
      attribution: "Provider attribution",
      sourceDate: "2026-08-01",
    }),
  );

  assert.throws(
    () => validatePropertyImageDescriptor({ source: "licensed_provider", sourceReference: "image-123" }),
    /requires provider metadata/,
  );
  assert.throws(
    () => validatePropertyImageDescriptor({ source: "licensed_provider", providerName: "Example Provider" }),
    /requires a source reference/,
  );
});

test("generated property representations can never become authoritative inspection evidence", () => {
  const uploaded = { source: "uploaded" as const, sourceReference: "evidence-1" };
  const generated = { source: "generated_representation" as const, sourceReference: "render-1" };

  assert.equal(mayUseAsAuthoritativePropertyEvidence(uploaded), true);
  assert.equal(mayUseAsAuthoritativePropertyEvidence(generated), false);
  assert.equal(assertAuthoritativePropertyEvidence(uploaded), uploaded);
  assert.throws(() => assertAuthoritativePropertyEvidence(generated), /cannot be used as authoritative/);
});
