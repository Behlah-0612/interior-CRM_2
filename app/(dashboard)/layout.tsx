import { requirePageUser } from "@/lib/guard";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
