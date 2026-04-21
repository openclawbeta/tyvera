"use client";

import { PageError } from "@/components/ui-custom/page-error";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageError error={error} reset={reset} pageName="Settings" />;
}
