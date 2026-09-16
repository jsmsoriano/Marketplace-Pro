import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, resetRateLimits } from "./rate-limit";

describe("allowRequest", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows up to max requests in the window", () => {
    expect(allowRequest("k", 2, 60_000, 1_000)).toBe(true);
    expect(allowRequest("k", 2, 60_000, 1_001)).toBe(true);
    expect(allowRequest("k", 2, 60_000, 1_002)).toBe(false);
  });

  it("resets after the window elapses", () => {
    expect(allowRequest("k", 1, 100, 0)).toBe(true);
    expect(allowRequest("k", 1, 100, 50)).toBe(false);
    expect(allowRequest("k", 1, 100, 100)).toBe(true);
  });
});
