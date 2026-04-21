import { PageSkeleton } from "@/components/ui-custom/page-skeleton";

export default function Loading() {
  return <PageSkeleton title="Recommendations" cards={3} showTable />;
}
