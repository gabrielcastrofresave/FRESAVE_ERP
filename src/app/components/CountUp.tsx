import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/** Número que "sobe" até ao valor final quando aparece. Para outros tipos, mostra o valor tal como está. */
export function CountUp({ value, duration = 0.9 }: { value: number | string; duration?: number }) {
  const reduzir = useReducedMotion();
  const alvo = typeof value === "number" ? value : Number(value);
  const animavel = Number.isFinite(alvo) && String(value).trim() !== "" && Math.abs(alvo) < 1e9;
  const [mostrar, setMostrar] = useState<number>(animavel && !reduzir ? 0 : alvo);
  const anterior = useRef<number>(animavel && !reduzir ? 0 : alvo);

  useEffect(() => {
    if (!animavel) return;
    if (reduzir) { setMostrar(alvo); anterior.current = alvo; return; }
    const controlo = animate(anterior.current, alvo, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setMostrar(Math.round(v)),
      onComplete: () => { anterior.current = alvo; },
    });
    return () => controlo.stop();
  }, [alvo, animavel, reduzir, duration]);

  if (!animavel) return <>{value}</>;
  return <span className="erp-tabular">{mostrar}</span>;
}
