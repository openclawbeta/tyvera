import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div>
        <h1
          className="font-bold text-white"
          style={{ fontSize: "20px", letterSpacing: "-0.025em", lineHeight: 1.2 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-slate-500 leading-snug">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
