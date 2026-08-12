// Central place for the Zod schemas used to validate API request bodies.
import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "OFFICE_STAFF", "TECHNICIAN", "SALESPERSON"]);

// ── Users (admin-managed staff accounts) ─────────────────────────────
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required.").max(200),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().max(30).optional().nullable(),
  role: roleSchema,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional().nullable(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  // Salesperson manual commission rate, in basis points (1000 = 10.00%).
  commissionRateBps: z.number().int().min(0).max(10000).optional().nullable(),
});

// ── Customers ─────────────────────────────────────────────────────────
export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required.").max(200),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  // Which salesperson sold this account (optional — not every customer
  // comes through a salesperson).
  soldById: z.string().optional().nullable(),
});

// ── Properties ────────────────────────────────────────────────────────
export const propertySchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  label: z.string().min(1, "Give this property a label.").max(200),
  addressLine: z.string().min(1, "Street address is required.").max(300),
  city: z.string().min(1, "City is required.").max(120),
  province: z.string().min(1).max(60).default("BC"),
  postalCode: z.string().max(20).optional().nullable(),
  accessNotes: z.string().max(2000).optional().nullable(),
});

// ── Jobs ──────────────────────────────────────────────────────────────
export const jobStatusSchema = z.enum([
  "UNSCHEDULED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const createJobSchema = z.object({
  propertyId: z.string().min(1, "Property is required."),
  title: z.string().min(1, "Give the job a title.").max(200),
  description: z.string().max(4000).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  technicianIds: z.array(z.string()).optional().default([]),
});

// What a Technician is allowed to change on a job they're assigned to —
// just the status, and only forward to in-progress/complete.
export const technicianJobUpdateSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
});

export const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  status: jobStatusSchema.optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  technicianIds: z.array(z.string()).optional(),
});

// ── Job photos ────────────────────────────────────────────────────────
export const createJobPhotoSchema = z.object({
  url: z.string().url("Photo URL must be a valid URL."),
  caption: z.string().max(500).optional().nullable(),
});

// ── Quotes ────────────────────────────────────────────────────────────
export const quoteStatusSchema = z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"]);

export const lineItemSchema = z.object({
  description: z.string().min(1, "Line item needs a description.").max(300),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().nonnegative(),
});

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  notes: z.string().max(2000).optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item."),
});

export const updateQuoteSchema = z.object({
  status: quoteStatusSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

// ── Invoices ──────────────────────────────────────────────────────────
export const invoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]);

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  jobId: z.string().optional().nullable(),
  quoteId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item."),
});

export const updateInvoiceSchema = z.object({
  status: invoiceStatusSchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

// ── Pagination / query params (used with .parse on a plain object built
//    from URLSearchParams) ─────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

// ── Commission tiers (admin-managed automatic rate breakpoints) ────────
export const commissionTierSchema = z.object({
  name: z.string().min(1, "Give this tier a name.").max(100),
  minRevenueCents: z.number().int().nonnegative(),
  rateBps: z.number().int().min(0).max(10000),
  active: z.boolean().optional().default(true),
});

export const updateCommissionTierSchema = commissionTierSchema.partial();
