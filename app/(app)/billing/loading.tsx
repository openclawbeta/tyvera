import { PageSkeleton } from "@/components/ui-custom/page-skeleton";

export default function Loading() {
  return <PageSkeleton title="Billing" cards={3} showTable />;
}
