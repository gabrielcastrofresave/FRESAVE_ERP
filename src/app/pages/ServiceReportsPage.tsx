// src/app/pages/ServiceReportsPage.tsx

import { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  serviceReportsAPI,
  jobsAPI,
  type ServiceReport,
  type ServiceDay,
} from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
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
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;

const SERVICE_TYPES = [
  { value: "avaria", label: "Avaria" },
  { value: "preventiva", label: "Preventiva" },
  { value: "garantia", label: "Ao abrigo da garantia" },
] as const;

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "terminado", label: "Terminados" },
  { value: "por_terminar", label: "Por Terminar" },
] as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const localDateInput = (existing?: string) => {
  if (existing) {
    return new Date(existing).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
};

const FRESAVE_LOGO_URL =
  "https://static.wixstatic.com/media/a7ac0c_09785672c3cb48039040f69fa2685900~mv2_d_6384_2650_s_4_2.png/v1/fill/w_200,h_78,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Fresave%20Logotipo.png";

function downloadServiceReportDoc(report: ServiceReport) {
  const serviceTypeLabels = {
    avaria: "Avaria",
    preventiva: "Preventiva",
    garantia: "Ao abrigo da garantia",
  };

  const daysRows = report.days
    .map(
      (day, index) => `
        <tr style="background:${index % 2 === 0 ? "#ffffff" : "#fafafa"};">
          <td style="padding:8px 10px; border:1px solid #e4e4e7; font-size:12px;">${formatDate(day.day_date)}</td>
          <td style="padding:8px 10px; border:1px solid #e4e4e7; font-size:12px; text-align:center;">${day.travel_hours}h</td>
          <td style="padding:8px 10px; border:1px solid #e4e4e7; font-size:12px; text-align:center;">${day.presence_hours}h</td>
          <td style="padding:8px 10px; border:1px solid #e4e4e7; font-size:12px; text-align:center;">${day.kms} km</td>
          <td style="padding:8px 10px; border:1px solid #e4e4e7; font-size:12px;">${day.accommodation || "—"}</td>
          <td style="padding:8px 10px; border:1px solid #e4e4e7; font-size:12px;">${day.materials || "—"}</td>
        </tr>`,
    )
    .join("");

  const totalTravelHours = report.days.reduce(
    (sum, d) => sum + d.travel_hours,
    0,
  );
  const totalPresenceHours = report.days.reduce(
    (sum, d) => sum + d.presence_hours,
    0,
  );
  const totalKms = report.days.reduce(
    (sum, d) => sum + d.kms,
    0,
  );

  const generatedAt = formatDateTime(new Date().toISOString());

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="utf-8">
      <title>Assistência Técnica - ${report.service_number}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }

        .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
        .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 16px 0 4px; }
        h1.main-title { color: #18181b; margin: 0; font-size: 24px; }

        .info-box { border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; background: #fafafa; border: 1px solid #e4e4e7; }
        .info-row { display: flex; margin-bottom: 8px; font-size: 13px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: #71717a; width: 150px; font-weight: bold; }
        .info-value { color: #18181b; }

        h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 30px; margin-bottom: 14px; }

        table.days { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.days th { background: #f4f4f5; text-align: left; padding: 8px 10px; border: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #52525b; }
        table.days tfoot td { background: #fafafa; font-weight: bold; padding: 8px 10px; border: 1px solid #e4e4e7; font-size: 12px; }

        p.section-text { font-size: 13px; line-height: 1.7; color: #27272a; background: #fafafa; padding: 14px 16px; border-left: 3px solid #dc2626; margin: 0 0 4px; border-radius: 0 4px 4px 0; white-space: pre-wrap; }

        .footer { border-top: 1px solid #e4e4e7; padding-top: 14px; margin-top: 36px; text-align: center; }
        .footer p { color: #a1a1aa; font-size: 10px; margin: 0; letter-spacing: 0.5px; }
        .footer p.brand { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div style="padding: 30px 36px 10px;">
        <div class="header">
          <img src="${FRESAVE_LOGO_URL}" alt="Fresave" width="150" height="59" style="display:block;" />
          <p class="doc-title">Assistência Técnica</p>
          <h1 class="main-title">${report.service_number}</h1>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Trabalho:</span>
            <span class="info-value">${report.job?.reference || "—"} - ${report.job?.title || "—"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tipo:</span>
            <span class="info-value">${serviceTypeLabels[report.service_type]}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data:</span>
            <span class="info-value">${formatDate(report.report_date)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value">${report.status === "terminado" ? "Terminado" : "Por Terminar"}</span>
          </div>
        </div>

        <h2>Anomalias Verificadas - Informação Técnica</h2>
        <p class="section-text">${report.anomalies || "—"}</p>

        <h2>Trabalhos Realizados</h2>
        <p class="section-text">${report.work_performed || "—"}</p>

        ${
          report.days.length > 0
            ? `
        <h2>Registo de Dias de Intervenção</h2>
        <table class="days">
          <thead>
            <tr>
              <th>Dia</th>
              <th style="text-align:center;">Hrs. Viagem</th>
              <th style="text-align:center;">Hrs. Presença</th>
              <th style="text-align:center;">Kms</th>
              <th>Estadia</th>
              <th>Materiais</th>
            </tr>
          </thead>
          <tbody>
            ${daysRows}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td style="text-align:center;">${totalTravelHours}h</td>
              <td style="text-align:center;">${totalPresenceHours}h</td>
              <td style="text-align:center;">${totalKms} km</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        `
            : ""
        }

        ${
          report.observations
            ? `
        <h2>Observações</h2>
        <p class="section-text">${report.observations}</p>
        `
            : ""
        }

        <div class="footer">
          <p class="brand">FRESAVE</p>
          <p>Documento gerado automaticamente pelo sistema de gestão · ${generatedAt}</p>
          <p style="margin-top:8px;">Rua Central, n.º1732 4800-268 Santo Tirso de Prazins Guimarães</p>
          <p>Telefone: 253 473 365 · Fax: 253 473 365 · Email: geral@fresave.com · Contribuinte: 504 696 009</p>
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
  a.download = `${report.service_number}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ServiceReportsPage() {
  const { currentUser } = useApp();
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    status: "todos" as "terminado" | "por_terminar" | "todos",
    serviceType: "todos" as
      "avaria" | "preventiva" | "garantia" | "todos",
    jobId: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingReport, setEditingReport] =
    useState<ServiceReport | null>(null);

  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "projeto" ||
    currentUser?.role === "chefe_producao";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "todos" ||
    filters.serviceType !== "todos" ||
    filters.jobId !== "";

  useEffect(() => {
    loadJobs();
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

  const loadJobs = async () => {
    try {
      const allJobs = await jobsAPI.getAll();
      setJobs(allJobs);
    } catch (error) {
      console.error("Erro ao carregar trabalhos:", error);
    }
  };

  const loadPage = async () => {
    setLoading(true);
    try {
      const pageData = await serviceReportsAPI.getPage(
        page,
        PAGE_SIZE,
        {
          search: filters.search || undefined,
          status:
            filters.status !== "todos"
              ? filters.status
              : undefined,
          serviceType:
            filters.serviceType !== "todos"
              ? filters.serviceType
              : undefined,
          jobId: filters.jobId || undefined,
        },
      );

      setReports(pageData.reports);
      setTotal(pageData.total);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeFilter = (patch: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({
      search: "",
      status: "todos",
      serviceType: "todos",
      jobId: "",
    });
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Eliminar este relatório de assistência?")) {
      try {
        await serviceReportsAPI.delete(id);
        await loadPage();
      } catch (error) {
        console.error("Erro ao eliminar relatório:", error);
        alert("Erro ao eliminar relatório.");
      }
    }
  };

  const firstShown =
    total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            ASSISTÊNCIA TÉCNICA
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Relatórios de Assistências
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Registo documental de assistências técnicas
            realizadas, incluindo anomalias, trabalhos
            executados e materiais utilizados.
          </p>
        </div>
        {canCreate && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) setEditingReport(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="h-10 bg-red-600 text-white hover:bg-red-700"
                onClick={() => setEditingReport(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReport
                    ? "Editar Relatório"
                    : "Criar Relatório de Assistência"}
                </DialogTitle>
              </DialogHeader>
              <ServiceReportForm
                report={editingReport}
                jobs={jobs}
                onClose={() => {
                  setCreateOpen(false);
                  setEditingReport(null);
                }}
                onSaved={() => loadPage()}
              />
            </DialogContent>
          </Dialog>
        )}
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Pesquisar por número ou observações"
                className="pl-9"
              />
            </div>

            <select
              value={filters.serviceType}
              onChange={(e) =>
                changeFilter({
                  serviceType: e.target.value as any,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="todos">Todos os Tipos</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={filters.jobId}
              onChange={(e) =>
                changeFilter({ jobId: e.target.value })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Todos os Trabalhos</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.reference} - {job.title}
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
        ) : reports.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                canEdit={canCreate}
                onEdit={() => {
                  setEditingReport(report);
                  setCreateOpen(true);
                }}
                onDelete={() => handleDelete(report.id)}
                onDownload={() =>
                  downloadServiceReportDoc(report)
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            text={
              hasActiveFilters
                ? "Nenhum relatório corresponde aos filtros."
                : "Ainda não existem relatórios de assistência."
            }
          />
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              <span className="px-3 text-xs text-zinc-500 dark:text-zinc-400">
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
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
      carregar relatórios…
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
      <FileText className="h-7 w-7 text-zinc-300" />
      <p className="mt-3 text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function ReportRow({
  report,
  canEdit,
  onEdit,
  onDelete,
  onDownload,
}: {
  report: ServiceReport;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const serviceTypeLabels = {
    avaria: "Avaria",
    preventiva: "Preventiva",
    garantia: "Garantia",
  };

  const totalHours = report.days.reduce(
    (sum, d) => sum + d.travel_hours + d.presence_hours,
    0,
  );

  return (
    <div className="p-5">
      <div className="flex gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                {report.service_number}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {report.job?.reference} - {report.job?.title}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {serviceTypeLabels[report.service_type]}
              </Badge>
              <Badge
                className={
                  report.status === "terminado"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
                }
              >
                {report.status === "terminado"
                  ? "Terminado"
                  : "Por Terminar"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={onDownload}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
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
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(report.report_date)}
            </span>
            {report.days.length > 0 && (
              <span>
                {report.days.length} dia
                {report.days.length !== 1 ? "s" : ""} ·{" "}
                {totalHours.toFixed(1)}h total
              </span>
            )}
          </div>

          {report.anomalies && (
            <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Anomalias Verificadas
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {report.anomalies}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceReportForm({
  report,
  jobs,
  onClose,
  onSaved,
}: {
  report: ServiceReport | null;
  jobs: any[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    jobId: report?.job_id || "",
    serviceType:
      report?.service_type ||
      ("avaria" as "avaria" | "preventiva" | "garantia"),
    reportDate: localDateInput(report?.report_date),
    anomalies: report?.anomalies || "",
    workPerformed: report?.work_performed || "",
    observations: report?.observations || "",
    status:
      report?.status ||
      ("por_terminar" as "terminado" | "por_terminar"),
  });

  const [days, setDays] = useState<
    Array<{
      id?: string;
      dayDate: string;
      travelHours: number;
      presenceHours: number;
      kms: number;
      accommodation: string;
      materials: string;
    }>
  >(
    report?.days?.map((d) => ({
      id: d.id,
      dayDate: localDateInput(d.day_date),
      travelHours: d.travel_hours,
      presenceHours: d.presence_hours,
      kms: d.kms,
      accommodation: d.accommodation || "",
      materials: d.materials || "",
    })) || [],
  );

  const update = (key: keyof typeof form, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addDay = () => {
    setDays([
      ...days,
      {
        dayDate: localDateInput(),
        travelHours: 0,
        presenceHours: 0,
        kms: 0,
        accommodation: "",
        materials: "",
      },
    ]);
  };

  const removeDay = (index: number) => {
    setDays(days.filter((_, i) => i !== index));
  };

  const updateDay = (
    index: number,
    field: string,
    value: any,
  ) => {
    setDays(
      days.map((day, i) =>
        i === index ? { ...day, [field]: value } : day,
      ),
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (report) {
        await serviceReportsAPI.update(report.id, {
          serviceType: form.serviceType,
          reportDate: new Date(form.reportDate).toISOString(),
          anomalies: form.anomalies,
          workPerformed: form.workPerformed,
          observations: form.observations,
          status: form.status,
          days: days.map((d) => ({
            dayDate: new Date(d.dayDate).toISOString(),
            travelHours: d.travelHours,
            presenceHours: d.presenceHours,
            kms: d.kms,
            accommodation: d.accommodation,
            materials: d.materials,
          })),
        });
      } else {
        await serviceReportsAPI.create({
          jobId: form.jobId,
          serviceType: form.serviceType,
          reportDate: new Date(form.reportDate).toISOString(),
          anomalies: form.anomalies,
          workPerformed: form.workPerformed,
          observations: form.observations,
          status: form.status,
          days: days.map((d) => ({
            dayDate: new Date(d.dayDate).toISOString(),
            travelHours: d.travelHours,
            presenceHours: d.presenceHours,
            kms: d.kms,
            accommodation: d.accommodation,
            materials: d.materials,
          })),
        });
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar relatório:", error);
      alert(error?.message || "Erro ao guardar relatório.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 grid gap-6" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobId">Trabalho Associado *</Label>
          <select
            id="jobId"
            value={form.jobId}
            onChange={(e) => update("jobId", e.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            required
            disabled={!!report}
          >
            <option value="">Selecionar trabalho</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.reference} - {job.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reportDate">
            Data do Relatório *
          </Label>
          <Input
            id="reportDate"
            type="date"
            value={form.reportDate}
            onChange={(e) =>
              update("reportDate", e.target.value)
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="serviceType">
            Tipo de Assistência *
          </Label>
          <select
            id="serviceType"
            value={form.serviceType}
            onChange={(e) =>
              update("serviceType", e.target.value)
            }
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            required
          >
            {SERVICE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado *</Label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            required
          >
            <option value="por_terminar">Por Terminar</option>
            <option value="terminado">Terminado</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anomalies">
          Anomalias Verificadas - Informação Técnica *
        </Label>
        <Textarea
          id="anomalies"
          value={form.anomalies}
          onChange={(e) => update("anomalies", e.target.value)}
          placeholder="Descreva as anomalias encontradas..."
          className="min-h-24"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workPerformed">
          Trabalhos Realizados *
        </Label>
        <Textarea
          id="workPerformed"
          value={form.workPerformed}
          onChange={(e) =>
            update("workPerformed", e.target.value)
          }
          placeholder="Descreva os trabalhos executados..."
          className="min-h-24"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          value={form.observations}
          onChange={(e) =>
            update("observations", e.target.value)
          }
          placeholder="Observações adicionais..."
          className="min-h-20"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Dias de Intervenção</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDay}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar Dia
          </Button>
        </div>

        {days.length > 0 && (
          <div className="space-y-3">
            {days.map((day, index) => (
              <div
                key={index}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Dia {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDay(index)}
                    className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remover
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={day.dayDate}
                      onChange={(e) =>
                        updateDay(
                          index,
                          "dayDate",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Hrs. Viagem
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={day.travelHours}
                      onChange={(e) =>
                        updateDay(
                          index,
                          "travelHours",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Hrs. Presença
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={day.presenceHours}
                      onChange={(e) =>
                        updateDay(
                          index,
                          "presenceHours",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      required
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kms</Label>
                    <Input
                      type="number"
                      min="0"
                      value={day.kms}
                      onChange={(e) =>
                        updateDay(
                          index,
                          "kms",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estadia</Label>
                    <Input
                      value={day.accommodation}
                      onChange={(e) =>
                        updateDay(
                          index,
                          "accommodation",
                          e.target.value,
                        )
                      }
                      placeholder="Ex: Hotel X"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Materiais</Label>
                    <Input
                      value={day.materials}
                      onChange={(e) =>
                        updateDay(
                          index,
                          "materials",
                          e.target.value,
                        )
                      }
                      placeholder="Ex: Parafusos, óleo"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
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
          {report ? "Guardar Alterações" : "Criar Relatório"}
        </Button>
      </div>
    </form>
  );
}