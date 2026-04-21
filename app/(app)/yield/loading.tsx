import { PageSkeleton } from "@/components/ui-custom/page-skeleton";

export default function Loading() {
  return <PageSkeleton title="Yield" cards={3} showChart />;
}
