import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Tyvera Workspace</div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="mt-3 max-w-3xl text-sm lg:text-base text-slate-400 leading-relaxed">{subtitle}</p>}
      </div>
      {children ? <div className="flex items-center gap-2 flex-wrap">{children}</div> : null}
    </div>
  );
}
