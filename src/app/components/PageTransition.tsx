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
      initial={reduzir ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
