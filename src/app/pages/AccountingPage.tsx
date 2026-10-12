// src/app/pages/AccountingPage.tsx

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  memo,
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
} from "lucide-react";

const PAGE_SIZE = 50;

type StatusFilter = "todos" | "em_curso" | "concluido";
type SortOption =
  "recentes" | "antigos" | "titulo" | "referencia";

// Criados uma única vez: localeCompare cria um Collator novo a cada chamada,
// o que pesa muito ao ordenar milhares de projetos
const collator = new Intl.Collator("pt");
const collatorNumerico = new Intl.Collator("pt", {
  numeric: true,
});

function formatEuro(value: number) {
  return `${value.toFixed(2)} €`;
}

function formatDatePt(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-PT");
}

// Pesquisa sem acentos e sem maiúsculas ("maquina" encontra "Máquina")
function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function jobDate(job: any): number {
  const raw = job.created_at || job.data_inicio || job.date;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function downloadCsv(
  filename: string,
  headers: string[],
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
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ];
  const csvContent = "﻿" + lines.join("\r\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AccountingPage() {
  const { currentUser } = useApp();
  const hasAccess =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio";

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] =
    useState<string>("");

  // Filtros
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");
  const [sortBy, setSortBy] = useState<SortOption>("recentes");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Só a lista de projetos é pedida à entrada (os custos de cada projeto
  // são pedidos quando o projeto é selecionado)
  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const jobsData = await jobsAPI.getAll();
        if (!cancelled) setJobs(jobsData);
      } catch (error) {
        console.error("Erro ao carregar projetos:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  // Volta ao início da lista sempre que um filtro muda
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, statusFilter, sortBy]);

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

  const statusCounts = useMemo(() => {
    const concluido = jobs.filter(
      (j) => j.status === "concluido",
    ).length;
    return {
      todos: jobs.length,
      concluido,
      em_curso: jobs.length - concluido,
    };
  }, [jobs]);

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

  const filteredJobs = useMemo(() => {
    const term = normalize(deferredSearch);
    return sortedJobs
      .filter(({ job, titulo, ref }) => {
        if (
          statusFilter === "concluido" &&
          job.status !== "concluido"
        )
          return false;
        if (
          statusFilter === "em_curso" &&
          job.status === "concluido"
        )
          return false;
        if (!term) return true;
        return titulo.includes(term) || ref.includes(term);
      })
      .map((r) => r.job);
  }, [sortedJobs, deferredSearch, statusFilter]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);
  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "todos";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("todos");
  };

  const selectedJob = useMemo(
    () => jobs.find((j: any) => j.id === selectedJobId),
    [jobs, selectedJobId],
  );

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
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
          FINANCEIRO
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Contabilidade de Projetos
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Consulta o custo total de cada máquina/projeto: horas
          trabalhadas, peças utilizadas e outros custos.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Lista de projetos */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
          {/* Filtros */}
          <div className="space-y-3 border-b border-zinc-100 p-3 dark:border-zinc-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar por título ou referência"
                className="h-9 pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {filteredJobs.length} de {jobs.length}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
              carregar…
            </div>
          ) : jobs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">
              Nenhum projeto encontrado.
            </p>
          ) : filteredJobs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-500">
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
            <div className="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800 max-lg:max-h-[28rem]">
              {visibleJobs.map((job: any) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`block w-full px-4 py-3 text-left transition-colors ${
                    selectedJobId === job.id
                      ? "bg-red-50 dark:bg-red-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <p
                    className={`truncate text-sm font-medium ${
                      selectedJobId === job.id
                        ? "text-red-700 dark:text-red-400"
                        : "text-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    {job.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-[11px] text-zinc-400">
                      {job.reference}
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
              ))}

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
        {selectedJob ? (
          <JobCostSheet
            key={selectedJob.id}
            job={selectedJob}
            onJobDeleted={() =>
              handleJobDeleted(selectedJob.id)
            }
          />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            Seleciona um projeto para veres os custos.
          </div>
        )}
      </section>
    </div>
  );
}

function DeleteProjectDialog({
  job,
  onClose,
  onDeleted,
}: {
  job: any;
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

  const verificationRequired = job.title || job.reference;

  const handleDelete = async () => {
    if (verificationText !== verificationRequired) {
      alert(`Por favor, escreve: ${verificationRequired}`);
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.deleteJob(job.id);
      alert("Projeto eliminado com sucesso.");
      onClose();
      onDeleted();
    } catch (error) {
      console.error("Erro ao eliminar projeto:", error);
      alert("Erro ao eliminar projeto.");
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
          <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
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
    <div className="space-y-4">
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
        className="border-red-300"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            setStep("initial");
            setVerificationText("");
          }}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
        >
          Voltar
        </button>
        <button
          onClick={handleDelete}
          disabled={
            loading || verificationText !== verificationRequired
          }
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
          )}
          {loading ? "A eliminar..." : "Eliminar para sempre"}
        </button>
      </div>
    </div>
  );
}

