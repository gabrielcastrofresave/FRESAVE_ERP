import { ReactNode } from "react";

interface ResponsiveFormGridProps {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function ResponsiveFormGrid({ children, columns = 2, className = "" }: ResponsiveFormGridProps) {
  const gridClass = columns === 1 ? "grid grid-cols-1" : "grid grid-cols-1 sm:grid-cols-2";
  return <div className={`${gridClass} gap-4 ${className}`}>{children}</div>;
}
