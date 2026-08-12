# Interior Home Services BC

> Internal CRM for scheduling, quoting, and managing window cleaning jobs.

## What This Project Is

This is **not a public marketing website** — it's an internal business tool (a CRM) used by the company's own staff to run day-to-day operations: tracking customers and properties, scheduling jobs, sending quotes and invoices, assigning crews, and letting field technicians check off completed work and upload photos from their phone.

**Primary Goal:** Run daily operations (scheduling, quoting, invoicing, crew management, sales commissions) in one place.
**Who Uses It:** Company staff only, in four roles. Customers do not log in.

## Brand Identity

- **Personality:** Professional, no-nonsense — legible and low-fatigue for daily use, not flashy
- **Colors:** Off-white background (`#FAFAF9`) / off-black text (`#1C1917`) with a deep teal accent (`#0E6E64`, brighter teal `#2DD4C2` in dark mode). Status badges use green/amber/red/blue for success/warning/danger/info.
- **Fonts:** Space Grotesk (headings) + DM Sans (body) — already set up in `app/layout.tsx`

## Roles & Access

| Role | Can Do |
|---|---|
| **Admin** | Everything — manage staff accounts, all customers/jobs, full reporting, commission rates & tiers |
| **Office Staff** | Manage customers, properties, jobs/scheduling, quotes, invoices, assign crews, assign salesperson to an account |
| **Field Technician** | View their own assigned jobs, see job/property details, mark jobs complete, upload job photos |
| **Salesperson** | View jobs under accounts they sold, their revenue sold and estimated commission |

Enforced two ways: `proxy.ts` (formerly "middleware") redirects people away from pages they can't use, and every API route independently re-checks the role before touching data.

## Site Structure (Pages)

- **`/login`** — sign in
- **`/`** — redirects to the signed-in user's dashboard (or `/login`)
- **`/admin`** — stats overview (jobs today, unpaid invoices, pending quotes, etc.)
- **`/admin/staff`** — create/deactivate staff accounts, assign roles
- **`/office/customers`**, **`/office/customers/[id]`** — customer list/detail, properties
- **`/office/jobs`**, **`/office/jobs/[id]`** — job scheduling, crew assignment, status, photos
- **`/office/quotes`**, **`/office/quotes/[id]`** — quotes with line items, convert accepted quote → invoice
- **`/office/invoices`**, **`/office/invoices/[id]`** — invoices with line items, mark paid
- **`/tech`** — "My Jobs" (auto-filtered to jobs assigned to the signed-in technician)
- **`/tech/jobs/[id]`** — job detail, Start/Complete buttons, camera photo upload
- **`/sales`** — "My Sales" (auto-filtered to jobs under accounts the signed-in salesperson sold), revenue sold, current commission rate, estimated commission, progress toward the next tier
- **`/admin/sales`** — commission management: each salesperson's revenue/rate/commission, editable manual rate per person, and the shared commission tier list (add/edit/deactivate/delete)

Admins can also visit every `/office/*` and `/tech/*` page (the nav for Admins includes direct links to Customers/Jobs/Quotes/Invoices).

## Sales & Commissions

- **Attribution lives on the Customer** ("the account"), not the job — office/admin picks a **Salesperson** when creating or editing a customer (Customers page → "Salesperson who sold this account"). Every job under that customer's properties automatically counts toward that salesperson's revenue and commission.
- **Revenue sold** = the sum of the agreed price (`priceCents`) of every non-cancelled job under that salesperson's accounts, all-time.
- **Commission rate** = a manual per-salesperson rate (admin sets this on `/admin/sales`), **unless** an active commission tier's revenue threshold has been reached — then that tier's rate is used instead of the manual rate. The highest threshold a salesperson qualifies for wins; it is not a marginal/bracketed calculation (e.g. crossing into a 15% tier makes *all* their revenue count at 15%, not just the portion above the threshold).
- **Commission tiers** are shared across all salespeople and managed entirely by Admin on `/admin/sales` (name, revenue threshold, rate, active/inactive).
- Estimated commission = current effective rate × total revenue sold. This is a live estimate recalculated from current data — it is not a locked-in historical ledger of what was actually paid out.

## How It's Built

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 — one app, no separate backend server (API routes live under `app/api/*`)
- **Database:** PostgreSQL via Prisma ORM 7. Schema: `User`, `Customer` (has `soldById`), `Property`, `Job`, `JobAssignment` (crew), `JobPhoto`, `Quote`/`QuoteLineItem`, `Invoice`/`InvoiceLineItem`, `CommissionTier`, `AuditLog`
- **Auth:** JWT session in an HTTP-only cookie (`jose`), passwords hashed with `bcryptjs`, 12-hour sessions
- **Validation:** every API route validates its input with `zod`
- **Security:** login rate-limited (5 attempts / 5 min per IP), upload rate-limited (30 / 10 min per user), security headers set in `next.config.ts`, audit log of login attempts, generic "email or password isn't right" errors (doesn't reveal which one was wrong), deactivating a staff account (or changing their role) revokes their access immediately — every request re-checks `active`/`role` against the database rather than trusting the session token alone (see `lib/session.ts`)
- **Testing:** `vitest` unit tests for auth, validation, rate limiting, and money math (`npm test`)
- **Logging/monitoring:** structured JSON logs (`lib/logger.ts`), `GET /api/health` for uptime monitoring

## Content Status

- [x] Business name confirmed: Interior Home Services BC
- [x] All code written, typechecked, linted, and building cleanly
- [x] **Database connected** — live Supabase Postgres, migrated and seeded
- [ ] Logo: using text-only branding for now
- [x] Staff accounts: first Admin account created (`admin@interiorhomeservicesbc.com`, temporary password — change it in the app, see below)

## Known Limitations (documented in README.md too)

- **Job photos** are stored as base64 directly in the database (no cloud storage configured). Fine at small scale; swap in real object storage (S3/Vercel Blob/Cloudinary) if photo volume grows.
- **Rate limiting** is in-memory per server process — fine for a single-instance deploy, would need a shared store (Redis) if this app ever runs on multiple server instances at once.

## How to Customize

- **Colors:** edit the CSS variables in `app/globals.css` (`--accent`, `--background`, etc.)
- **Add a page:** create `app/(dashboard)/office/newthing/page.tsx` (or under `admin`/`tech`) and add a link in `components/DashboardShell.tsx`
- **Add a field to the database:** edit `prisma/schema.prisma`, then run `npm run db:migrate`
- **Change what a role can access:** edit `PROTECTED_PREFIXES` in `proxy.ts` and the `requireRole(...)` calls in the relevant API routes

## Recent Changes
- 2026-08-12: Added the Salesperson role, sales/commission tracking, and an admin Commissions page. See "Sales & Commissions" above. **Requires restarting the preview** (Projects → reopen project) so the running server picks up the updated database schema/client.
- 2026-08-11: Connected to a live Supabase Postgres database, ran the first migration, and seeded the first Admin account. The app is fully working end-to-end.
- 2026-08-11: Full build completed — database schema, JWT auth with role-based access control, all CRUD API routes (customers, properties, jobs, quotes, invoices, staff, job photos), Admin/Office/Technician dashboards, security hardening, tests, logging, and deploy documentation.
- 2026-08-10: Project scoped and onboarded.

---

*This file is your site's source of truth. Claude updates it after every change.*
