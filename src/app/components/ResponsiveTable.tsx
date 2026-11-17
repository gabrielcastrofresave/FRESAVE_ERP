import { ReactNode } from "react";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = "" }: ResponsiveTableProps) {
  return (
    <div className={`table-responsive rounded-xl border border-border bg-card ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden rounded-xl">{children}</div>
      </div>
    </div>
  );
}
