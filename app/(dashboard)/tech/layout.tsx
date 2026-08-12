import { requirePageRole } from "@/lib/guard";

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("ADMIN", "TECHNICIAN");
  return <>{children}</>;
}
