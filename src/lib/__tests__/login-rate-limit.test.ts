import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkLoginRateLimit, clearLoginRateLimit } from "../login-rate-limit";

describe("login rate limit", () => {
  it("allows attempts under the cap", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const r = checkLoginRateLimit(key);
      assert.equal(r.allowed, true);
    }
    clearLoginRateLimit(key);
  });

  it("blocks after max attempts", () => {
    const key = `block-${Date.now()}`;
    for (let i = 0; i < 10; i++) checkLoginRateLimit(key);
    const blocked = checkLoginRateLimit(key);
    assert.equal(blocked.allowed, false);
    assert.ok((blocked.retryAfterSec ?? 0) > 0);
    clearLoginRateLimit(key);
  });
});
