// src/app/pages/JobsPage.tsx

import { useState, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import {
  jobsAPI,
  productionTasksAPI,
  calcJobHoursConsumed,
  CHECKLIST_LABELS,
  DEPARTMENT_CHECKLIST_MAP,
  type JobFilters,
  type JobStatusFilter,
} from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { proximoNumeroReferencia } from "../api";
import {
  TIPOS_LISTA,
  TIPOS_REFERENCIA,
  montarCodigo,
  type TipoReferencia,
} from "../referencias";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  Loader2,
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;

export const DEPARTMENTS = [
  "FABRICA",
  "OFICINA",
  "LOJA",
  "MAQUINACAO",
  "ASSISTENCIA",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Vêm do api.ts; reexportados para outras páginas que os importem daqui
export { CHECKLIST_LABELS, DEPARTMENT_CHECKLIST_MAP };

const STATUS_OPTIONS: {
  value: JobStatusFilter;
  label: string;
}[] = [
  { value: "em_curso", label: "Em curso" },
  { value: "atrasados", label: "Fora do prazo" },
  { value: "concluido", label: "Concluídos" },
  { value: "todos", label: "Todos" },
];

const extractReferenceType = (reference: string): string => {
  if (!reference) return "";

  const parts = reference.trim().split("/");
  return parts[0]?.toUpperCase() || "";
};

const extractReferenceYear = (reference: string): string => {
  if (!reference) return "";

  const parts = reference.trim().split("/");
  return parts[1] || "";
};

const extractReferenceNumber = (reference: string): string => {
  if (!reference) return "";

  const parts = reference.trim().split("/");
  return parts[2] || "";
};

const DEFAULT_FILTERS: Required<JobFilters> = {
  status: "em_curso",
  search: "",
  referenceType: "",
  referenceYear: "",
  referenceNumber: "",
  department: "todos",
  assigneeId: "",
};

const FRESAVE_LOGO_URL =
  "https://static.wixstatic.com/media/a7ac0c_09785672c3cb48039040f69fa2685900~mv2_d_6384_2650_s_4_2.png/v1/fill/w_200,h_78,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Fresave%20Logotipo.png";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const localDateTimeInput = (existing?: string) => {
  if (existing) {
    const d = new Date(existing);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  const value = new Date();
  value.setHours(value.getHours() + 24);
  return new Date(
    value.getTime() - value.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
};

type Stage = {
  key: string;
  label: string;
  checked: boolean;
  checked_at: string | null;
};

const getStages = (job: any): Stage[] => {
  // Se não tem departamento ou assistência, retorna vazio
  if (!job?.department || job.department === "ASSISTÊNCIA") {
    return [];
  }

  const checklistKeys =
    DEPARTMENT_CHECKLIST_MAP[job.department];

  // Se não encontra o departamento, retorna vazio
  if (!checklistKeys) {
    return [];
  }

  // Mapeia as fases
  return checklistKeys.map((key) => {
    const row = (job.checklist || []).find(
      (c: any) => c.item_key === key,
    );
    return {
      key,
      label: CHECKLIST_LABELS[key] || key,
      checked: Boolean(row?.checked),
      checked_at: row?.checked_at ?? null,
    };
  });
};

function downloadReportDoc(job: any) {
  const checklistRows = getStages(job)
    .map(
      (item, index) => `
        <tr style="background:${index % 2 === 0 ? "#ffffff" : "#fafafa"};">
          <td style="padding:10px 14px; border:1px solid #e4e4e7; font-size:13px;">
            <span style="color:${item.checked ? "#16a34a" : "#a1a1aa"}; font-weight:bold;">
              ${item.checked ? "✓" : "○"}
            </span>
            &nbsp; ${item.label}
          </td>
          <td style="padding:10px 14px; border:1px solid #e4e4e7; font-size:12px; color:#71717a;">
            ${item.checked && item.checked_at ? formatDate(item.checked_at) : "—"}
          </td>
        </tr>`,
    )
    .join("");

  const late =
    job.completed_at &&
    new Date(job.completed_at).getTime() >
      new Date(job.due_date).getTime();

  const generatedAt = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="utf-8">
      <title>Relatório de Produção de Máquina - ${job.title}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }

        .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
        .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 16px 0 4px; }
        h1.main-title { color: #18181b; margin: 0; font-size: 24px; }

        .status-ribbon { border-radius: 6px; padding: 14px 18px; margin-bottom: 26px; }
        .status-ribbon.ok { background: #ecfdf5; border: 1px solid #a7f3d0; }
        .status-ribbon.late { background: #fef2f2; border: 1px solid #fecaca; }
        .status-ribbon .status-text { font-size: 13px; font-weight: bold; }
        .status-ribbon.ok .status-text { color: #065f46; }
        .status-ribbon.late .status-text { color: #991b1b; }
        .status-ribbon .status-sub { font-size: 11px; color: #71717a; margin-top: 2px; }

        .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .meta-grid td { padding: 10px 0; font-size: 13px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
        .meta-label { color: #a1a1aa; width: 170px; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { color: #18181b; }

        h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 34px; margin-bottom: 14px; }

        table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.checklist th { background: #f4f4f5; text-align: left; padding: 10px 14px; border: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #52525b; }

        p.section-text { font-size: 13px; line-height: 1.7; color: #27272a; background: #fafafa; padding: 14px 16px; border-left: 3px solid #dc2626; margin: 0 0 4px; border-radius: 0 4px 4px 0; }

        .footer { border-top: 1px solid #e4e4e7; padding-top: 14px; margin-top: 36px; text-align: center; }
        .footer p { color: #a1a1aa; font-size: 10px; margin: 0; letter-spacing: 0.5px; }
        .footer p.brand { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div style="padding: 30px 36px 10px;">
        <div class="header">
          <img src="${FRESAVE_LOGO_URL}" alt="Fresave" width="150" height="59" style="display:block;" />
          <p class="doc-title">Relatório de Produção de Máquina</p>
          <h1 class="main-title">${job.title}</h1>
        </div>

        <div class="status-ribbon ${late ? "late" : "ok"}">
          <div class="status-text">${late ? "CONCLUÍDO COM ATRASO" : "CONCLUÍDO NO PRAZO"}</div>
          <div class="status-sub">Prazo: ${formatDate(job.due_date)} · Concluído: ${job.completed_at ? formatDate(job.completed_at) : "-"}</div>
        </div>

        <table class="meta-grid">
          <tr><td class="meta-label">Referência</td><td class="meta-value">${job.reference || "-"}</td></tr>
          <tr><td class="meta-label">Tipo</td><td class="meta-value">${job.non_standard ? "Trabalho não tipo" : "Trabalho tipo"}</td></tr>
          <tr><td class="meta-label">Departamento</td><td class="meta-value">${job.department || "-"}</td></tr>
          <tr><td class="meta-label">Funcionários</td><td class="meta-value">${(job.assignees || []).map((a: any) => a.nome).join(", ") || "-"}</td></tr>
        </table>

        <h2>Fases do Projeto</h2>
        <table class="checklist">
          <tr><th>Fase</th><th>Concluída em</th></tr>
          ${checklistRows}
        </table>

        <h2>O Que Correu Bem</h2>
        <p class="section-text">${job.report_went_well || "-"}</p>

        <h2>O Que Correu Mal / Constrangimentos</h2>
        <p class="section-text">${job.report_went_wrong || "-"}</p>

        <h2>Conclusão e Próximos Passos</h2>
        <p class="section-text">${job.report_conclusion || "-"}</p>

        ${
          job.report_delay_reason
            ? `<h2>Motivo do Atraso</h2><p class="section-text">${job.report_delay_reason}</p>`
            : ""
        }

        <div class="footer">
          <p class="brand">FRESAVE</p>
          <p>Documento gerado automaticamente pelo sistema de gestão · ${generatedAt}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${job.reference || job.title}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function JobsPage() {
  const { users, currentUser } = useApp();
  const [jobs, setJobs] = useState<any[]>([]);
  const [availableRefTypes, setAvailableRefTypes] = useState<
    string[]
  >([]);
  const [availableRefSuffixes, setAvailableRefSuffixes] =
    useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [total, setTotal] = useState<number>(0);
  const [counts, setCounts] = useState({
    active: 0,
    overdue: 0,
    completed: 0,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(
    null,
  );
  const [jobToComplete, setJobToComplete] = useState<
    any | null
  >(null);

  const requestId = useRef(0);
  const [jobToDelete, setJobToDelete] = useState<any | null>(
    null,
  );
  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "projeto" ||
    currentUser?.role === "chefe_producao";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters =
    filters.search !== "" ||
    filters.referenceType !== "" ||
    filters.referenceYear !== "" ||
    filters.referenceNumber !== "" ||
    filters.department !== "todos" ||
    filters.assigneeId !== "";

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [types, years] = await Promise.all([
          jobsAPI.getAllReferenceTypes(),
          jobsAPI.getAllReferenceYears(),
        ]);

        setAvailableRefTypes(types);
        setAvailableRefSuffixes(years);
      } catch (error) {
        console.error(
          "Erro ao carregar opções de filtro:",
          error,
        );
      }
    };
    loadFilterOptions();
  }, []);

  const loadTasks = async () => {
    try {
      setTasks(await productionTasksAPI.getAll());
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
    }
  };

  const loadPage = async (silent = false) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const [pageData, countsData] = await Promise.all([
        jobsAPI.getPage(page, PAGE_SIZE, {
          status: filters.status,
          search: filters.search || undefined,

          referenceType: filters.referenceType || undefined,

          referenceYear: filters.referenceYear || undefined,

          referenceNumber: filters.referenceNumber || undefined,

          department:
            filters.department !== "todos"
              ? filters.department
              : undefined,

          assigneeId: filters.assigneeId || undefined,
        }),

        jobsAPI.getCounts(),
      ]);

      if (id !== requestId.current) return;

      const lastPage = Math.max(
        1,
        Math.ceil(pageData.total / PAGE_SIZE),
      );
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setJobs(pageData.jobs);
      setTotal(pageData.total);
      setCounts(countsData);
    } catch (error) {
      console.error("Erro ao carregar trabalhos:", error);
    } finally {
      if (id === requestId.current && !silent)
        setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    loadPage();
  }, [page, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== filters.search) {
        changeFilter({ search: searchInput.trim() });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const changeFilter = (
    patch: Partial<typeof DEFAULT_FILTERS>,
  ) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters((current) => ({
      ...DEFAULT_FILTERS,
      status: current.status,
    }));
    setPage(1);
  };

  const isOverdue = (job: any) => {
    if (job.status !== "em_curso") return false;
    const pastDueDate =
      new Date(job.due_date).getTime() < Date.now();
    if (pastDueDate) return true;
    if (job.max_hours) {
      const consumed = calcJobHoursConsumed(job, tasks);
      return consumed >= Number(job.max_hours);
    }
    return false;
  };

  const isChecklistComplete = (job: any) => {
    const stages = getStages(job);
    // Se não tem fases (assistência), considera completo
    if (stages.length === 0) return true;
    return stages.every((s) => s.checked);
  };

  const handleToggleStage = async (
    jobId: string,
    stageKey: string,
    checked: boolean,
  ) => {
    const checkedAt = checked ? new Date().toISOString() : null;
    setJobs((current) =>
      current.map((job) => {
        if (job.id !== jobId) return job;
        const rows = job.checklist || [];
        const exists = rows.some(
          (r: any) => r.item_key === stageKey,
        );
        const checklist = exists
          ? rows.map((r: any) =>
              r.item_key === stageKey
                ? { ...r, checked, checked_at: checkedAt }
                : r,
            )
          : [
              ...rows,
              {
                item_key: stageKey,
                checked,
                checked_at: checkedAt,
              },
            ];
        return { ...job, checklist };
      }),
    );

    try {
      await jobsAPI.toggleStage(
        jobId,
        stageKey,
        checked,
        currentUser?.id,
      );
    } catch (error) {
      console.error("Erro ao atualizar fase:", error);
      alert("Erro ao atualizar fase.");
    } finally {
      await loadPage(true);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm("Eliminar este trabalho?")) {
      try {
        // O trigger na Supabase transforma isto em soft delete
        await jobsAPI.delete(id);
        await loadPage();
      } catch (error) {
        console.error("Erro ao eliminar trabalho:", error);
        alert("Erro ao eliminar trabalho.");
      }
    }
  };

  const firstShown =
    total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-600 dark:text-amber-300">
            ORDEM DE TRABALHO
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trabalhos e Relatórios
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cada trabalho tem um prazo, as mesmas fases de
            produção e, opcionalmente, um limite de horas. Só é
            possível concluir depois de todas as fases estarem
            marcadas.
          </p>
        </div>
        {canCreate && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) setEditingJob(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="h-10 bg-blue-700 text-white hover:bg-blue-800"
                onClick={() => setEditingJob(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Trabalho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingJob
                    ? "Editar Trabalho"
                    : "Criar Trabalho"}
                </DialogTitle>
              </DialogHeader>
              <JobForm
                job={editingJob}
                users={users}
                onClose={() => {
                  setCreateOpen(false);
                  setEditingJob(null);
                }}
                onSaved={() => loadPage()}
              />
            </DialogContent>
          </Dialog>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <WorkMetric
          label="Em Execução"
          value={counts.active}
          icon={Clock3}
          tone="zinc"
          selected={filters.status === "em_curso"}
          onClick={() => changeFilter({ status: "em_curso" })}
        />
        <WorkMetric
          label="Fora do Prazo"
          value={counts.overdue}
          icon={AlertTriangle}
          tone="red"
          selected={filters.status === "atrasados"}
          onClick={() => changeFilter({ status: "atrasados" })}
        />
        <WorkMetric
          label="Concluídos"
          value={counts.completed}
          icon={CheckCircle2}
          tone="emerald"
          selected={filters.status === "concluido"}
          onClick={() => changeFilter({ status: "concluido" })}
        />
      </section>

      <section className="overflow-hidden erp-surface">
        <div className="space-y-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  changeFilter({ status: option.value })
                }
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filters.status === option.value
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Pesquisar por título ou rastreio"
                className="pl-9"
              />
            </div>

            <select
              value={filters.referenceType}
              onChange={(e) =>
                changeFilter({
                  referenceType: e.target.value,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Tipo de Ref.</option>
              {availableRefTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filters.referenceYear}
              onChange={(e) =>
                changeFilter({
                  referenceYear: e.target.value,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Ano</option>

              {availableRefSuffixes.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <Input
              value={filters.referenceNumber}
              onChange={(e) =>
                changeFilter({
                  referenceNumber: e.target.value,
                })
              }
              placeholder="N.º interno"
              className="h-9"
            />
            <select
              value={filters.department}
              onChange={(e) =>
                changeFilter({ department: e.target.value })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="todos">Todos Depart.</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={filters.assigneeId}
              onChange={(e) =>
                changeFilter({ assigneeId: e.target.value })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Todos Func.</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                className="h-9 text-zinc-500"
              >
                <X className="mr-1.5 h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : jobs.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {jobs.map((job) =>
              job.status === "concluido" ? (
                <CompletedJob key={job.id} job={job} />
              ) : (
                <ActiveJob
                  key={job.id}
                  job={job}
                  overdue={isOverdue(job)}
                  hoursConsumed={calcJobHoursConsumed(
                    job,
                    tasks,
                  )}
                  checklistComplete={isChecklistComplete(job)}
                  canEdit={canCreate}
                  onToggleStage={(key, checked) =>
                    handleToggleStage(job.id, key, checked)
                  }
                  onComplete={() => setJobToComplete(job)}
                  onEdit={() => {
                    setEditingJob(job);
                    setCreateOpen(true);
                  }}
                  onDelete={() => setJobToDelete(job)}
                />
              ),
            )}
          </div>
        ) : (
          <EmptyWork
            text={
              hasActiveFilters
                ? "Nenhum trabalho corresponde aos filtros. Experimenta limpar a pesquisa."
                : "Não há trabalhos neste estado."
            }
          />
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <p className="text-xs text-muted-foreground">
              {firstShown}–{lastShown} de {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <span className="px-3 text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Seguinte
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(jobToDelete)}
        onOpenChange={(open) => !open && setJobToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Trabalho</DialogTitle>
          </DialogHeader>
          {jobToDelete && (
            <DeleteJobForm
              job={jobToDelete}
              onClose={() => setJobToDelete(null)}
              onDeleted={() => loadPage()}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(jobToComplete)}
        onOpenChange={(open) => !open && setJobToComplete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Trabalho</DialogTitle>
          </DialogHeader>
          {jobToComplete && (
            <CompletionForm
              job={jobToComplete}
              overdue={isOverdue(jobToComplete)}
              onClose={() => setJobToComplete(null)}
              onSaved={() => loadPage()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkMetric({
  label,
  value,
  icon: Icon,
  tone,
  selected,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: "zinc" | "red" | "emerald";
  selected: boolean;
  onClick: () => void;
}) {
  const colors = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-xl border bg-white px-5 py-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-zinc-900 ${
        selected
          ? "border-zinc-900 dark:border-zinc-100"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">
          {label}
        </p>
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
      carregar trabalhos…
    </div>
  );
}

function EmptyWork({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
      <ClipboardList className="h-7 w-7 text-zinc-300" />
      <p className="mt-3 text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function ActiveJob({
  job,
  overdue,
  hoursConsumed,
  checklistComplete,
  canEdit,
  onToggleStage,
  onComplete,
  onEdit,
  onDelete,
}: {
  job: any;
  overdue: boolean;
  hoursConsumed: number;
  checklistComplete: boolean;
  canEdit: boolean;
  onToggleStage: (stageKey: string, checked: boolean) => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pastDate =
    new Date(job.due_date).getTime() < Date.now();
  const stages = getStages(job);
  const checkedCount = stages.filter((s) => s.checked).length;
  const totalCount = stages.length;

  const hasNoChecklist =
    !DEPARTMENT_CHECKLIST_MAP[job.department as Department];

  return (
    <div className="p-5">
      <div className="flex gap-3">
        <div
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            overdue
              ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                {job.title}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                {job.reference}
                {job.tracking_code &&
                  ` · Rastreio: ${job.tracking_code}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {job.department}
              </Badge>
              <Badge
                className={
                  overdue
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }
              >
                {overdue
                  ? pastDate
                    ? "Prazo Ultrapassado"
                    : "Limite de Horas Excedido"
                  : "Em Curso"}
              </Badge>
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    onClick={onEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span
              className={
                pastDate
                  ? "font-medium text-red-600 dark:text-red-400"
                  : ""
              }
            >
              Prazo: {formatDate(job.due_date)}
            </span>
            {job.max_hours && (
              <span
                className={
                  hoursConsumed >= Number(job.max_hours)
                    ? "font-medium text-red-600 dark:text-red-400"
                    : ""
                }
              >
                Horas: {hoursConsumed.toFixed(1)} /{" "}
                {job.max_hours}h
              </span>
            )}
            {job.assignees?.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {job.assignees
                  .map((a: any) => a.nome)
                  .join(", ")}
              </span>
            )}
          </div>

          {!hasNoChecklist && (
            <div className="mt-4 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Fases do Projeto
                </p>
                <span className="text-[11px] text-zinc-400">
                  {checkedCount}/{totalCount}
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {stages.map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        onToggleStage(
                          item.key,
                          e.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-red-600"
                    />
                    <span
                      className={
                        item.checked
                          ? "text-zinc-500 line-through dark:text-zinc-500"
                          : "text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {item.label}
                    </span>
                    {item.checked && item.checked_at && (
                      <span className="ml-auto text-[10px] text-zinc-400">
                        {formatDateShort(item.checked_at)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {!hasNoChecklist && !checklistComplete && (
              <p className="text-[11px] text-zinc-400">
                Marca todas as fases para poderes concluir o
                trabalho.
              </p>
            )}
            <Button
              size="sm"
              className="ml-auto h-8 bg-blue-700 text-xs text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
              onClick={onComplete}
              disabled={!hasNoChecklist && !checklistComplete}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Concluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletedJob({ job }: { job: any }) {
  const late =
    job.completed_at &&
    new Date(job.completed_at).getTime() >
      new Date(job.due_date).getTime();
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {job.title}
        </p>
        <p className="mt-1 font-mono text-[11px] text-zinc-400">
          {job.reference} ·{" "}
          {job.completed_at ? formatDate(job.completed_at) : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {job.non_standard && (
          <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            Não tipo
          </Badge>
        )}
        <Badge
          className={
            late
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
          }
        >
          {late ? "Atrasado" : "No Prazo"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={() => downloadReportDoc(job)}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function JobForm({
  job,
  users,
  onClose,
  onSaved,
}: {
  job: any | null;
  users: any[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<TipoReferencia>("PROD");
  const [preview, setPreview] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>(
    job?.department || "FABRICA",
  );
  const [form, setForm] = useState({
    title: job?.title || "",
    dueDate: localDateTimeInput(job?.due_date),
    maxHours:
      job?.max_hours != null ? String(job.max_hours) : "",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Ao criar: mostra o código que vai ser gerado, e recalcula quando muda o tipo
  useEffect(() => {
    if (job) return;
    let ativo = true;
    const ano = new Date().getFullYear();
    setPreview("");
    proximoNumeroReferencia(tipo, ano)
      .then((n) => {
        if (ativo) setPreview(montarCodigo(tipo, n, ano));
      })
      .catch((err) =>
        console.error("Erro ao calcular código:", err),
      );
    return () => {
      ativo = false;
    };
  }, [tipo, job]);

  const checklistForDept =
    DEPARTMENT_CHECKLIST_MAP[selectedDept as Department];
  const hasNoChecklist = checklistForDept === null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (job) {
        await jobsAPI.update(job.id, {
          title: form.title,
          department: selectedDept,
          dueDate: new Date(form.dueDate).toISOString(),
          maxHours: form.maxHours ? Number(form.maxHours) : null,
        });
      } else {
        await jobsAPI.create({
          tipo,
          title: form.title,
          department: selectedDept,
          dueDate: new Date(form.dueDate).toISOString(),
          maxHours: form.maxHours ? Number(form.maxHours) : null,
        });
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar trabalho:", error);
      alert(error?.message || "Erro ao guardar trabalho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo-ref">Tipo de referência *</Label>
          {job ? (
            <Input
              id="tipo-ref"
              value={job.codigo || job.reference || ""}
              disabled
            />
          ) : (
            <>
              <select
                id="tipo-ref"
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as TipoReferencia)
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {TIPOS_LISTA.map((t) => (
                  <option key={t} value={t}>
                    {TIPOS_REFERENCIA[t].label} ({t})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Código: <strong>{preview || "…"}</strong>
              </p>
            </>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Prazo Limite *</Label>
          <Input
            id="dueDate"
            type="datetime-local"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Nome do trabalho *</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Ex: Revisão da linha hidráulica"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="department">Departamento *</Label>
          <select
            id="department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            required
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxHours">
            Limite de Horas (opcional)
          </Label>
          <Input
            id="maxHours"
            type="number"
            min="0"
            step="0.5"
            value={form.maxHours}
            onChange={(e) => update("maxHours", e.target.value)}
            placeholder="Ex: 40"
          />
        </div>
      </div>

      {!job && !hasNoChecklist && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Fases para {selectedDept}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            {checklistForDept?.map((key) => (
              <li key={key}>• {CHECKLIST_LABELS[key] || key}</li>
            ))}
          </ul>
        </div>
      )}

      {!job && hasNoChecklist && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-400">
            Assistência
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
            Este trabalho será marcado como concluído sem fases
            intermédias.
          </p>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-blue-700 hover:bg-blue-800"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {job ? "Guardar Alterações" : "Criar Trabalho"}
        </Button>
      </div>
    </form>
  );
}

function DeleteJobForm({
  job,
  onClose,
  onDeleted,
}: {
  job: any;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const expected = (job.title || "").trim();
  const matches = confirmText.trim() === expected;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setLoading(true);
    try {
      // O trigger na Supabase transforma isto em soft delete
      await jobsAPI.delete(job.id);
      await onDeleted();
      onClose();
    } catch (error) {
      console.error("Erro ao eliminar trabalho:", error);
      alert("Erro ao eliminar trabalho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="text-xs text-red-700 dark:text-red-400">
          <p className="font-medium">
            Esta ação não pode ser desfeita.
          </p>
          <p className="mt-1">
            O trabalho{" "}
            <span className="font-mono">{job.reference}</span> e
            as respetivas fases deixarão de aparecer na lista.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="confirmDelete"
          className="text-sm font-normal"
        >
          Para confirmar, escreve o nome do trabalho:
        </Label>
        <p className="select-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
          {expected}
        </p>
        <Input
          id="confirmDelete"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={expected}
          autoComplete="off"
          autoFocus
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!matches || loading}
          className="bg-blue-700 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Eliminar
        </Button>
      </div>
    </form>
  );
}
function CompletionForm({
  job,
  overdue,
  onClose,
  onSaved,
}: {
  job: any;
  overdue: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    wentWell: "",
    wentWrong: "",
    conclusion: "",
    delayReason: "",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await jobsAPI.complete(job.id, form);
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao concluir trabalho:", error);
      alert(error?.message || "Erro ao concluir trabalho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div
        className={`rounded-lg border p-3 ${
          overdue
            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
            : "border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
        }`}
      >
        <p className="font-medium text-zinc-800 dark:text-zinc-100">
          {job.title}
        </p>
        <p
          className={`mt-1 text-xs ${
            overdue
              ? "text-red-700 dark:text-red-400"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {overdue
            ? "O prazo ou limite de horas já foi ultrapassado. O motivo do atraso é obrigatório."
            : `Prazo definido: ${formatDate(job.due_date)}`}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wentWell">O que correu bem</Label>
        <Textarea
          id="wentWell"
          value={form.wentWell}
          onChange={(e) => update("wentWell", e.target.value)}
          required
          className="min-h-24"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wentWrong">
          O que correu mal / constrangimentos
        </Label>
        <Textarea
          id="wentWrong"
          value={form.wentWrong}
          onChange={(e) => update("wentWrong", e.target.value)}
          required
          className="min-h-24"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="conclusion">
          Conclusão e Próximos Passos
        </Label>
        <Textarea
          id="conclusion"
          value={form.conclusion}
          onChange={(e) => update("conclusion", e.target.value)}
          required
          className="min-h-24"
        />
      </div>
      {overdue && (
        <div className="space-y-2">
          <Label htmlFor="delayReason">Motivo do Atraso</Label>
          <Textarea
            id="delayReason"
            value={form.delayReason}
            onChange={(e) =>
              update("delayReason", e.target.value)
            }
            required
            className="min-h-24"
          />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-800"
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Guardar Relatório e Concluir
        </Button>
      </div>
    </form>
  );
}