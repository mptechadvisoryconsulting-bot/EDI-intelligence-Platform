import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPropertySiteProfileAccount,
  validatePropertySiteProfile,
} from "@/lib/business/property-site-profile";

test("validates and normalizes an additive property site profile", () => {
  const profile = validatePropertySiteProfile({
    id: "  property-1  ",
    accountId: "acct-1",
    customerId: "customer-1",
    serviceLocationId: "location-1",
    propertyType: "commercial",
    verifiedAddress: "  100 Main Street  ",
    siteNotes: "  Use east entrance  ",
    zones: [
      { id: "building-a", name: "Building A" },
      { id: "dock", name: "Loading Dock", parentId: " building-a " },
    ],
    representativeEvidenceIds: ["evidence-before", "evidence-after"],
  });

  assert.equal(profile.id, "property-1");
  assert.equal(profile.verifiedAddress, "100 Main Street");
  assert.equal(profile.siteNotes, "Use east entrance");
  assert.equal(profile.zones[1].parentId, "building-a");
  assert.deepEqual(profile.representativeEvidenceIds, ["evidence-before", "evidence-after"]);
});

test("keeps enrichment optional for existing service locations", () => {
  const profile = validatePropertySiteProfile({
    id: "property-2",
    accountId: "acct-1",
    customerId: "customer-1",
    serviceLocationId: "location-existing",
    propertyType: "residential",
  });

  assert.equal(profile.verifiedAddress, null);
  assert.deepEqual(profile.zones, []);
  assert.deepEqual(profile.representativeEvidenceIds, []);
});

test("fails closed on missing canonical linkage", () => {
  assert.throws(
    () => validatePropertySiteProfile({
      id: "property-3",
      accountId: " ",
      customerId: "customer-1",
      serviceLocationId: "location-1",
      propertyType: "residential",
    }),
    /account id is required/,
  );

  assert.throws(
    () => validatePropertySiteProfile({
      id: "property-3",
      accountId: "acct-1",
      customerId: "customer-1",
      serviceLocationId: " ",
      propertyType: "residential",
    }),
    /service location id is required/,
  );
});

test("rejects duplicate representative evidence references", () => {
  assert.throws(
    () => validatePropertySiteProfile({
      id: "property-4",
      accountId: "acct-1",
      customerId: "customer-1",
      serviceLocationId: "location-1",
      propertyType: "commercial",
      representativeEvidenceIds: [" evidence-1 ", "evidence-1"],
    }),
    /cannot contain duplicates/,
  );
});

test("rejects cross-account use of an otherwise valid profile", () => {
  const profile = validatePropertySiteProfile({
    id: "property-5",
    accountId: "acct-1",
    customerId: "customer-1",
    serviceLocationId: "location-1",
    propertyType: "residential",
  });

  assert.equal(assertPropertySiteProfileAccount(profile, "acct-1"), profile);
  assert.throws(
    () => assertPropertySiteProfileAccount(profile, "acct-2"),
    /does not belong to the authenticated account/,
  );
});
