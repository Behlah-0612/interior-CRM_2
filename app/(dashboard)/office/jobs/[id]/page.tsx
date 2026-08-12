import { JobDetail } from "@/components/jobs/JobDetail";

export const metadata = { title: "Job — Interior Home Services BC" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetail id={id} />;
}
