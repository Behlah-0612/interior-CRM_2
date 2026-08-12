import { QuoteDetail } from "@/components/quotes/QuoteDetail";

export const metadata = { title: "Quote — Interior Home Services BC" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} />;
}
