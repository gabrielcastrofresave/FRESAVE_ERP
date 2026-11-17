import { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Anima a entrada de cada página (suave, ~0,3 s). Usa `key` no sítio onde é
 * chamado para repetir a animação ao mudar de página.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      className="erp-page"
      initial={reduzir ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.8, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
