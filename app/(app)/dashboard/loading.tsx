import { PageSkeleton } from "@/components/ui-custom/page-skeleton";

export default function Loading() {
  return <PageSkeleton title="Dashboard" cards={4} showChart />;
}
