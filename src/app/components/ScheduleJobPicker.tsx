// src/app/components/ScheduleJobPicker.tsx
//
// Seletor para a MyActivityPage baseado nos temas (planeamentos).
// O utilizador escolhe um tema e o trabalho fica ligado automaticamente.
// Se o tema não existir, pode mudar para a pesquisa completa de trabalhos (fallback).

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { schedulesAPI, JOB_CLIENT_COLUMN } from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Search, X } from "lucide-react";

export function ScheduleJobPicker({
  value,
  titulo,
  onPick,
  onClear,
  fallback,
}: {
  /** id do trabalho atualmente escolhido */
  value: string;
  /** título atual do registo (para destacar o tema certo ao editar) */
  titulo?: string;
  onPick: (pick: { jobId: string; titulo: string }) => void;
  onClear: () => void;
  /** Pesquisa completa de trabalhos (o JobSearchPicker atual) */
  fallback: ReactNode;
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    schedulesAPI
      .getForPicker()
      .then((list: any[]) => {
        if (!ativo) return;
        setOptions(list);
        // Registo já ligado a um trabalho que não tem temas, ou ainda não há temas
        if (value && !list.some((s) => s.job_id === value)) setShowAll(true);
        if (list.length === 0) setShowAll(true);
      })
      .catch((error: unknown) => {
        console.error("Erro ao carregar planeamentos:", error);
        if (ativo) setShowAll(true);
      })
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // PROD_2026_123, PROD 2026/123 e PROD-2026-123 valem o mesmo
    const norm = (v: string) => v.toLowerCase().replace(/[_\s/]+/g, "-");
    const qn = norm(q);
    return options.filter((s) => {
      const cliente = JOB_CLIENT_COLUMN ? s.job?.[JOB_CLIENT_COLUMN] : "";
      return (
        (s.titulo || "").toLowerCase().includes(q) ||
        (s.job?.title || "").toLowerCase().includes(q) ||
        (s.job?.description || "").toLowerCase().includes(q) ||
        (cliente || "").toLowerCase().includes(q) ||
        norm(s.job?.reference || "").includes(qn) ||
        (s.job?.tracking_code || "").toLowerCase().includes(q)
      );
    });
  }, [options, query]);

  if (loading) {
    return (
      <p className="flex items-center rounded-md border border-zinc-200 px-3 py-3 text-xs text-zinc-400 dark:border-zinc-700">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />A carregar os
        temas…
      </p>
    );
  }

  if (showAll) {
    return (
      <div className="space-y-2">
        {options.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="text-xs font-medium text-red-600"
          >
            ← Voltar aos temas
          </button>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ainda não há temas definidos. Podes pesquisar um trabalho ou deixar
            em branco.
          </p>
        )}
        {fallback}
      </div>
    );
  }

  const selected =
    options.find((s) => s.id === selectedId) ??
    options.find((s) => s.job_id === value && s.titulo === titulo) ??
    options.find((s) => s.job_id === value);

  return (
    <div className="space-y-2">
      {value && selected && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {selected.titulo}
            </p>
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {selected.job?.title} ·{" "}
              <span className="font-mono">{selected.job?.reference}</span>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              setSelectedId(null);
              onClear();
            }}
            aria-label="Remover tema"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por referência (PROD_2026_123), cliente ou nome"
          className="h-9 pl-9"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-xs text-zinc-400">
            Nenhum tema corresponde à pesquisa.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(s.id);
                    onPick({ jobId: s.job_id, titulo: s.titulo });
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                    s.id === selected?.id
                      ? "bg-red-50/60 dark:bg-red-950/20"
                      : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {s.titulo}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-400">
                      {s.job?.title}
                      {JOB_CLIENT_COLUMN && s.job?.[JOB_CLIENT_COLUMN]
                        ? ` · ${s.job[JOB_CLIENT_COLUMN]}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                    {s.job?.reference}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="text-xs font-medium text-zinc-500 hover:text-red-600"
      >
        Não encontro o tema → pesquisar trabalhos
      </button>
    </div>
  );
}