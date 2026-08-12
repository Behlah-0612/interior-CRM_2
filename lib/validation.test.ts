import { describe, it, expect } from "vitest";
import { createUserSchema, customerSchema, createJobSchema, lineItemSchema } from "./validation";

describe("createUserSchema", () => {
  it("accepts a valid staff account", () => {
    const result = createUserSchema.safeParse({
      name: "Jamie Lee",
      email: "jamie@example.com",
      role: "OFFICE_STAFF",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = createUserSchema.safeParse({
      name: "Jamie Lee",
      email: "jamie@example.com",
      role: "OFFICE_STAFF",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const result = createUserSchema.safeParse({
      name: "Jamie Lee",
      email: "jamie@example.com",
      role: "SUPERUSER",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });
});

describe("customerSchema", () => {
  it("requires a name", () => {
    expect(customerSchema.safeParse({ name: "" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "Pat Smith" }).success).toBe(true);
  });
});

describe("createJobSchema", () => {
  it("requires propertyId and title", () => {
    expect(createJobSchema.safeParse({ propertyId: "p1", title: "Window clean" }).success).toBe(true);
    expect(createJobSchema.safeParse({ title: "Window clean" }).success).toBe(false);
    expect(createJobSchema.safeParse({ propertyId: "p1" }).success).toBe(false);
  });

  it("defaults technicianIds to an empty array", () => {
    const result = createJobSchema.parse({ propertyId: "p1", title: "Window clean" });
    expect(result.technicianIds).toEqual([]);
  });
});

describe("lineItemSchema", () => {
  it("rejects a negative unit price", () => {
    const result = lineItemSchema.safeParse({ description: "Widget", quantity: 1, unitPriceCents: -100 });
    expect(result.success).toBe(false);
  });

  it("defaults quantity to 1", () => {
    const result = lineItemSchema.parse({ description: "Widget", unitPriceCents: 500 });
    expect(result.quantity).toBe(1);
  });
});
