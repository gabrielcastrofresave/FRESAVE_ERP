export type TipoReferencia = "PROD" | "PROD_INT" | "MANUT" | "GARANTIA";

type ConfigReferencia = {
  label: string;
  prefixo: string;
  comAno: boolean;
  separador: string;
};

export const TIPOS_REFERENCIA: Record<TipoReferencia, ConfigReferencia> = {
  PROD: { label: "Produção", prefixo: "PROJ", comAno: true, separador: "" },
  PROD_INT: { label: "Produção Interna", prefixo: "PROD.INTERNA", comAno: true, separador: "" },
  MANUT: { label: "Manutenção", prefixo: "MANUT", comAno: false, separador: "." },
  GARANTIA: { label: "Garantia", prefixo: "GRNT", comAno: false, separador: "" },
};

export const TIPOS_LISTA = Object.keys(TIPOS_REFERENCIA) as TipoReferencia[];

// PROJ2026 0203 -> "PROJ20260203" | MANUT.0054 | GRNT0064
export function montarCodigo(tipo: TipoReferencia, numero: number, ano: number) {
  const cfg = TIPOS_REFERENCIA[tipo];
  const parteAno = cfg.comAno ? String(ano) : "";
  const parteNumero = String(numero).padStart(4, "0");
  return `${cfg.prefixo}${cfg.separador}${parteAno}${parteNumero}`;
}

// Referência "de sempre": PROD-2026-202 (tipos com ano) ou MANUT-54 (sem ano).
// O número não tem zeros à esquerda.
export function montarReferencia(tipo: TipoReferencia, numero: number, ano: number) {
  const cfg = TIPOS_REFERENCIA[tipo];
  return cfg.comAno ? `${tipo}-${ano}-${numero}` : `${tipo}-${numero}`;
}