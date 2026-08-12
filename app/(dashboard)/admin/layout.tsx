import { requirePageRole } from "@/lib/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("ADMIN");
  return <>{children}</>;
}
