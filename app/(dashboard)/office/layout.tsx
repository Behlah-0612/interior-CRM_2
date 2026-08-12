import { requirePageRole } from "@/lib/guard";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole("ADMIN", "OFFICE_STAFF");
  return <>{children}</>;
}
