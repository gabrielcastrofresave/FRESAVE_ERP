// src/app/components/JobSearchPicker.tsx
//
// Pesquisa completa de trabalhos em curso (usada quando o tema não existe nos planeamentos).
// Filtros: tipo de referência (PROD, PROD_INT, ...), ano, n.º interno e texto (título/rastreio).
// Se escreveres uma referência inteira (PROD_2026_123, PROD 2026/123, PROD-2026-123),
// os filtros de tipo/ano/número são preenchidos automaticamente.

import { useEffect, useMemo, useRef, useState } from "react";
import { jobsAPI, JOB_CLIENT_COLUMN } from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Search, X } from "lucide-react";

const PAGE_SIZE = 30;

const SELECT_CLASS =
  "h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

// "PROD_2026_123", "PROD 2026/123", "prod-2026-123", "PROD_INT 2026/1" -> tipo, ano, número
function parseReferencia(texto: string, tipos: string[]) {
  const m = texto
    .trim()
    .match(/^([A-Za-z][A-Za-z_ ]*?)[\s_\-/]+(\d{4})[\s_\-/]+(\d+)$/);
  if (!m) return null;
  const candidato = m[1].trim().replace(/\s+/g, "_").toUpperCase();
  const tipo = tipos.find((t) => t.toUpperCase() === candidato);
  if (!tipo) return null;
  return { tipo, ano: m[2], numero: String(Number(m[3])) };
}

export function JobSearchPicker({
  value,
  onChange,
  onPickJob,
  knownJobs,
  initialSearch = "",
}: {
  value: string;
  onChange: (jobId: string) => void;
  onPickJob?: (job: any) => void;
  knownJobs: any[];
  /** Texto já escrito no seletor de temas, para não o escreveres outra vez */
  initialSearch?: string;
}) {
  const [refTypes, setRefTypes] = useState<string[]>([]);
  const [refYears, setRefYears] = useState<string[]>([]);
  const [filtrosProntos, setFiltrosProntos] = useState(false);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch.trim());
  const [referenceType, setReferenceType] = useState("");
  const [referenceYear, setReferenceYear] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const pedido = useRef(0);

  // Opções dos filtros (uma vez)
  useEffect(() => {
    Promise.all([
      jobsAPI.getAllReferenceTypes(),
      jobsAPI.getAllReferenceYears(),
    ])
      .then(([types, years]) => {
        setRefTypes(types);
        setRefYears(years);
      })
      .catch((error: unknown) =>
        console.error("Erro ao carregar filtros:", error),
      )
      .finally(() => setFiltrosProntos(true));
  }, []);

  // Debounce da pesquisa por texto
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Texto que é uma referência completa -> usa os filtros de referência
  const porReferencia = useMemo(
    () => parseReferencia(search, refTypes),
    [search, refTypes],
  );

  // Pesquisa trabalhos em curso com os filtros atuais
  useEffect(() => {
    if (!filtrosProntos) return;
    const id = ++pedido.current;
    setSearching(true);
    jobsAPI
      .getPage(1, PAGE_SIZE, {
        status: "em_curso",
        search: porReferencia ? undefined : search || undefined,
        referenceType:
          porReferencia?.tipo ?? (referenceType || undefined),
        referenceYear:
          porReferencia?.ano ?? (referenceYear || undefined),
        referenceNumber:
          porReferencia?.numero ??
          (referenceNumber.trim() || undefined),
      })
      .then((data: any) => {
        if (id === pedido.current) setResults(data.jobs ?? []);
      })
      .catch((error: unknown) =>
        console.error("Erro ao pesquisar trabalhos:", error),
      )
      .finally(() => {
        if (id === pedido.current) setSearching(false);
      });
  }, [
    filtrosProntos,
    search,
    porReferencia,
    referenceType,
    referenceYear,
    referenceNumber,
  ]);

  // Trabalho escolhido: o que acabou de ser clicado, ou o que já vinha associado ao registo
  const escolhido =
    selectedJob?.id === value
      ? selectedJob
      : (knownJobs.find((j) => j.id === value) ??
        results.find((j) => j.id === value) ??
        null);

  const temFiltros =
    searchInput !== "" ||
    referenceType !== "" ||
    referenceYear !== "" ||
    referenceNumber !== "";

  function limparFiltros() {
    setSearchInput("");
    setSearch("");
    setReferenceType("");
    setReferenceYear("");
    setReferenceNumber("");
  }

  const cliente = (job: any) =>
    JOB_CLIENT_COLUMN ? (job?.[JOB_CLIENT_COLUMN] as string) : "";

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {escolhido?.title ?? "Trabalho selecionado"}
            </p>
            {escolhido?.reference && (
              <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                {escolhido.reference}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              setSelectedJob(null);
              onChange("");
            }}
            aria-label="Remover trabalho"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            autoFocus
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Título, rastreio ou referência (PROD_2026_123)"
            className="h-9 pl-9"
          />
        </div>
        <select
          value={porReferencia?.tipo ?? referenceType}
          onChange={(e) => setReferenceType(e.target.value)}
          disabled={Boolean(porReferencia)}
          className={SELECT_CLASS}
        >
          <option value="">Tipo de Ref.</option>
          {refTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={porReferencia?.ano ?? referenceYear}
          onChange={(e) => setReferenceYear(e.target.value)}
          disabled={Boolean(porReferencia)}
          className={SELECT_CLASS}
        >
          <option value="">Ano</option>
          {refYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <Input
          value={porReferencia?.numero ?? referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          disabled={Boolean(porReferencia)}
          placeholder="N.º interno"
          className="h-9 sm:w-32"
        />
      </div>

      {porReferencia && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Referência reconhecida: {porReferencia.tipo} {porReferencia.ano}/
          {porReferencia.numero}
        </p>
      )}

      <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        {searching && results.length === 0 ? (
          <p className="flex items-center px-3 py-3 text-xs text-zinc-400">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            A pesquisar…
          </p>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-3 py-4">
            <p className="text-xs text-zinc-400">
              Nenhum trabalho em curso corresponde à pesquisa.
            </p>
            {temFiltros && (
              <button
                type="button"
                onClick={limparFiltros}
                className="shrink-0 text-xs font-medium text-red-600"
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(job);
                    onChange(job.id);
                    onPickJob?.(job);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                    job.id === value
                      ? "bg-red-50/60 dark:bg-red-950/20"
                      : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-800 dark:text-zinc-100">
                      {job.title}
                    </span>
                    {cliente(job) && (
                      <span className="block truncate text-[11px] text-zinc-400">
                        {cliente(job)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                    {job.reference}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {results.length >= PAGE_SIZE && (
        <p className="text-[11px] text-zinc-400">
          A mostrar os primeiros {PAGE_SIZE}. Escreve mais ou usa os filtros
          para afinar.
        </p>
      )}
    </div>
  );
}