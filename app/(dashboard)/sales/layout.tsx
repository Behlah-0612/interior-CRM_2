import { requirePageRole } from "@/lib/guard";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("ADMIN", "SALESPERSON");
  return <>{children}</>;
}
