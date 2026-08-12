import { CustomerDetail } from "@/components/customers/CustomerDetail";

export const metadata = { title: "Customer — Interior Home Services BC" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
