import { TechJobDetail } from "@/components/tech/TechJobDetail";

export const metadata = { title: "Job — Interior Home Services BC" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TechJobDetail id={id} />;
}
