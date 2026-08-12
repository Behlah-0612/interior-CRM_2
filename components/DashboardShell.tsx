import Link from "next/link";
import type { Role } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

interface NavItem {
  label: string;
  href: string;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Overview", href: "/admin" },
    { label: "Staff", href: "/admin/staff" },
    { label: "Commissions", href: "/admin/sales" },
    { label: "Customers", href: "/office/customers" },
    { label: "Jobs", href: "/office/jobs" },
    { label: "Quotes", href: "/office/quotes" },
    { label: "Invoices", href: "/office/invoices" },
  ],
  OFFICE_STAFF: [
    { label: "Customers", href: "/office/customers" },
    { label: "Jobs", href: "/office/jobs" },
    { label: "Quotes", href: "/office/quotes" },
    { label: "Invoices", href: "/office/invoices" },
  ],
  TECHNICIAN: [{ label: "My Jobs", href: "/tech" }],
  SALESPERSON: [{ label: "My Sales", href: "/sales" }],
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  OFFICE_STAFF: "Office Staff",
  TECHNICIAN: "Field Technician",
  SALESPERSON: "Salesperson",
};

export function DashboardShell({
  user,
  children,
}: {
  user: { name: string; role: Role };
  children: React.ReactNode;
}) {
  const nav = NAV_BY_ROLE[user.role];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar — desktop */}
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          <div className="border-b border-border px-6 py-5">
            <p className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
              Interior Home Services BC
            </p>
            <p className="mt-0.5 text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-border/40 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6">
            <div className="lg:hidden">
              <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground">
                Interior Home Services BC
              </p>
              <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
            <div className="hidden text-sm text-muted lg:block">Signed in as</div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm font-medium text-foreground sm:inline">{user.name}</span>
              <LogoutButton />
            </div>
          </header>

          {/* Mobile nav — horizontal scroll */}
          <nav className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-foreground/80 transition hover:bg-border/40 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
