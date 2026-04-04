import { cn } from "@/lib/utils";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  label?: string;            // small uppercase eyebrow
  className?: string;
  children?: React.ReactNode;
}

export function SectionTitle({ title, subtitle, label, className, children }: SectionTitleProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div>
        {label && (
          <div
            className="font-semibold text-slate-600 uppercase mb-1"
            style={{ fontSize: "9.5px", letterSpacing: "0.1em" }}
          >
            {label}
          </div>
        )}
        <h2
          className="font-semibold text-white leading-snug"
          style={{ fontSize: "14px", letterSpacing: "-0.015em" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">{children}</div>
      )}
    </div>
  );
}
