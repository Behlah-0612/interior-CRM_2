import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "./auth";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-please-do-not-use-in-real-life";
});

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toBe("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("signSession / verifySession", () => {
  const payload = { sub: "user_123", role: "ADMIN" as const, name: "Ada", email: "ada@example.com" };

  it("round-trips a valid session token", async () => {
    const token = await signSession(payload);
    const result = await verifySession(token);
    expect(result).toEqual(payload);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(payload);
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifySession(tampered)).resolves.toBeNull();
  });

  it("rejects garbage input", async () => {
    await expect(verifySession("not-a-real-token")).resolves.toBeNull();
  });
});
