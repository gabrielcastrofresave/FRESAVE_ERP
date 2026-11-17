// src/app/pages/AccountingPage.tsx

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  useRef,
  memo,
  type ReactNode,
  type RefObject,
} from "react";
import { useApp } from "../AppContext";
import { jobsAPI, accountingAPI } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  ShieldAlert,
  Loader2,
  Clock3,
  Package,
  Plus,
  Trash2,
  Download,
  FileText,
  Calculator,
  Search,
  X,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertTriangle,
  Inbox,
  CalendarDays,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Constantes e tipos                                                        */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 50;
const PREFS_KEY = "accounting-page-prefs-v1";

type StatusFilter = "todos" | "em_curso" | "concluido";
type SortOption =
  | "recentes"
  | "antigos"
  | "titulo"
  | "referencia";
type PeriodFilter = "sempre" | "30d" | "ano";
type SectionKey = "parts" | "hours" | "extras";
type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir };

type Notify = (
  message: string,
  opts?: {
    tone?: "success" | "error" | "info";
    actionLabel?: string;
    onAction?: () => void;
  },
) => void;

type ToastState = {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
  actionLabel?: string;
  onAction?: () => void;
};

const STATUS_VALUES: StatusFilter[] = [
  "todos",
  "em_curso",
  "concluido",
];
const SORT_VALUES: SortOption[] = [
  "recentes",
  "antigos",
  "titulo",
  "referencia",
];
const PERIOD_VALUES: PeriodFilter[] = ["sempre", "30d", "ano"];

// Criados uma única vez: localeCompare cria um Collator novo a cada chamada,
// o que pesa muito ao ordenar milhares de projetos
const collator = new Intl.Collator("pt");
const collatorNumerico = new Intl.Collator("pt", {
  numeric: true,
});

const euroFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});
const numberFmt = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* -------------------------------------------------------------------------- */
/*  Funções utilitárias                                                       */
/* -------------------------------------------------------------------------- */

function formatEuro(value: number) {
  const n = Number(value);
  return euroFmt.format(Number.isFinite(n) ? n : 0);
}

function formatHours(value: number) {
  const n = Number(value);
  return `${numberFmt.format(Number.isFinite(n) ? n : 0)}h`;
}

function formatDatePt(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("pt-PT");
}

function dateTs(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Pesquisa sem acentos e sem maiúsculas ("maquina" encontra "Máquina")
function fold(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalize(value: unknown) {
  return fold(value).trim();
}

function jobDate(job: any): number {
  const raw = job.created_at || job.data_inicio || job.date;
  return dateTs(raw);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeFilename(name: string) {
  return (
    name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "projeto"
  );
}

// Números com vírgula decimal para o Excel português
function csvNumber(n: number) {
  return (Number(n) || 0).toFixed(2).replace(".", ",");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCsv(
  filename: string,
  rows: (string | number)[][],
) {
  const escapeCell = (value: string | number) => {
    const str = String(value ?? "");
    if (
      str.includes(";") ||
      str.includes('"') ||
      str.includes("\n")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = rows.map((row) =>
    row.map(escapeCell).join(";"),
  );
  const csvContent = "\uFEFF" + lines.join("\r\n");
  triggerDownload(
    new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    }),
    filename,
  );
}

function loadPrefs(): {
  status?: StatusFilter;
  sort?: SortOption;
  period?: PeriodFilter;
} {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sortRows<T>(
  rows: T[],
  sort: SortState,
  getters: Record<string, (row: T) => string | number>,
): T[] {
  const get = getters[sort.key];
  if (!get) return rows;
  const m = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (typeof x === "number" && typeof y === "number")
      return (x - y) * m;
    return collator.compare(String(x), String(y)) * m;
  });
}

// asc → desc → ordem original
function useSort(initial: SortState = { key: "", dir: "asc" }) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = useCallback((key: string) => {
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: "asc" };
    });
  }, []);
  return [sort, toggle] as const;
}

/* -------------------------------------------------------------------------- */
/*  Pequenos componentes de interface                                         */
/* -------------------------------------------------------------------------- */

// Realça o termo pesquisado (ignora acentos e maiúsculas)
function Highlight({
  text,
  term,
}: {
  text: unknown;
  term: string;
}) {
  const str = String(text ?? "");
  if (!term) return <>{str}</>;
  const folded = fold(str);
  if (folded.length !== str.length) return <>{str}</>;
  const parts: ReactNode[] = [];
  let pos = 0;
  let i = folded.indexOf(term);
  if (i === -1) return <>{str}</>;
  while (i !== -1) {
    if (i > pos) parts.push(str.slice(pos, i));
    parts.push(
      <mark
        key={i}
        className="rounded bg-amber-200/70 px-0.5 text-inherit dark:bg-amber-500/30"
      >
        {str.slice(i, i + term.length)}
      </mark>,
    );
    pos = i + term.length;
    i = folded.indexOf(term, pos);
  }
  if (pos < str.length) parts.push(str.slice(pos));
  return <>{parts}</>;
}

