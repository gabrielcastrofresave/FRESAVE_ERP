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
      transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.9 }}
    >
      {children}
    </motion.div>
  );
}
