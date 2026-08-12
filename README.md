# Interior Home Services BC — CRM

Internal operations tool for scheduling, quoting, invoicing, crew management, and sales commissions. Built with Next.js 14+ (App Router), PostgreSQL + Prisma, and JWT-based auth with role-based access control.

## Roles

| Role | Access |
|---|---|
| **Admin** | Everything — staff accounts, all customers/jobs, reporting, commission rates & tiers |
| **Office Staff** | Customers, properties, jobs/scheduling, quotes, invoices, crew assignment, assign salesperson to an account |
| **Field Technician** | Their own assigned jobs, mark jobs complete, upload job photos |
| **Salesperson** | Jobs under accounts they sold, revenue sold, estimated commission |

Salesperson attribution lives on the **Customer** ("who sold this account") — every job under that customer rolls up to them for revenue/commission. See `SITE.md` → "Sales & Commissions" for how the commission rate is calculated.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io/) 7 (driver adapters, `prisma.config.ts`)
- **Auth:** JWT (`jose`) in HTTP-only cookies, passwords hashed with `bcryptjs`
- **Validation:** `zod` on every API route
- **Testing:** `vitest`

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up your database.** Create a free PostgreSQL database at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) (or point at any existing Postgres instance).

3. **Configure environment variables.** Copy `.env.example` to `.env` and fill in:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — your Postgres connection string
   - `JWT_SECRET` — a long random value (`openssl rand -base64 32`)

4. **Run migrations and seed the first Admin account:**
   ```bash
   npm run db:migrate
   ```
   This creates the schema and (via the configured seed) creates one Admin account. By default it's `admin@interiorhomeservicesbc.com` / `ChangeMe123!` — **sign in and change this immediately**, or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` env vars before running the seed to choose your own.

5. **Start the dev server** (already running automatically inside Ship Studio):
   ```bash
   npm run dev
   ```

## Useful Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | ESLint |
| `npm test` | Run the test suite (vitest) |
| `npm run db:migrate` | Create/apply a migration (dev) + seed |
| `npm run db:deploy` | Apply pending migrations (production/CI) |
| `npm run db:seed` | Re-run just the seed script |
| `npm run db:studio` | Open Prisma Studio (visual database browser) |

## Deploying

This app is a standard Next.js app and deploys to any Next.js-friendly host (Vercel, Railway, Render, Fly.io, etc.).

1. Set `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production` in your host's environment variables.
2. Run `npm run db:deploy` once (as part of your deploy pipeline, or manually) to apply migrations to the production database.
3. `npm run build && npm start`, or let the host run those for you.
4. Serve over HTTPS — the session cookie is marked `secure` in production, so it will not be sent over plain HTTP. Vercel/Railway/Render all provide HTTPS automatically.

### Health check / uptime monitoring

`GET /api/health` returns `{ status: "ok" }` (200) when the app and database are reachable, or a 503 otherwise. Point an uptime monitor (UptimeRobot, Better Uptime, a host's built-in health check, etc.) at this route. It requires no authentication and reveals no data.

### Error monitoring

Unhandled errors are logged as structured JSON via `lib/logger.ts` (visible in whatever log viewer your host provides). No external error-tracking service (e.g. Sentry) is wired up, since none was configured for this project — to add one, install its SDK and call it from `logger.error()`.

## Known Limitations / Upgrade Paths

- **Job photo storage:** photos are uploaded as base64 and stored directly in the database (see `app/api/uploads/route.ts`). This works fine at small scale but doesn't scale to a large photo library. Swap in real object storage (Vercel Blob, S3, Cloudinary) if photo volume grows.
- **Rate limiting** (`lib/rate-limit.ts`) is in-memory, per server process. Fine for a single-instance deploy; swap for a shared store (Redis/Upstash) if you ever run multiple instances behind a load balancer.

## Project Structure

```
app/
├── layout.tsx                 # Root layout (fonts, metadata)
├── page.tsx                   # Redirects to /login or the signed-in user's dashboard
├── login/                     # Sign-in page
├── (dashboard)/                # Authenticated app shell
│   ├── layout.tsx              #   fetches the signed-in user, renders the nav
│   ├── admin/                  #   Admin-only pages (Overview, Staff)
│   ├── office/                 #   Admin + Office Staff pages (Customers, Jobs, Quotes, Invoices)
│   └── tech/                   #   Admin + Technician pages (My Jobs)
└── api/                        # All backend endpoints (see below)
components/                    # UI components, grouped by feature
lib/                           # Auth, validation, Prisma client, helpers
prisma/                        # schema.prisma, migrations, seed script
```

## Documentation

- **CLAUDE.md** — instructions for Claude Code when working on this project
- **SITE.md** — plain-language project documentation, updated after every change

---

Built with [Claude Code](https://claude.com/claude-code) inside Ship Studio.