function Chip({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "default" | "warning";
}) {
  const activeCls =
    tone === "warning"
      ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? activeCls
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function SortTh({
  label,
  sortKey,
  sort,
  onSort,
  right,
  className = "",
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  right?: boolean;
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`${className} ${right ? "text-right" : ""}`}
      aria-sort={
        active
          ? sort.dir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-zinc-800 dark:hover:text-zinc-100 ${
          right ? "flex-row-reverse" : ""
        } ${active ? "text-zinc-800 dark:text-zinc-100" : ""}`}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

function SectionCard({
  icon,
  title,
  count,
  total,
  open,
  onToggle,
  actions,
  sectionRef,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  sectionRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div
      ref={sectionRef}
      className="scroll-mt-24 overflow-hidden erp-surface"
    >
      <div className="flex items-center justify-between gap-2 px-5 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
          )}
          <span className="text-zinc-400">{icon}</span>
          <h3 className="text-sm font-semibold text-foreground">
            {title}
          </h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {count}
          </span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {formatEuro(total)}
          </span>
          {actions}
        </div>
      </div>
      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Página                                                                    */
/* -------------------------------------------------------------------------- */

export function AccountingPage() {
  const { currentUser } = useApp();
  const hasAccess =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio";

  const [prefs] = useState(loadPrefs);

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedJobId, setSelectedJobId] =
    useState<string>("");

  // Filtros (estado, ordenação e período ficam guardados entre visitas)
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(() =>
      STATUS_VALUES.includes(prefs.status as StatusFilter)
        ? (prefs.status as StatusFilter)
        : "todos",
    );
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    SORT_VALUES.includes(prefs.sort as SortOption)
      ? (prefs.sort as SortOption)
      : "recentes",
  );
  const [period, setPeriod] = useState<PeriodFilter>(() =>
    PERIOD_VALUES.includes(prefs.period as PeriodFilter)
      ? (prefs.period as PeriodFilter)
      : "sempre",
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Avisos (toast)
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const notify = useCallback<Notify>((message, opts = {}) => {
    const id = Date.now() + Math.random();
    setToast({
      id,
      message,
      tone: opts.tone ?? "info",
      actionLabel: opts.actionLabel,
      onAction: opts.onAction,
    });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => setToast((c) => (c && c.id === id ? null : c)),
      opts.actionLabel ? 8000 : 4500,
    );
  }, []);
  useEffect(
    () => () => window.clearTimeout(toastTimer.current),
    [],
  );

  // Só a lista de projetos é pedida à entrada (os custos de cada projeto
  // são pedidos quando o projeto é selecionado)
  const loadJobs = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setLoadError(false);
    try {
      const jobsData = await jobsAPI.getAll();
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) loadJobs();
  }, [hasAccess, loadJobs]);

  // Guarda as preferências de filtro
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          status: statusFilter,
          sort: sortBy,
          period,
        }),
      );
    } catch {
      /* ignora: armazenamento indisponível */
    }
  }, [statusFilter, sortBy, period]);

  // Volta ao início da lista sempre que um filtro muda
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, statusFilter, sortBy, period]);

  // Atalho "/" para ir à pesquisa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey)
        return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el?.isContentEditable
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Prepara cada projeto uma única vez (data e textos normalizados),
  // para a pesquisa e a ordenação não repetirem este trabalho a cada tecla
  const indexedJobs = useMemo(
    () =>
      jobs.map((job, index) => ({
        job,
        index,
        ts: jobDate(job),
        titulo: normalize(job.title),
        ref: normalize(job.reference),
      })),
    [jobs],
  );

  // A ordenação só é refeita quando muda a lista ou o critério,
  // não quando se escreve na pesquisa
  const sortedJobs = useMemo(() => {
    const list = [...indexedJobs];
    list.sort((a, b) => {
      switch (sortBy) {
        case "titulo":
          return collator.compare(
            String(a.job.title ?? ""),
            String(b.job.title ?? ""),
          );
        case "referencia":
          return collatorNumerico.compare(
            String(a.job.reference ?? ""),
            String(b.job.reference ?? ""),
          );
        case "antigos":
          return a.ts - b.ts || b.index - a.index;
        case "recentes":
        default:
          return b.ts - a.ts || a.index - b.index;
      }
    });
    return list;
  }, [indexedJobs, sortBy]);

  const searchTerm = useMemo(
    () => normalize(deferredSearch),
    [deferredSearch],
  );

  // Pesquisa + período (os contadores dos separadores respeitam estes filtros)
  const baseFiltered = useMemo(() => {
    let cutoff = 0;
    if (period === "30d") cutoff = Date.now() - 30 * 864e5;
    if (period === "ano")
      cutoff = new Date(new Date().getFullYear(), 0, 1).getTime();
    return sortedJobs.filter(({ ts, titulo, ref }) => {
      if (period !== "sempre" && (ts === 0 || ts < cutoff))
        return false;
      if (!searchTerm) return true;
      return (
        titulo.includes(searchTerm) || ref.includes(searchTerm)
      );
    });
  }, [sortedJobs, searchTerm, period]);

  const statusCounts = useMemo(() => {
    const concluido = baseFiltered.filter(
      (r) => r.job.status === "concluido",
    ).length;
    return {
      todos: baseFiltered.length,
      concluido,
      em_curso: baseFiltered.length - concluido,
    };
  }, [baseFiltered]);

  const filteredJobs = useMemo(
    () =>
      baseFiltered
        .filter(({ job }) => {
          if (statusFilter === "concluido")
            return job.status === "concluido";
          if (statusFilter === "em_curso")
            return job.status !== "concluido";
          return true;
        })
        .map((r) => r.job),
    [baseFiltered, statusFilter],
  );

  const visibleJobs = useMemo(
    () => filteredJobs.slice(0, visibleCount),
    [filteredJobs, visibleCount],
  );

  const activeFilterCount =
    (search.trim() !== "" ? 1 : 0) +
    (statusFilter !== "todos" ? 1 : 0) +
    (period !== "sempre" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("todos");
    setPeriod("sempre");
  };

  const selectedJob = useMemo(
    () => jobs.find((j: any) => j.id === selectedJobId),
    [jobs, selectedJobId],
  );

  const selectJob = useCallback((id: string) => {
    setSelectedJobId(id);
    // Em ecrãs pequenos a ficha aparece por baixo da lista
    if (window.innerWidth < 1024) {
      window.setTimeout(
        () =>
          sheetRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    }
  }, []);

  // Mantém o projeto selecionado visível na lista (útil com o teclado)
  useEffect(() => {
    if (!selectedJobId || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-job-id="${CSS.escape(selectedJobId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedJobId, visibleJobs]);

  // Setas ↑ ↓ para percorrer os projetos
  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if ((e.target as HTMLElement).tagName === "SELECT") return;
    if (visibleJobs.length === 0) return;
    e.preventDefault();
    const idx = visibleJobs.findIndex(
      (j) => j.id === selectedJobId,
    );
    let next = 0;
    if (idx !== -1) {
      next =
        e.key === "ArrowDown"
          ? Math.min(idx + 1, visibleJobs.length - 1)
          : Math.max(idx - 1, 0);
    }
    setSelectedJobId(visibleJobs[next].id);
  };

  // Depois de eliminar, tira o projeto da lista local em vez de
  // voltar a pedir todos os projetos à base de dados
  const handleJobDeleted = useCallback((jobId: string) => {
    setSelectedJobId("");
    setJobs((current) => current.filter((j) => j.id !== jobId));
  }, []);

  if (!hasAccess) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-zinc-300" />
        <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          Acesso Restrito
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta página só está disponível para administração e
          escritório.
        </p>
      </div>
    );
  }

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "em_curso", label: "Em curso" },
    { value: "concluido", label: "Concluídos" },
  ];
  const periodChips: { value: PeriodFilter; label: string }[] = [
    { value: "sempre", label: "Sempre" },
    { value: "30d", label: "Últimos 30 dias" },
    { value: "ano", label: "Este ano" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-red-600 dark:text-red-400">
          FINANCEIRO
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contabilidade de Projetos
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Consulta o custo total de cada máquina/projeto: horas
          trabalhadas, peças utilizadas e outros custos.
        </p>
        <p className="mt-2 hidden text-xs text-zinc-400 lg:block">
          Dica: prime{" "}
          <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-800">
            /
          </kbd>{" "}
          para pesquisar e{" "}
          <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-800">
            ↑
          </kbd>{" "}
          <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-800">
            ↓
          </kbd>{" "}
          para percorrer os projetos.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Lista de projetos */}
        <div
          onKeyDown={handlePanelKeyDown}
          className="flex flex-col overflow-hidden erp-surface lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]"
        >
          {/* Filtros */}
          <div className="space-y-3 border-b border-zinc-100 p-3 dark:border-zinc-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("");
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Procurar por título ou referência"
                className="h-9 pl-8 pr-8"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 lg:block">
                  /
                </kbd>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  aria-pressed={statusFilter === tab.value}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === tab.value
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-[10px] text-zinc-400">
                    {statusCounts[tab.value]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
              {periodChips.map((chip) => (
                <Chip
                  key={chip.value}
                  active={period === chip.value}
                  onClick={() => setPeriod(chip.value)}
                >
                  {chip.label}
                </Chip>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as SortOption)
                }
                className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                aria-label="Ordenar"
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="titulo">Título (A–Z)</option>
                <option value="referencia">Referência</option>
              </select>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {filteredJobs.length} de {jobs.length}
                </p>
                <button
                  type="button"
                  onClick={() => loadJobs(true)}
                  disabled={refreshing || loading}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Atualizar lista de projetos"
                  title="Atualizar lista"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-600 hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                <X className="h-3 w-3" />
                Limpar {activeFilterCount === 1
                  ? "filtro"
                  : `${activeFilterCount} filtros`}
              </button>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 px-4 py-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="px-4 py-8 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Não foi possível carregar os projetos.
              </p>
              <Button
                variant="outline"
                className="mt-3 h-8 text-xs"
                onClick={() => loadJobs()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Inbox className="mx-auto h-6 w-6 text-zinc-300" />
              <p className="mt-2 text-sm text-zinc-400">
                Nenhum projeto encontrado.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="mx-auto h-6 w-6 text-zinc-300" />
              <p className="mt-2 text-sm text-zinc-500">
                Nenhum projeto corresponde aos filtros.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div
              ref={listRef}
              className="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800 max-lg:max-h-[28rem]"
            >
              {visibleJobs.map((job: any) => {
                const selected = selectedJobId === job.id;
                const ts = jobDate(job);
                return (
                  <button
                    key={job.id}
                    data-job-id={job.id}
                    onClick={() => selectJob(job.id)}
                    aria-current={selected ? "true" : undefined}
                    className={`block w-full border-l-2 px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-red-600 bg-red-50 dark:bg-red-950/20"
                        : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <p
                      className={`truncate text-sm font-medium ${
                        selected
                          ? "text-red-700 dark:text-red-400"
                          : "text-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <Highlight
                        text={job.title}
                        term={searchTerm}
                      />
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate font-mono text-[11px] text-zinc-400">
                        <Highlight
                          text={job.reference}
                          term={searchTerm}
                        />
                        {ts > 0 && (
                          <span className="ml-2 font-sans text-zinc-300 dark:text-zinc-600">
                            ·{" "}
                            {new Date(ts).toLocaleDateString(
                              "pt-PT",
                            )}
                          </span>
                        )}
                      </p>
                      <Badge
                        className={`shrink-0 ${
                          job.status === "concluido"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {job.status === "concluido"
                          ? "Concluído"
                          : "Em Curso"}
                      </Badge>
                    </div>
                  </button>
                );
              })}

              {filteredJobs.length > visibleCount && (
                <div className="p-3">
                  <Button
                    variant="outline"
                    className="h-8 w-full text-xs"
                    onClick={() =>
                      setVisibleCount((c) => c + PAGE_SIZE)
                    }
                  >
                    Mostrar mais (
                    {filteredJobs.length - visibleCount}{" "}
                    restantes)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ficha de custos do projeto selecionado */}
        <div ref={sheetRef} className="scroll-mt-4">
          {selectedJob ? (
            <JobCostSheet
              key={selectedJob.id}
              job={selectedJob}
              notify={notify}
              onJobDeleted={() =>
                handleJobDeleted(selectedJob.id)
              }
            />
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
              <Calculator className="h-8 w-8 text-zinc-300" />
              <p>Seleciona um projeto para veres os custos.</p>
              <p className="text-xs text-zinc-400">
                Podes usar as setas ↑ ↓ do teclado.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Avisos */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      >
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                : toast.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 opacity-60 hover:opacity-100"
              aria-label="Fechar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Eliminar projeto                                                          */
/* -------------------------------------------------------------------------- */

function DeleteProjectDialog({
  job,
  notify,
  onClose,
  onDeleted,
}: {
  job: any;
  notify: Notify;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<"initial" | "verify">(
    "initial",
  );
  const [verificationText, setVerificationText] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete =
    job.status === "concluido" || job.status === "deleted";

  const verificationRequired = String(
    job.title || job.reference || "",
  );
  const matches =
    verificationText.trim() === verificationRequired.trim();

  const handleDelete = async () => {
    if (!matches) {
      notify(`Escreve exatamente: ${verificationRequired}`, {
        tone: "error",
      });
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.deleteJob(job.id);
      notify("Projeto eliminado com sucesso.", {
        tone: "success",
      });
      onClose();
      onDeleted();
    } catch (error) {
      console.error("Erro ao eliminar projeto:", error);
      notify("Erro ao eliminar projeto.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!canDelete) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Não é possível eliminar este projeto. Apenas
            projetos concluídos podem ser eliminados.
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
        >
          Fechar
        </button>
      </div>
    );
  }

  if (step === "initial") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-900 dark:text-red-200">
            Aviso: Esta ação é irreversível
          </p>
          <p className="mt-1 text-sm text-red-800 dark:text-red-300">
            Ao eliminar este projeto, todos os seus dados
            (peças, horas, custos) serão removidos
            permanentemente.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Tens a certeza que queres eliminar:
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            <strong>{job.title}</strong> ({job.reference})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => setStep("verify")}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Sim, quero eliminar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (matches && !loading) handleDelete();
      }}
    >
      <div className="rounded-lg border border-red-300 bg-red-100 p-3 dark:border-red-800 dark:bg-red-950/50">
        <p className="text-sm font-bold text-red-900 dark:text-red-200">
          ⚠ Confirmação Final Necessária
        </p>
      </div>
      <div>
        <Label
          htmlFor="verification"
          className="text-sm font-medium"
        >
          Escreve o título ou referência do projeto para
          confirmar:
        </Label>
        <p className="mt-1 inline-block rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {verificationRequired}
        </p>
      </div>
      <Input
        id="verification"
        type="text"
        value={verificationText}
        onChange={(e) => setVerificationText(e.target.value)}
        placeholder="Escreve aqui..."
        autoFocus
        autoComplete="off"
        className={
          matches
            ? "border-emerald-400"
            : "border-red-300"
        }
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setStep("initial");
            setVerificationText("");
          }}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
        >
          Voltar
        </button>
        <button
          type="submit"
          disabled={loading || !matches}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
          )}
          {loading ? "A eliminar..." : "Eliminar para sempre"}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Linha da tabela de horas                                                  */
