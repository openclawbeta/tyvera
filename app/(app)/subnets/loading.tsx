import { PageSkeleton } from "@/components/ui-custom/page-skeleton";

export default function Loading() {
  return <PageSkeleton title="Subnets" cards={4} showTable />;
}
