"use client";

import { type LucideIcon, Inbox } from "lucide-react";

/**
 * Reusable empty state for pages/sections with no data.
 *
 * Usage:
 *   <EmptyState
 *     icon={Activity}
 *     title="No activity yet"
 *     description="Transaction history will appear here once chain events are recorded."
 *   />
 */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: "rgba(148,163,184,0.06)",
          border: "1px solid rgba(148,163,184,0.12)",
        }}
      >
        <Icon className="h-6 w-6 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.08]"
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.08]"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
