import { ReactNode } from "react";

interface ResponsiveFormGridProps {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}

/**
 * Grid responsivo para formulários
 * - Mobile: 1 coluna
 * - Tablet+: número de colunas especificado (padrão: 2)
 */
export function ResponsiveFormGrid({ 
  children, 
  columns = 2,
  className = "" 
}: ResponsiveFormGridProps) {
  const gridClass = columns === 1 
    ? "grid grid-cols-1"
    : "grid grid-cols-1 md:grid-cols-2";
  
  return (
    <div className={`${gridClass} gap-3 md:gap-4 ${className}`}>
      {children}
    </div>
  );
}
