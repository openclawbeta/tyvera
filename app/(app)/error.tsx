"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log to an error reporting service
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl font-bold">!</span>
      </div>
      <h2 className="text-lg font-semibold text-slate-100 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-slate-400 mb-6 max-w-md">
        An unexpected error occurred. This has been noted and we&apos;re working on a fix.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
