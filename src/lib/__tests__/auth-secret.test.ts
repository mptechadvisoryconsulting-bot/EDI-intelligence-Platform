import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

describe("getAuthSecret", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("uses AUTH_SECRET when set", async () => {
    process.env.AUTH_SECRET = "test-secret-value";
    delete process.env.VERCEL;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    const { getAuthSecret } = await import("../auth-secret");
    const key = getAuthSecret();
    assert.equal(new TextDecoder().decode(key), "test-secret-value");
  });

  it("throws in production without AUTH_SECRET", async () => {
    delete process.env.AUTH_SECRET;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    const { getAuthSecret } = await import("../auth-secret");
    assert.throws(() => getAuthSecret(), /AUTH_SECRET is required/);
  });

  it("falls back to dev secret locally", async () => {
    delete process.env.AUTH_SECRET;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    delete process.env.VERCEL;
    const { getAuthSecret } = await import("../auth-secret");
    const key = getAuthSecret();
    assert.match(new TextDecoder().decode(key), /local-only/);
  });
});