// Linha da tabela de horas. Está em memo para que, ao escrever o preço/hora
// de uma linha, só essa linha seja desenhada de novo.
const HourRow = memo(function HourRow({
  line,
  saving,
  onRateChange,
  onRateBlur,
}: {
  line: any;
  saving: boolean;
  onRateChange: (lineId: string, value: string) => void;
  onRateBlur: (lineId: string, rate: number) => void;
}) {
  return (
    <tr>
      <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
        {line.user_nome}
      </td>
      <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
        {formatDatePt(line.data)}
      </td>
      <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
        {line.hours.toFixed(2)}h
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Input
            type="number"
            min="0"
            step="0.01"
            defaultValue={line.rate || ""}
            onChange={(e) =>
              onRateChange(line.id, e.target.value)
            }
            onBlur={(e) =>
              onRateBlur(line.id, Number(e.target.value) || 0)
            }
            className="h-8 w-24 text-right"
            placeholder="0.00"
          />
          {saving && (
            <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
          )}
        </div>
      </td>
      <td className="px-5 py-2 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {formatEuro(line.subtotal)}
      </td>
    </tr>
  );
});

function JobCostSheet({
  job,
  onJobDeleted,
}: {
  job: any;
  onJobDeleted: () => void;
}) {
  const [parts, setParts] = useState<any[]>([]);
  const [hourLines, setHourLines] = useState<any[]>([]);
  const [extraCosts, setExtraCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addExtraOpen, setAddExtraOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savingRateId, setSavingRateId] = useState<
    string | null
  >(null);

  // Carga inicial: peças, horas e outros custos em paralelo
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [partsData, hourData, extraData] =
          await Promise.all([
            accountingAPI.getPartsForJob(job.id),
            accountingAPI.getHourLinesForJob(job.id),
            accountingAPI.getExtraCosts(job.id),
          ]);
        if (cancelled) return;
        setParts(partsData);
        setHourLines(hourData);
        setExtraCosts(extraData);
      } catch (error) {
        console.error("Erro ao carregar custos:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  // Adicionar ou eliminar um custo só mexe nos outros custos,
  // por isso só estes são pedidos de novo
  const loadExtras = useCallback(async () => {
    try {
      setExtraCosts(await accountingAPI.getExtraCosts(job.id));
    } catch (error) {
      console.error("Erro ao carregar outros custos:", error);
    }
  }, [job.id]);

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

  const handleRateBlur = useCallback(
    async (lineId: string, rate: number) => {
      setSavingRateId(lineId);
      try {
        await accountingAPI.saveHourRate(lineId, rate);
      } catch (error) {
        console.error("Erro ao guardar preço/hora:", error);
      } finally {
        setSavingRateId(null);
      }
    },
    [],
  );

  const handleDeleteExtra = async (id: string) => {
    if (confirm("Eliminar este custo?")) {
      await accountingAPI.deleteExtraCost(id);
      await loadExtras();
    }
  };

  const totalParts = useMemo(
    () => parts.reduce((sum, p) => sum + p.subtotal, 0),
    [parts],
  );
  const totalHours = useMemo(
    () => hourLines.reduce((sum, l) => sum + l.subtotal, 0),
    [hourLines],
  );
  const totalExtras = useMemo(
    () =>
      extraCosts.reduce((sum, e) => sum + Number(e.valor), 0),
    [extraCosts],
  );
  const grandTotal = totalParts + totalHours + totalExtras;

  const exportCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push(["PEÇAS", "", "", "", ""]);
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
        p.preco_unitario.toFixed(2),
        formatDatePt(p.data),
        p.subtotal.toFixed(2),
      ]),
    );
    rows.push(["", "", "", "", ""]);
    rows.push(["HORAS TRABALHADAS", "", "", "", ""]);
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
        l.hours.toFixed(2),
        l.rate.toFixed(2),
        l.subtotal.toFixed(2),
      ]),
    );
    rows.push(["", "", "", "", ""]);
    rows.push(["OUTROS CUSTOS", "", "", "", ""]);
    rows.push(["Descrição", "Categoria", "", "", "Valor"]);
    extraCosts.forEach((e) =>
      rows.push([
        e.descricao,
        e.categoria || "-",
        "",
        "",
        Number(e.valor).toFixed(2),
      ]),
    );
    rows.push(["", "", "", "", ""]);
    rows.push([
      "TOTAL GERAL",
      "",
      "",
      "",
      grandTotal.toFixed(2),
    ]);

    downloadCsv(
      `custos-${job.reference || job.title}.csv`,
      ["Item", "Col2", "Col3", "Col4", "Valor"],
      rows,
    );
  };

  const exportDoc = () => {
    const partsRows = parts
      .map(
        (p) => `
        <tr>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${p.item_nome}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${p.quantidade}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${formatEuro(p.preco_unitario)}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right; font-weight:bold;">${formatEuro(p.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const hourRows = hourLines
      .map(
        (l) => `
        <tr>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${l.user_nome}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${formatDatePt(l.data)}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${l.hours.toFixed(2)}h</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${formatEuro(l.rate)}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right; font-weight:bold;">${formatEuro(l.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const extraRows = extraCosts
      .map(
        (e) => `
        <tr>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${e.descricao}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${e.categoria || "-"}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right; font-weight:bold;">${formatEuro(Number(e.valor))}</td>
        </tr>`,
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8">
        <title>Custos - ${job.title}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }
          .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
          .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 0 0 4px; }
          h1 { color: #18181b; margin: 0; font-size: 24px; }
          h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 30px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { background: #f4f4f5; text-align: left; padding: 8px 12px; border: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; color: #71717a; }
          .total-box { margin-top: 30px; padding: 16px 20px; background: #18181b; color: #ffffff; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
          .total-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a1a1aa; }
          .total-box .value { font-size: 22px; font-weight: bold; color: #ffffff; }
        </style>
      </head>
      <body style="padding: 30px 36px;">
        <div class="header">
          <p class="doc-title">Ficha de Custos de Projeto</p>
          <h1>${job.title}</h1>
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
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Horas: ${formatEuro(totalHours)}</p>

        <h2>Outros Custos</h2>
        <table>
          <tr><th>Descrição</th><th>Categoria</th><th style="text-align:right;">Valor</th></tr>
          ${extraRows || `<tr><td colspan="3" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem custos adicionais</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Outros: ${formatEuro(totalExtras)}</p>

        <div class="total-box">
          <span class="label">Custo Total do Projeto</span>
          <span class="value">${formatEuro(grandTotal)}</span>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(["﻿", html], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custos-${job.reference || job.title}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
        carregar ficha de custos…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header do projeto + total */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              {job.reference}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {job.title}
            </h2>
          </div>
          <div className="flex gap-2">
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
                  onClose={() => setDeleteOpen(false)}
                  onDeleted={onJobDeleted}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex items-center justify-between bg-zinc-900 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Custo Total do Projeto
          </span>
          <span className="text-2xl font-bold text-white">
            {formatEuro(grandTotal)}
          </span>
        </div>
      </div>

      {/* Peças */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Peças e Materiais
            </h3>
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {formatEuro(totalParts)}
          </span>
        </div>
        {parts.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem peças atribuídas a este projeto.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2">Artigo</th>
                <th className="px-4 py-2 text-right">Qtd.</th>
                <th className="px-4 py-2 text-right">
                  Preço Unit.
                </th>
                <th className="px-5 py-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                    {p.item_nome}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {p.quantidade}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {formatEuro(p.preco_unitario)}
                  </td>
                  <td className="px-5 py-2 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatEuro(p.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Horas trabalhadas */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Horas Trabalhadas
            </h3>
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {formatEuro(totalHours)}
          </span>
        </div>
        {hourLines.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem horas registadas para este projeto.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2">Utilizador</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2 text-right">Horas</th>
                <th className="px-4 py-2 text-right">
                  Preço/Hora
                </th>
                <th className="px-5 py-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {hourLines.map((l) => (
                <HourRow
                  key={l.id}
                  line={l}
                  saving={savingRateId === l.id}
                  onRateChange={handleRateChange}
                  onRateBlur={handleRateBlur}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Outros custos */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Outros Custos
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {formatEuro(totalExtras)}
            </span>
            <Dialog
              open={addExtraOpen}
              onOpenChange={setAddExtraOpen}
            >
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
                  onClose={() => setAddExtraOpen(false)}
                  onSaved={loadExtras}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {extraCosts.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem custos adicionais registados.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2">Descrição</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {extraCosts.map((e: any) => (
                <tr key={e.id}>
                  <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                    {e.descricao}
                  </td>
                  <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {e.categoria || "-"}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatEuro(Number(e.valor))}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      onClick={() => handleDeleteExtra(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ExtraCostForm({
  jobId,
  onClose,
  onSaved,
}: {
  jobId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await accountingAPI.addExtraCost(
        jobId,
        descricao,
        categoria,
        Number(valor) || 0,
      );
      await onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar custo:", error);
      alert("Erro ao adicionar custo.");
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
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />
        </div>
      </div>
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
          disabled={loading}
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