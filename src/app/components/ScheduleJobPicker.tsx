// src/app/components/ScheduleJobPicker.tsx
//
// Seletor de temas (planeamentos) para o registo de atividade.
// O utilizador escolhe um tema e o trabalho fica ligado automaticamente.
// - Pesquisa por várias palavras, sem acentos (todas têm de existir).
// - Os temas aparecem agrupados por trabalho; os trabalhos com vários temas
//   ficam fechados até clicares (ou até pesquisares).
// - Depois de escolher, a lista esconde-se e fica só o tema escolhido.
// - Se o tema não existir, o botão grande leva à pesquisa completa de trabalhos
//   (com o texto que já escreveste).

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { schedulesAPI, JOB_CLIENT_COLUMN } from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";

// Máximo de trabalhos listados quando não há pesquisa
const MAX_GRUPOS = 40;

function norm(v: string) {
  return (v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// PROD_2026_123, PROD 2026/123 e PROD-2026-123 valem o mesmo
function normRef(v: string) {
  return norm(v).replace(/[_\s/]+/g, "-");
}

type Grupo = { key: string; job: any; itens: any[] };

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
  /** Pesquisa completa de trabalhos. Pode ser uma função que recebe o texto já escrito. */
  fallback: ReactNode | ((pesquisa: string) => ReactNode);
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    null,
  );
  const [changing, setChanging] = useState(false);
  const [aberto, setAberto] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ativo = true;
    schedulesAPI
      .getForPicker()
      .then((list: any[]) => {
        if (!ativo) return;
        setOptions(list);
        // Registo já ligado a um trabalho que não tem temas, ou ainda não há temas
        if (value && !list.some((s) => s.job_id === value))
          setShowAll(true);
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

  // Texto de pesquisa de cada tema, preparado uma só vez
  const indexados = useMemo(
    () =>
      options.map((s) => {
        const cliente = JOB_CLIENT_COLUMN
          ? s.job?.[JOB_CLIENT_COLUMN]
          : "";
        const texto = norm(
          [
            s.titulo,
            s.job?.title,
            s.job?.description,
            cliente,
            s.job?.tracking_code,
          ]
            .filter(Boolean)
            .join(" "),
        );
        const ref = normRef(s.job?.reference || "");
        return {
          s,
          hay: `${texto} ${texto.replace(/[_/]+/g, "-")} ${ref}`,
        };
      }),
    [options],
  );

  // Todas as palavras escritas têm de existir (em qualquer ordem)
  const filtered = useMemo(() => {
    const palavras = norm(query).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return options;
    return indexados
      .filter(({ hay }) =>
        palavras.every(
          (p) =>
            hay.includes(p) ||
            hay.includes(p.replace(/[_/]+/g, "-")),
        ),
      )
      .map(({ s }) => s);
  }, [indexados, options, query]);

  // Temas agrupados por trabalho
  const grupos = useMemo(() => {
    const mapa = new Map<string, Grupo>();
    for (const s of filtered) {
      const key = String(s.job_id ?? s.id);
      const g = mapa.get(key);
      if (g) g.itens.push(s);
      else mapa.set(key, { key, job: s.job, itens: [s] });
    }
    return [...mapa.values()];
  }, [filtered]);

  const temPesquisa = query.trim() !== "";

  function escolher(s: any) {
    setSelectedId(s.id);
    setChanging(false);
    setQuery("");
    onPick({ jobId: s.job_id, titulo: s.titulo });
  }

  function alternarGrupo(key: string) {
    setAberto((atual) => {
      const novo = new Set(atual);
      if (novo.has(key)) novo.delete(key);
      else novo.add(key);
      return novo;
    });
  }

  if (loading) {
    return (
      <p className="flex items-center rounded-md border border-zinc-200 px-3 py-3 text-xs text-zinc-400 dark:border-zinc-700">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />A
        carregar os temas…
      </p>
    );
  }

  if (showAll) {
    return (
      <div className="space-y-3">
        {options.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-sm"
            onClick={() => setShowAll(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos temas
          </Button>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ainda não há temas definidos. Podes pesquisar um
            trabalho ou deixar em branco.
          </p>
        )}
        {typeof fallback === "function"
          ? fallback(query.trim())
          : fallback}
      </div>
    );
  }

  const selected =
    options.find((s) => s.id === selectedId) ??
    options.find(
      (s) => s.job_id === value && s.titulo === titulo,
    ) ??
    options.find((s) => s.job_id === value);

  // Tema já escolhido: mostra só esse, a lista fica escondida até carregares em "Alterar"
  if (value && selected && !changing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/30">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {selected.titulo}
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {selected.job?.title} ·{" "}
            <span className="font-mono">
              {selected.job?.reference}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-medium text-red-600"
            onClick={() => setChanging(true)}
          >
            Alterar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedId(null);
              onClear();
            }}
            aria-label="Remover tema"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const linhaTema = (s: any, comReferencia: boolean) => (
    <button
      key={s.id}
      type="button"
      onClick={() => escolher(s)}
      className={`flex w-full items-center gap-3 py-2.5 pr-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
        comReferencia ? "pl-3" : "pl-9"
      } ${s.id === selected?.id ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
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
      {comReferencia && (
        <span className="shrink-0 font-mono text-[11px] text-zinc-400">
          {s.job?.reference}
        </span>
      )}
    </button>
  );

  const visiveis = temPesquisa
    ? grupos
    : grupos.slice(0, MAX_GRUPOS);

  return (
    <div className="space-y-2">
      {value && selected && changing && (
        <button
          type="button"
          onClick={() => setChanging(false)}
          className="text-xs font-medium text-zinc-500 hover:text-red-600"
        >
          ← Manter “{selected.titulo}”
        </button>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          autoFocus={changing}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar tema, cliente ou referência (PROD_2026_123)"
          className="h-10 pl-9"
        />
        {temPesquisa && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar pesquisa"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-400">
        {temPesquisa
          ? `${filtered.length} ${filtered.length === 1 ? "tema" : "temas"} em ${grupos.length} ${grupos.length === 1 ? "trabalho" : "trabalhos"}`
          : `${options.length} temas em ${grupos.length} trabalhos · clica num trabalho para ver os temas`}
      </p>

      <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        {filtered.length === 0 ? (
          <div className="space-y-1 px-3 py-5 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum tema corresponde a “{query.trim()}”.
            </p>
            <p className="text-xs text-zinc-400">
              Experimenta menos palavras, ou pesquisa em todos
              os trabalhos.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visiveis.map((g) => {
              // Trabalho com um só tema: aparece logo como linha normal
              if (g.itens.length === 1) {
                return (
                  <li key={g.key}>
                    {linhaTema(g.itens[0], true)}
                  </li>
                );
              }
              const aberta =
                temPesquisa ||
                aberto.has(g.key) ||
                g.itens.some((s) => s.id === selected?.id);
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => alternarGrupo(g.key)}
                    aria-expanded={aberta}
                    className="flex w-full items-center gap-2 bg-zinc-50/70 px-3 py-2.5 text-left hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800"
                  >
                    {aberta ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {g.job?.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                      {g.job?.reference}
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      {g.itens.length}
                    </span>
                  </button>
                  {aberta && (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {g.itens.map((s) => linhaTema(s, false))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!temPesquisa && grupos.length > MAX_GRUPOS && (
          <p className="border-t border-zinc-100 px-3 py-2 text-center text-[11px] text-zinc-400 dark:border-zinc-800">
            A mostrar {MAX_GRUPOS} de {grupos.length} trabalhos.
            Escreve para filtrar.
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full justify-center gap-2 border-dashed text-sm font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:text-zinc-200 dark:hover:bg-red-950/30"
        onClick={() => setShowAll(true)}
      >
        <Search className="h-4 w-4" />
        Não encontro o tema — pesquisar em todos os trabalhos
      </Button>
    </div>
  );
}