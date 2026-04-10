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
    <div className={cn("mb-8 border-b border-white/6 pb-6", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Tyvera Workspace</div>
          <h1 className="text-[32px] font-semibold leading-[1.02] tracking-[-0.035em] text-white lg:text-[42px]">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 lg:text-[15px]">{subtitle}</p> : null}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
