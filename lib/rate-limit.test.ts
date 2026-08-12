import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    const fourth = rateLimit(key, 3, 60_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test:${Math.random()}`;
    const keyB = `test:${Math.random()}`;
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("resets once the window passes", async () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 1, 10).allowed).toBe(true);
    expect(rateLimit(key, 1, 10).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(rateLimit(key, 1, 10).allowed).toBe(true);
  });
});
