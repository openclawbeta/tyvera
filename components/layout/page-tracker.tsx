"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics/tracker";

/**
 * Tracks page views on route changes. Mount once in the app layout.
 */
export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname ?? undefined);
  }, [pathname]);

  return null;
}