/* -------------------------------------------------------------------------- */

// Está em memo para que, ao escrever o preço/hora de uma linha,
// só essa linha seja desenhada de novo. O estado "a guardar / guardado / erro"
// vive na própria linha.
const HourRow = memo(function HourRow({
  line,
  onRateChange,
  onRateSave,
}: {
  line: any;
  onRateChange: (lineId: string, value: string) => void;
  onRateSave: (lineId: string, rate: number) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const savedRate = useRef<number>(Number(line.rate) || 0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const missing = !(Number(line.rate) > 0);

  const save = async (raw: string) => {
    const rate = Number(raw) || 0;
    if (rate === savedRate.current) return;
    setStatus("saving");
    const ok = await onRateSave(line.id, rate);
    if (ok) {
      savedRate.current = rate;
      setStatus("saved");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => setStatus("idle"),
        1800,
      );
    } else {
      setStatus("error");
    }
  };

  return (
    <tr className={missing ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
      <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
        {line.user_nome}
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {formatDatePt(line.data)}
      </td>
      <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
        {formatHours(line.hours)}
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={line.rate || ""}
            onChange={(e) => {
              onRateChange(line.id, e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            onBlur={(e) => save(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                (e.target as HTMLInputElement).blur();
            }}
            className={`h-8 w-24 text-right ${
              status === "error"
                ? "border-red-400"
                : missing
                  ? "border-amber-300"
                  : ""
            }`}
            placeholder="0.00"
            aria-label={`Preço por hora de ${line.user_nome}`}
          />
          <span className="w-4">
            {status === "saving" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
            )}
            {status === "saved" && (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {status === "error" && (
              <AlertTriangle
                className="h-3.5 w-3.5 text-red-500"
                aria-label="Erro ao guardar"
              />
            )}
          </span>
        </div>
      </td>
      <td className="px-5 py-2 text-right text-sm font-medium text-foreground">
        {formatEuro(line.subtotal)}
      </td>
    </tr>
  );
});

/* -------------------------------------------------------------------------- */
/*  Ficha de custos                                                           */
/* -------------------------------------------------------------------------- */

function JobCostSheet({
  job,
  notify,
  onJobDeleted,
}: {
  job: any;
  notify: Notify;
  onJobDeleted: () => void;
}) {
  const [parts, setParts] = useState<any[]>([]);
  const [hourLines, setHourLines] = useState<any[]>([]);
  const [extraCosts, setExtraCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [addExtraOpen, setAddExtraOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    parts: true,
    hours: true,
    extras: true,
  });
  const partsRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const extrasRef = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<
    SectionKey,
    RefObject<HTMLDivElement | null>
  > = {
    parts: partsRef,
    hours: hoursRef,
    extras: extrasRef,
  };

  // Filtros e ordenação de cada tabela
  const [partsSearch, setPartsSearch] = useState("");
  const [partsSort, togglePartsSort] = useSort();
  const [hoursSort, toggleHoursSort] = useSort();
  const [userFilter, setUserFilter] = useState("");
  const [onlyMissingRate, setOnlyMissingRate] = useState(false);
  const [extrasSort, toggleExtrasSort] = useSort();
  const [categoryFilter, setCategoryFilter] = useState("");

  // Preço/hora em massa
  const [bulkRate, setBulkRate] = useState("");
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [rateEpoch, setRateEpoch] = useState(0);

  // Eliminar custo extra (confirmação na própria linha)
  const [confirmDeleteId, setConfirmDeleteId] = useState<
    string | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(
    null,
  );
  const confirmTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => window.clearTimeout(confirmTimer.current),
    [],
  );

  // Carga: peças, horas e outros custos em paralelo
  const requestId = useRef(0);
  const loadAll = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      if (silent) setReloading(true);
      else setLoading(true);
      setLoadError(false);
      try {
        const [partsData, hourData, extraData] =
          await Promise.all([
            accountingAPI.getPartsForJob(job.id),
            accountingAPI.getHourLinesForJob(job.id),
            accountingAPI.getExtraCosts(job.id),
          ]);
        if (id !== requestId.current) return;
        setParts(partsData);
        setHourLines(hourData);
        setExtraCosts(extraData);
        setRateEpoch((n) => n + 1);
      } catch (error) {
        console.error("Erro ao carregar custos:", error);
        if (id === requestId.current) setLoadError(true);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setReloading(false);
        }
      }
    },
    [job.id],
  );

  useEffect(() => {
    loadAll();
    return () => {
      requestId.current++;
    };
  }, [loadAll]);

  // Adicionar ou eliminar um custo só mexe nos outros custos,
  // por isso só estes são pedidos de novo
  const loadExtras = useCallback(async () => {
    try {
      setExtraCosts(await accountingAPI.getExtraCosts(job.id));
    } catch (error) {
      console.error("Erro ao carregar outros custos:", error);
      notify("Erro ao atualizar os outros custos.", {
        tone: "error",
      });
    }
  }, [job.id, notify]);

  const handleRateChange = useCallback(
    (lineId: string, value: string) => {
      const rate = Number(value) || 0;
      setHourLines((current) =>
        current.map((l) =>
          l.id === lineId
            ? { ...l, rate, subtotal: l.hours * rate }
            : l,
        ),
      );
    },
    [],
  );

  const handleRateSave = useCallback(
    async (lineId: string, rate: number) => {
      try {
        await accountingAPI.saveHourRate(lineId, rate);
        return true;
      } catch (error) {
        console.error("Erro ao guardar preço/hora:", error);
        notify("Não foi possível guardar o preço/hora.", {
          tone: "error",
        });
        return false;
      }
    },
    [notify],
  );

  /* ----------------------------- Totais ----------------------------------- */

  const totalParts = useMemo(
    () => parts.reduce((sum, p) => sum + Number(p.subtotal || 0), 0),
    [parts],
  );
  const totalHours = useMemo(
    () =>
      hourLines.reduce((sum, l) => sum + Number(l.subtotal || 0), 0),
    [hourLines],
  );
  const totalExtras = useMemo(
    () =>
      extraCosts.reduce((sum, e) => sum + Number(e.valor || 0), 0),
    [extraCosts],
  );
  const grandTotal = totalParts + totalHours + totalExtras;
  const totalHoursWorked = useMemo(
    () => hourLines.reduce((s, l) => s + Number(l.hours || 0), 0),
    [hourLines],
  );
  const missingRateCount = useMemo(
    () => hourLines.filter((l) => !(Number(l.rate) > 0)).length,
    [hourLines],
  );

  const distribution = useMemo(
    () =>
      [
        {
          key: "parts" as SectionKey,
          label: "Peças",
          value: totalParts,
          bar: "bg-red-400",
        },
        {
          key: "hours" as SectionKey,
          label: "Horas",
          value: totalHours,
          bar: "bg-amber-400",
        },
        {
          key: "extras" as SectionKey,
          label: "Outros",
          value: totalExtras,
          bar: "bg-emerald-400",
        },
      ].map((s) => ({
        ...s,
        pct: grandTotal > 0 ? (s.value / grandTotal) * 100 : 0,
      })),
    [totalParts, totalHours, totalExtras, grandTotal],
  );

  const focusSection = (key: SectionKey) => {
    setOpen((o) => ({ ...o, [key]: true }));
    window.setTimeout(
      () =>
        sectionRefs[key].current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      60,
    );
  };

  const toggleSection = (key: SectionKey) =>
    setOpen((o) => ({ ...o, [key]: !o[key] }));

  /* ----------------------------- Peças ------------------------------------ */

  const partsTerm = normalize(partsSearch);
  const visibleParts = useMemo(() => {
    const filtered = partsTerm
      ? parts.filter((p) =>
          normalize(p.item_nome).includes(partsTerm),
        )
      : parts;
    return sortRows(filtered, partsSort, {
      item: (p) => String(p.item_nome ?? ""),
      qtd: (p) => Number(p.quantidade) || 0,
      preco: (p) => Number(p.preco_unitario) || 0,
      data: (p) => dateTs(p.data),
      subtotal: (p) => Number(p.subtotal) || 0,
    });
  }, [parts, partsTerm, partsSort]);
  const visiblePartsTotal = useMemo(
    () =>
      visibleParts.reduce(
        (s, p) => s + Number(p.subtotal || 0),
        0,
      ),
    [visibleParts],
  );

  /* ----------------------------- Horas ------------------------------------ */

  const hourUsers = useMemo(() => {
    const map = new Map<string, number>();
    hourLines.forEach((l) =>
      map.set(
        l.user_nome,
        (map.get(l.user_nome) || 0) + Number(l.hours || 0),
      ),
    );
    return [...map.entries()].sort((a, b) =>
      collator.compare(String(a[0]), String(b[0])),
    );
  }, [hourLines]);

  const visibleHours = useMemo(() => {
    const filtered = hourLines.filter((l) => {
      if (userFilter && l.user_nome !== userFilter) return false;
      if (onlyMissingRate && Number(l.rate) > 0) return false;
      return true;
    });
    return sortRows(filtered, hoursSort, {
      user: (l) => String(l.user_nome ?? ""),
      data: (l) => dateTs(l.data),
      horas: (l) => Number(l.hours) || 0,
      preco: (l) => Number(l.rate) || 0,
      subtotal: (l) => Number(l.subtotal) || 0,
    });
  }, [hourLines, userFilter, onlyMissingRate, hoursSort]);

  const hoursFiltered = userFilter !== "" || onlyMissingRate;
  const visibleHoursSum = useMemo(
    () =>
      visibleHours.reduce(
        (acc, l) => ({
          hours: acc.hours + Number(l.hours || 0),
          subtotal: acc.subtotal + Number(l.subtotal || 0),
        }),
        { hours: 0, subtotal: 0 },
      ),
    [visibleHours],
  );

  const applyBulkRate = async () => {
    const rate = Number(String(bulkRate).replace(",", "."));
    if (!(rate > 0)) {
      notify("Indica um preço/hora válido.", { tone: "error" });
      return;
    }
    const targets = visibleHours.filter(
      (l) => bulkOverwrite || !(Number(l.rate) > 0),
    );
    if (targets.length === 0) {
      notify("Não há linhas para atualizar.", { tone: "info" });
      return;
    }
    setBulkSaving(true);
    const ids = new Set(targets.map((t) => t.id));
    setHourLines((cur) =>
      cur.map((l) =>
        ids.has(l.id)
          ? { ...l, rate, subtotal: Number(l.hours) * rate }
          : l,
      ),
    );
    setRateEpoch((n) => n + 1);
    const results = await Promise.allSettled(
      targets.map((t) => accountingAPI.saveHourRate(t.id, rate)),
    );
    const failed = results.filter(
      (r) => r.status === "rejected",
    ).length;
    if (failed > 0) {
      notify(
        `${failed} de ${targets.length} linhas não foram guardadas. A recarregar…`,
        { tone: "error" },
      );
      await loadAll(true);
    } else {
      notify(
        `Preço/hora de ${formatEuro(rate)} aplicado a ${targets.length} ${
          targets.length === 1 ? "linha" : "linhas"
        }.`,
        { tone: "success" },
      );
      setBulkRate("");
    }
    setBulkSaving(false);
  };

  /* ------------------------- Outros custos -------------------------------- */

  const extraCategories = useMemo(() => {
    const set = new Set<string>();
    extraCosts.forEach((e) => {
      if (e.categoria) set.add(String(e.categoria));
    });
    return [...set].sort((a, b) => collator.compare(a, b));
  }, [extraCosts]);

  const visibleExtras = useMemo(() => {
    const filtered = categoryFilter
      ? extraCosts.filter((e) => e.categoria === categoryFilter)
      : extraCosts;
    return sortRows(filtered, extrasSort, {
      desc: (e) => String(e.descricao ?? ""),
      cat: (e) => String(e.categoria ?? ""),
      valor: (e) => Number(e.valor) || 0,
    });
  }, [extraCosts, categoryFilter, extrasSort]);

  // Se a categoria filtrada desaparecer, limpa o filtro
  useEffect(() => {
    if (categoryFilter && !extraCategories.includes(categoryFilter))
      setCategoryFilter("");
  }, [categoryFilter, extraCategories]);

  const askDeleteExtra = (id: string) => {
    setConfirmDeleteId(id);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(
      () => setConfirmDeleteId(null),
      4000,
    );
  };

  const handleDeleteExtra = async (e: any) => {
    setConfirmDeleteId(null);
    setDeletingId(e.id);
    try {
      await accountingAPI.deleteExtraCost(e.id);
      await loadExtras();
      notify(`Custo "${e.descricao}" eliminado.`, {
        actionLabel: "Desfazer",
        onAction: async () => {
          try {
            await accountingAPI.addExtraCost(
              job.id,
              e.descricao,
              e.categoria ?? "",
              Number(e.valor) || 0,
            );
            await loadExtras();
            notify("Custo restaurado.", { tone: "success" });
          } catch (error) {
            console.error("Erro ao restaurar custo:", error);
            notify("Não foi possível restaurar o custo.", {
              tone: "error",
            });
          }
        },
      });
    } catch (error) {
      console.error("Erro ao eliminar custo:", error);
      notify("Erro ao eliminar o custo.", { tone: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  /* ----------------------------- Exportar --------------------------------- */

  const copySummary = async () => {
    const text = [
      `${job.title}${job.reference ? ` (${job.reference})` : ""}`,
      `Peças e materiais: ${formatEuro(totalParts)}`,
      `Horas trabalhadas (${formatHours(totalHoursWorked)}): ${formatEuro(totalHours)}`,
      `Outros custos: ${formatEuro(totalExtras)}`,
      `Custo total: ${formatEuro(grandTotal)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify("Não foi possível copiar o resumo.", {
        tone: "error",
      });
    }
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push([`Projeto: ${job.title}`, job.reference || ""]);
    rows.push([]);
    rows.push(["PEÇAS E MATERIAIS"]);
    rows.push([
      "Artigo",
      "Quantidade",
      "Preço Unitário",
      "Data",
      "Subtotal",
    ]);
    parts.forEach((p) =>
      rows.push([
        p.item_nome,
        p.quantidade,
        csvNumber(p.preco_unitario),
        formatDatePt(p.data),
        csvNumber(p.subtotal),
      ]),
    );
    rows.push(["Subtotal peças", "", "", "", csvNumber(totalParts)]);
    rows.push([]);
    rows.push(["HORAS TRABALHADAS"]);
    rows.push([
      "Utilizador",
      "Data",
      "Horas",
      "Preço/Hora",
      "Subtotal",
    ]);
    hourLines.forEach((l) =>
      rows.push([
        l.user_nome,
        formatDatePt(l.data),
        csvNumber(l.hours),
        csvNumber(l.rate),
        csvNumber(l.subtotal),
      ]),
    );
    rows.push([
      "Subtotal horas",
      "",
      csvNumber(totalHoursWorked),
      "",
      csvNumber(totalHours),
    ]);
    rows.push([]);
    rows.push(["OUTROS CUSTOS"]);
    rows.push(["Descrição", "Categoria", "", "", "Valor"]);
    extraCosts.forEach((e) =>
      rows.push([
        e.descricao,
        e.categoria || "-",
        "",
        "",
        csvNumber(Number(e.valor)),
      ]),
    );
    rows.push(["Subtotal outros", "", "", "", csvNumber(totalExtras)]);
    rows.push([]);
    rows.push(["TOTAL GERAL", "", "", "", csvNumber(grandTotal)]);

    downloadCsv(
      `custos-${safeFilename(job.reference || job.title)}.csv`,
      rows,
    );
    notify("CSV exportado.", { tone: "success" });
  };

  const exportDoc = () => {
    const td =
      "padding:8px 12px; border:1px solid #e4e4e7;";
    const tdR = `${td} text-align:right;`;
    const tdRB = `${tdR} font-weight:bold;`;

    const partsRows = parts
      .map(
        (p) => `
        <tr>
          <td style="${td}">${escapeHtml(p.item_nome)}</td>
          <td style="${tdR}">${escapeHtml(p.quantidade)}</td>
          <td style="${tdR}">${formatEuro(p.preco_unitario)}</td>
          <td style="${tdRB}">${formatEuro(p.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const hourRows = hourLines
      .map(
        (l) => `
        <tr>
          <td style="${td}">${escapeHtml(l.user_nome)}</td>
          <td style="${td}">${formatDatePt(l.data)}</td>
          <td style="${tdR}">${formatHours(l.hours)}</td>
          <td style="${tdR}">${formatEuro(l.rate)}</td>
          <td style="${tdRB}">${formatEuro(l.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const extraRows = extraCosts
      .map(
        (e) => `
        <tr>
          <td style="${td}">${escapeHtml(e.descricao)}</td>
          <td style="${td}">${escapeHtml(e.categoria || "-")}</td>
          <td style="${tdRB}">${formatEuro(Number(e.valor))}</td>
        </tr>`,
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8">
        <title>Custos - ${escapeHtml(job.title)}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }
          .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
          .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 0 0 4px; }
          h1 { color: #18181b; margin: 0; font-size: 24px; }
          .meta { color: #71717a; font-size: 12px; margin: 4px 0 0; }
          h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 30px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { background: #f4f4f5; text-align: left; padding: 8px 12px; border: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; color: #71717a; }
        </style>
      </head>
      <body style="padding: 30px 36px;">
        <div class="header">
          <p class="doc-title">Ficha de Custos de Projeto</p>
          <h1>${escapeHtml(job.title)}</h1>
          <p class="meta">${escapeHtml(job.reference || "")}${job.reference ? " · " : ""}Gerado em ${new Date().toLocaleDateString("pt-PT")}</p>
        </div>

        <h2>Peças e Materiais</h2>
        <table>
          <tr><th>Artigo</th><th style="text-align:right;">Quantidade</th><th style="text-align:right;">Preço Unit.</th><th style="text-align:right;">Subtotal</th></tr>
          ${partsRows || `<tr><td colspan="4" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem peças registadas</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Peças: ${formatEuro(totalParts)}</p>

        <h2>Horas Trabalhadas</h2>
        <table>
          <tr><th>Utilizador</th><th>Data</th><th style="text-align:right;">Horas</th><th style="text-align:right;">Preço/Hora</th><th style="text-align:right;">Subtotal</th></tr>
          ${hourRows || `<tr><td colspan="5" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem horas registadas</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Horas (${formatHours(totalHoursWorked)}): ${formatEuro(totalHours)}</p>

        <h2>Outros Custos</h2>
        <table>
          <tr><th>Descrição</th><th>Categoria</th><th style="text-align:right;">Valor</th></tr>
          ${extraRows || `<tr><td colspan="3" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem custos adicionais</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Outros: ${formatEuro(totalExtras)}</p>

        <table style="margin-top:30px; width:100%; border-collapse:collapse;">
          <tr>
            <td style="background:#18181b; color:#a1a1aa; padding:16px 20px; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Custo Total do Projeto</td>
            <td style="background:#18181b; color:#ffffff; padding:16px 20px; font-size:22px; font-weight:bold; text-align:right;">${formatEuro(grandTotal)}</td>
          </tr>
        </table>
      </body>
      </html>
    `;
    triggerDownload(
      new Blob(["\uFEFF", html], { type: "application/msword" }),
      `custos-${safeFilename(job.reference || job.title)}.doc`,
    );
    notify("Documento Word exportado.", { tone: "success" });
  };

  /* ----------------------------- Estados ---------------------------------- */

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 erp-surface text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Não foi possível carregar a ficha de custos.
        </p>
        <Button
          variant="outline"
          className="h-8 text-xs"
          onClick={() => loadAll()}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const thBase = "px-4 py-2";
  const theadCls =
    "bg-zinc-50 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400";

  return (
    <div className="space-y-5">
      {/* Header do projeto + total */}
      <div className="z-20 overflow-hidden erp-surface lg:sticky lg:top-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                {job.reference}
              </p>
              <Badge
                className={
                  job.status === "concluido"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }
              >
                {job.status === "concluido"
                  ? "Concluído"
                  : "Em Curso"}
              </Badge>
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
              {job.title}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-9 px-2.5"
              onClick={() => loadAll(true)}
              disabled={reloading}
              title="Atualizar dados do projeto"
              aria-label="Atualizar dados do projeto"
            >
              <RefreshCw
                className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              className="h-9"
              onClick={copySummary}
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button
              variant="outline"
              className="h-9"
              onClick={exportCsv}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              className="h-9"
              onClick={exportDoc}
            >
              <FileText className="mr-2 h-4 w-4" />
              Word
            </Button>
            <Dialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-600">
                    Eliminar Projeto
                  </DialogTitle>
                </DialogHeader>
                <DeleteProjectDialog
                  job={job}
                  notify={notify}
                  onClose={() => setDeleteOpen(false)}
                  onDeleted={onJobDeleted}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-3 bg-zinc-900 px-5 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Custo Total do Projeto
              </span>
              <p className="mt-0.5 text-xs text-zinc-500">
                {parts.length} {parts.length === 1 ? "peça" : "peças"}{" "}
                · {formatHours(totalHoursWorked)} ·{" "}
                {extraCosts.length}{" "}
                {extraCosts.length === 1 ? "extra" : "extras"}
              </p>
            </div>
            <span className="text-2xl font-bold text-white">
              {formatEuro(grandTotal)}
            </span>
          </div>

          {/* Distribuição dos custos */}
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800"
            role="img"
            aria-label="Distribuição dos custos"
          >
            {grandTotal > 0 &&
              distribution.map(
                (s) =>
                  s.pct > 0 && (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => focusSection(s.key)}
                      style={{ width: `${s.pct}%` }}
                      className={`${s.bar} h-full transition-all hover:brightness-125`}
                      title={`${s.label}: ${formatEuro(s.value)} (${s.pct.toFixed(0)}%)`}
                      aria-label={`Ir para ${s.label}`}
                    />
                  ),
              )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {distribution.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => focusSection(s.key)}
                className="group flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <span
                  className={`h-2 w-2 rounded-full ${s.bar}`}
                />
                {s.label}
                <span className="font-medium text-zinc-200">
                  {formatEuro(s.value)}
                </span>
                <span className="text-zinc-500">
                  {s.pct.toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Aviso de linhas de horas sem preço */}
      {missingRateCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {missingRateCount}{" "}
            {missingRateCount === 1
              ? "linha de horas está"
              : "linhas de horas estão"}{" "}
            sem preço/hora — o custo total pode estar
            subestimado.
          </div>
          <Button
            variant="outline"
            className="h-8 border-amber-300 text-xs"
            onClick={() => {
              setOnlyMissingRate(true);
              setUserFilter("");
              focusSection("hours");
            }}
          >
            Ver linhas
          </Button>
        </div>
      )}

      {/* Peças */}
      <SectionCard
        icon={<Package className="h-4 w-4" />}
        title="Peças e Materiais"
        count={parts.length}
        total={totalParts}
        open={open.parts}
        onToggle={() => toggleSection("parts")}
        sectionRef={partsRef}
      >
        {parts.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem peças atribuídas a este projeto.
          </p>
        ) : (
          <>
            {parts.length > 6 && (
              <div className="border-b border-zinc-100 px-5 py-2.5 dark:border-zinc-800">
                <div className="relative max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={partsSearch}
                    onChange={(e) =>
                      setPartsSearch(e.target.value)
                    }
                    placeholder="Procurar peça…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={theadCls}>
                  <tr>
                    <SortTh
                      label="Artigo"
                      sortKey="item"
                      sort={partsSort}
                      onSort={togglePartsSort}
                      className="px-5 py-2"
                    />
                    <SortTh
                      label="Qtd."
                      sortKey="qtd"
                      sort={partsSort}
                      onSort={togglePartsSort}
                      right
                      className={thBase}
                    />
                    <SortTh
                      label="Preço Unit."
                      sortKey="preco"
                      sort={partsSort}
                      onSort={togglePartsSort}
                      right
                      className={thBase}
                    />
                    <SortTh
                      label="Subtotal"
                      sortKey="subtotal"
                      sort={partsSort}
                      onSort={togglePartsSort}
                      right
                      className="px-5 py-2"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {visibleParts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                        <Highlight
                          text={p.item_nome}
                          term={partsTerm}
                        />
                        {p.data && (
                          <span className="ml-2 text-[11px] text-zinc-400">
                            {formatDatePt(p.data)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                        {p.quantidade}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                        {formatEuro(p.preco_unitario)}
                      </td>
                      <td className="px-5 py-2 text-right text-sm font-medium text-foreground">
                        {formatEuro(p.subtotal)}
                      </td>
                    </tr>
                  ))}
                  {visibleParts.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-5 text-center text-sm text-zinc-400"
                      >
                        Nenhuma peça corresponde à pesquisa.{" "}
                        <button
                          type="button"
                          className="font-medium text-red-600 hover:underline"
                          onClick={() => setPartsSearch("")}
                        >
                          Limpar
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                {partsTerm && visibleParts.length > 0 && (
                  <tfoot>
                    <tr className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                      <td className="px-5 py-2" colSpan={3}>
                        {visibleParts.length} de {parts.length}{" "}
                        peças filtradas
                      </td>
                      <td className="px-5 py-2 text-right font-semibold">
                        {formatEuro(visiblePartsTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {/* Horas trabalhadas */}
      <SectionCard
        icon={<Clock3 className="h-4 w-4" />}
        title="Horas Trabalhadas"
        count={hourLines.length}
        total={totalHours}
        open={open.hours}
        onToggle={() => toggleSection("hours")}
        sectionRef={hoursRef}
      >
        {hourLines.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem horas registadas para este projeto.
          </p>
        ) : (
          <>
            {/* Filtros */}
            <div className="space-y-2.5 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip
                  active={userFilter === "" && !onlyMissingRate}
                  onClick={() => {
                    setUserFilter("");
                    setOnlyMissingRate(false);
                  }}
                >
                  Todos · {formatHours(totalHoursWorked)}
                </Chip>
                {hourUsers.length > 1 &&
                  hourUsers.map(([name, hrs]) => (
                    <Chip
                      key={name}
                      active={userFilter === name}
                      onClick={() =>
                        setUserFilter(
                          userFilter === name ? "" : name,
                        )
                      }
                    >
                      {name} · {formatHours(hrs)}
                    </Chip>
                  ))}
                {missingRateCount > 0 && (
                  <Chip
                    tone="warning"
                    active={onlyMissingRate}
                    onClick={() =>
                      setOnlyMissingRate((v) => !v)
                    }
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Sem preço · {missingRateCount}
                  </Chip>
                )}
              </div>

              {/* Preço/hora em massa */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Aplicar preço/hora às linhas visíveis:</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyBulkRate();
                  }}
                  placeholder="0.00"
                  className="h-8 w-24 text-right"
                  aria-label="Preço por hora a aplicar"
                />
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={bulkOverwrite}
                    onChange={(e) =>
                      setBulkOverwrite(e.target.checked)
                    }
                    className="h-3.5 w-3.5 accent-red-600"
                  />
                  Substituir preços existentes
                </label>
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={applyBulkRate}
                  disabled={bulkSaving || !bulkRate}
                >
                  {bulkSaving && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Aplicar
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={theadCls}>
                  <tr>
                    <SortTh
                      label="Utilizador"
                      sortKey="user"
                      sort={hoursSort}
                      onSort={toggleHoursSort}
                      className="px-5 py-2"
                    />
                    <SortTh
                      label="Data"
                      sortKey="data"
                      sort={hoursSort}
                      onSort={toggleHoursSort}
                      className={thBase}
                    />
                    <SortTh
                      label="Horas"
                      sortKey="horas"
                      sort={hoursSort}
                      onSort={toggleHoursSort}
                      right
                      className={thBase}
                    />
                    <SortTh
                      label="Preço/Hora"
                      sortKey="preco"
                      sort={hoursSort}
                      onSort={toggleHoursSort}
                      right
                      className={thBase}
                    />
                    <SortTh
                      label="Subtotal"
                      sortKey="subtotal"
                      sort={hoursSort}
                      onSort={toggleHoursSort}
                      right
                      className="px-5 py-2"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {visibleHours.map((l) => (
                    <HourRow
                      key={`${l.id}-${rateEpoch}`}
                      line={l}
                      onRateChange={handleRateChange}
                      onRateSave={handleRateSave}
                    />
                  ))}
                  {visibleHours.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-5 text-center text-sm text-zinc-400"
                      >
                        Nenhuma linha corresponde ao filtro.{" "}
                        <button
                          type="button"
                          className="font-medium text-red-600 hover:underline"
                          onClick={() => {
                            setUserFilter("");
                            setOnlyMissingRate(false);
                          }}
                        >
                          Limpar filtro
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                {hoursFiltered && visibleHours.length > 0 && (
                  <tfoot>
                    <tr className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                      <td className="px-5 py-2" colSpan={2}>
                        {visibleHours.length} de{" "}
                        {hourLines.length} linhas filtradas
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatHours(visibleHoursSum.hours)}
                      </td>
                      <td />
                      <td className="px-5 py-2 text-right font-semibold">
                        {formatEuro(visibleHoursSum.subtotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {/* Outros custos */}
      <SectionCard
        icon={<Calculator className="h-4 w-4" />}
        title="Outros Custos"
        count={extraCosts.length}
        total={totalExtras}
        open={open.extras}
        onToggle={() => toggleSection("extras")}
        sectionRef={extrasRef}
        actions={
          <Dialog open={addExtraOpen} onOpenChange={setAddExtraOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 bg-red-600 text-xs text-white hover:bg-red-700"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Custo</DialogTitle>
              </DialogHeader>
              <ExtraCostForm
                jobId={job.id}
                categories={extraCategories}
                notify={notify}
                onClose={() => setAddExtraOpen(false)}
                onSaved={loadExtras}
              />
            </DialogContent>
          </Dialog>
        }
      >
        {extraCosts.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-zinc-400">
              Sem custos adicionais registados.
            </p>
            <Button
              variant="outline"
              className="mt-3 h-8 text-xs"
              onClick={() => setAddExtraOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar o primeiro custo
            </Button>
          </div>
        ) : (
          <>
            {extraCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <Chip
                  active={categoryFilter === ""}
                  onClick={() => setCategoryFilter("")}
                >
                  Todas
                </Chip>
                {extraCategories.map((c) => (
                  <Chip
                    key={c}
                    active={categoryFilter === c}
                    onClick={() =>
                      setCategoryFilter(
                        categoryFilter === c ? "" : c,
                      )
                    }
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={theadCls}>
                  <tr>
                    <SortTh
                      label="Descrição"
                      sortKey="desc"
                      sort={extrasSort}
                      onSort={toggleExtrasSort}
                      className="px-5 py-2"
                    />
                    <SortTh
                      label="Categoria"
                      sortKey="cat"
                      sort={extrasSort}
                      onSort={toggleExtrasSort}
                      className={thBase}
                    />
                    <SortTh
                      label="Valor"
                      sortKey="valor"
                      sort={extrasSort}
                      onSort={toggleExtrasSort}
                      right
                      className={thBase}
                    />
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {visibleExtras.map((e: any) => (
                    <tr key={e.id}>
                      <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                        {e.descricao}
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {e.categoria || "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-foreground">
                        {formatEuro(Number(e.valor))}
                      </td>
                      <td className="px-5 py-2 text-right">
                        {confirmDeleteId === e.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-7 bg-red-600 px-2 text-xs text-white hover:bg-red-700"
                              onClick={() =>
                                handleDeleteExtra(e)
                              }
                            >
                              Eliminar?
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() =>
                                setConfirmDeleteId(null)
                              }
                              aria-label="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            onClick={() => askDeleteExtra(e.id)}
                            disabled={deletingId === e.id}
                            aria-label={`Eliminar ${e.descricao}`}
                          >
                            {deletingId === e.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {categoryFilter && (
                  <tfoot>
                    <tr className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                      <td className="px-5 py-2" colSpan={2}>
                        {visibleExtras.length} de{" "}
                        {extraCosts.length} custos em “
                        {categoryFilter}”
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatEuro(
                          visibleExtras.reduce(
                            (s, e) => s + Number(e.valor || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formulário de novo custo                                                  */
/* -------------------------------------------------------------------------- */

function ExtraCostForm({
  jobId,
  categories,
  notify,
  onClose,
  onSaved,
}: {
  jobId: string;
  categories: string[];
  notify: Notify;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (valor === "" || !(Number(valor) >= 0)) {
      notify("Indica um valor válido.", { tone: "error" });
      return;
    }
    setLoading(true);
    try {
      await accountingAPI.addExtraCost(
        jobId,
        descricao.trim(),
        categoria.trim(),
        Number(valor) || 0,
      );
      await onSaved();
      notify("Custo adicionado.", { tone: "success" });
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar custo:", error);
      notify("Erro ao adicionar custo.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Transporte de material"
          autoFocus
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ex: Logística"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (€) *</Label>
          <Input
            id="valor"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />
        </div>
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400">
            Categorias usadas:
          </span>
          {categories.slice(0, 8).map((c) => (
            <Chip
              key={c}
              active={categoria === c}
              onClick={() => setCategoria(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      )}
      <DialogFooter className="mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading || !descricao.trim()}
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Adicionar
        </Button>
      </DialogFooter>
    </form>
  );
}