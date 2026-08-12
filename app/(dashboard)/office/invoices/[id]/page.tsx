import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export const metadata = { title: "Invoice — Interior Home Services BC" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
