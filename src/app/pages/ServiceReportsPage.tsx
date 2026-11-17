import { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { serviceReportsAPI, type ServiceReport } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { JobSearchPicker } from "../components/JobSearchPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Wrench,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const SERVICE_TYPES = [
  { value: "avaria", label: "Avaria" },
  { value: "preventiva", label: "Preventiva" },
  { value: "garantia", label: "Ao abrigo da garantia" },
] as const;

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "terminado", label: "Terminados" },
  { value: "por_terminar", label: "Por terminar" },
] as const;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const toDateInput = (value?: string | null) =>
  value
    ? new Date(value).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

const getReportStart = (report: ServiceReport) => {
  if (report.start_date) return report.start_date;
  const dates = (report.days || [])
    .map((day) => day.day_date)
    .sort();
  return dates[0] || report.report_date;
};

const getReportEnd = (report: ServiceReport) => {
  if (report.end_date) return report.end_date;
  const dates = (report.days || [])
    .map((day) => day.day_date)
    .sort();
  return dates[dates.length - 1] || report.report_date;
};

const getClientName = (report: ServiceReport) =>
  report.client_name ||
  report.job?.title ||
  "Cliente não indicado";

const escapeHtml = (value?: string | null) =>
  String(value || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const FRESAVE_LOGO_URL =
  "https://static.wixstatic.com/media/a7ac0c_09785672c3cb48039040f69fa2685900~mv2_d_6384_2650_s_4_2.png/v1/fill/w_200,h_78,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Fresave%20Logotipo.png";

function downloadServiceReportDoc(report: ServiceReport) {
  const serviceTypeLabels = {
    avaria: "Avaria",
    preventiva: "Preventiva",
    garantia: "Ao abrigo da garantia",
  };
  const hasDocument = Boolean(report.document_url);
  const generatedAt = formatDateTime(new Date().toISOString());
  const details = hasDocument
    ? `
      <div class="document-note">
        <strong>Documento de assistência anexado</strong>
        <p>Os detalhes técnicos constam do ficheiro “${escapeHtml(report.document_name)}”.</p>
      </div>`
    : `
      <h2>O que foi gasto</h2>
      <p class="section-text">${escapeHtml(report.expenses_text)}</p>
      <h2>Anomalias verificadas</h2>
      <p class="section-text">${escapeHtml(report.anomalies)}</p>
      <h2>Trabalhos realizados</h2>
      <p class="section-text">${escapeHtml(report.work_performed)}</p>
      ${report.observations ? `<h2>Observações</h2><p class="section-text">${escapeHtml(report.observations)}</p>` : ""}`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="utf-8">
      <title>Assistência Técnica - ${escapeHtml(report.service_number)}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }
        .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
        .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 16px 0 4px; }
        h1 { color: #18181b; margin: 0; font-size: 24px; }
        .period { background: #18181b; color: white; padding: 16px 18px; margin: 0 0 22px; }
        .period-label { color: #d4d4d8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .period-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
        .meta { width: 100%; border-collapse: collapse; }
        .meta td { padding: 9px 0; border-bottom: 1px solid #f4f4f5; font-size: 13px; }
        .meta-label { width: 145px; color: #71717a; font-weight: bold; }
        h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 30px; }
        .section-text { font-size: 13px; line-height: 1.7; background: #fafafa; padding: 14px 16px; border-left: 3px solid #dc2626; white-space: pre-wrap; }
        .document-note { margin-top: 28px; padding: 18px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; }
        .document-note p { color: #3f3f46; font-size: 12px; margin: 6px 0 0; }
        .footer { border-top: 1px solid #e4e4e7; padding-top: 14px; margin-top: 36px; text-align: center; color: #a1a1aa; font-size: 10px; }
        .brand { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div style="padding: 30px 36px 10px;">
        <div class="header">
          <img src="${FRESAVE_LOGO_URL}" alt="Fresave" width="150" height="59" style="display:block;" />
          <p class="doc-title">Assistência Técnica</p>
          <h1>${escapeHtml(report.service_number)}</h1>
        </div>
        <div class="period">
          <div class="period-label">Período da assistência</div>
          <div class="period-value">${formatDate(getReportStart(report))} — ${formatDate(getReportEnd(report))}</div>
        </div>
        <table class="meta">
          <tr><td class="meta-label">Cliente</td><td>${escapeHtml(getClientName(report))}</td></tr>
          ${report.job ? `<tr><td class="meta-label">Serviço / Job</td><td>${escapeHtml(report.job.reference)} — ${escapeHtml(report.job.title)}</td></tr>` : ""}
          <tr><td class="meta-label">Tipo</td><td>${serviceTypeLabels[report.service_type]}</td></tr>
          <tr><td class="meta-label">Estado</td><td>${report.status === "terminado" ? "Terminado" : "Por terminar"}</td></tr>
        </table>
        ${details}
        <div class="footer">
          <div class="brand">FRESAVE</div>
          <div>Documento gerado automaticamente pelo sistema de gestão · ${generatedAt}</div>
          <div style="margin-top:8px;">Rua Central, n.º1732 4800-268 Santo Tirso de Prazins Guimarães</div>
          <div>Telefone: 253 473 365 · Email: geral@fresave.com · Contribuinte: 504 696 009</div>
        </div>
      </div>
    </body>
    </html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.service_number}.doc`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ServiceReportsPage() {
  const { currentUser } = useApp();
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    status: "todos" as "terminado" | "por_terminar" | "todos",
    serviceType: "todos" as
      "avaria" | "preventiva" | "garantia" | "todos",
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
    filters.serviceType !== "todos";

  useEffect(() => {
    loadPage();
  }, [page, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() !== filters.search)
        changeFilter({ search: searchInput.trim() });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadPage = async () => {
    setLoading(true);
    try {
      const result = await serviceReportsAPI.getPage(
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
        },
      );
      setReports(result.reports);
      setTotal(result.total);
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
    });
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Eliminar este relatório de assistência e o documento associado?",
      )
    )
      return;
    try {
      await serviceReportsAPI.delete(id);
      await loadPage();
    } catch (error) {
      console.error("Erro ao eliminar relatório:", error);
      alert("Não foi possível eliminar o relatório.");
    }
  };

  const firstShown =
    total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600 dark:text-red-400">
            ASSISTÊNCIA TÉCNICA
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Relatórios de Assistências
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Registe o cliente, o período da assistência e o que
            foi gasto. Se anexar um documento, só precisa de
            indicar o cliente e as datas.
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
                Nova assistência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] !max-w-6xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReport
                    ? "Editar assistência"
                    : "Registar assistência"}
                </DialogTitle>
              </DialogHeader>
              <ServiceReportForm
                report={editingReport}
                onClose={() => {
                  setCreateOpen(false);
                  setEditingReport(null);
                }}
                onSaved={loadPage}
              />
            </DialogContent>
          </Dialog>
        )}
      </header>

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
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Pesquisar por cliente ou número"
                className="pl-9"
              />
            </div>
            <select
              value={filters.serviceType}
              onChange={(event) =>
                changeFilter({
                  serviceType: event.target
                    .value as typeof filters.serviceType,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="todos">Todos os tipos</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
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
                <X className="mr-1.5 h-4 w-4" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A
            carregar assistências…
          </div>
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
          <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
            <FileText className="h-7 w-7 text-zinc-300" />
            <p className="mt-3 text-sm text-zinc-400">
              {hasActiveFilters
                ? "Nenhuma assistência corresponde aos filtros."
                : "Ainda não existem assistências registadas."}
            </p>
          </div>
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
                onClick={() =>
                  setPage((current) => current - 1)
                }
              >
                <ChevronLeft className="mr-1 h-4 w-4" />{" "}
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
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Seguinte{" "}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
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
  return (
    <div className="p-5">
      <div className="flex gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                {getClientName(report)}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                {report.service_number}
              </p>
              {report.job && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Serviço:{" "}
                  <span className="font-mono">
                    {report.job.reference}
                  </span>
                  {report.job.title
                    ? ` · ${report.job.title}`
                    : ""}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {report.document_url && (
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <Paperclip className="mr-1 h-3 w-3" />{" "}
                  Documento
                </Badge>
              )}
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
                  : "Por terminar"}
              </Badge>
              {report.document_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400"
                  asChild
                >
                  <a
                    href={report.document_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir documento anexado"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400"
                onClick={onDownload}
                aria-label="Exportar para Word"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400"
                    onClick={onEdit}
                    aria-label="Editar assistência"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    onClick={onDelete}
                    aria-label="Eliminar assistência"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
              <CalendarRange className="h-3.5 w-3.5 text-red-500" />
              {formatDate(getReportStart(report))} —{" "}
              {formatDate(getReportEnd(report))}
            </span>
            {!report.document_url && report.expenses_text && (
              <span className="line-clamp-1 max-w-xl">
                Gasto: {report.expenses_text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceReportForm({
  report,
  onClose,
  onSaved,
}: {
  report: ServiceReport | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [removeExistingDocument, setRemoveExistingDocument] =
    useState(false);
  const [form, setForm] = useState({
    jobId: report?.job_id || "",
    clientName: report ? getClientName(report) : "",
    startDate: report
      ? toDateInput(getReportStart(report))
      : toDateInput(),
    endDate: report
      ? toDateInput(getReportEnd(report))
      : toDateInput(),
    serviceType:
      report?.service_type ||
      ("avaria" as "avaria" | "preventiva" | "garantia"),
    expensesText: report?.expenses_text || "",
    anomalies: report?.anomalies || "",
    workPerformed: report?.work_performed || "",
    observations: report?.observations || "",
    status:
      report?.status ||
      ("por_terminar" as "terminado" | "por_terminar"),
  });

  const hasExistingDocument =
    Boolean(report?.document_url) && !removeExistingDocument;
  const hasDocument = Boolean(file) || hasExistingDocument;
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const selectFile = (selected: File | null) => {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      alert("O documento não pode ultrapassar 15 MB.");
      return;
    }
    setFile(selected);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.endDate < form.startDate) {
      alert(
        "A data final não pode ser anterior à data inicial.",
      );
      return;
    }
    if (
      !hasDocument &&
      (!form.expensesText.trim() ||
        !form.anomalies.trim() ||
        !form.workPerformed.trim())
    ) {
      alert(
        "Sem documento anexado, preencha o que foi gasto, as anomalias e os trabalhos realizados.",
      );
      return;
    }

    setSaving(true);
    const payload = {
      jobId: form.jobId || undefined,
      clientName: form.clientName,
      startDate: new Date(
        `${form.startDate}T12:00:00`,
      ).toISOString(),
      endDate: new Date(
        `${form.endDate}T12:00:00`,
      ).toISOString(),
      reportDate: new Date(
        `${form.endDate}T12:00:00`,
      ).toISOString(),
      serviceType: form.serviceType,
      expensesText: form.expensesText,
      anomalies: form.anomalies,
      workPerformed: form.workPerformed,
      observations: form.observations,
      status: form.status,
      days: [],
      document: file,
    };

    try {
      if (report) {
        await serviceReportsAPI.update(report.id, {
          ...payload,
          jobId: form.jobId || null,
          removeDocument: removeExistingDocument,
        });
      } else {
        await serviceReportsAPI.create(payload);
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar assistência:", error);
      alert(
        error?.message ||
          "Não foi possível guardar a assistência.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-3 grid gap-6" onSubmit={submit}>
      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/30 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientName">Cliente *</Label>
          <Input
            id="clientName"
            value={form.clientName}
            onChange={(event) =>
              update("clientName", event.target.value)
            }
            placeholder="Nome do cliente"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Assistência de *</Label>
          <Input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(event) =>
              update("startDate", event.target.value)
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Até *</Label>
          <Input
            id="endDate"
            type="date"
            min={form.startDate}
            value={form.endDate}
            onChange={(event) =>
              update("endDate", event.target.value)
            }
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <div>
            <Label>Serviço / Job</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Facultativo — pode associar a PROD, PROD_INT ou
              outro tipo de job.
            </p>
          </div>
          <JobSearchPicker
            value={form.jobId}
            onChange={(jobId) => update("jobId", jobId)}
            knownJobs={report?.job ? [report.job] : []}
          />
        </div>
      </section>

      <section
        className={`rounded-xl border p-4 transition-colors ${hasDocument ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-dashed border-zinc-300 dark:border-zinc-700"}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${hasDocument ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}
          >
            {hasDocument ? (
              <FileCheck2 className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Documento da assistência
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Com documento, os detalhes técnicos deixam de ser
              obrigatórios. Aceita PDF, Word, Excel e imagens
              até 15 MB.
            </p>
            {hasExistingDocument && !file && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <a
                  href={report?.document_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <Paperclip className="h-3.5 w-3.5" />{" "}
                  {report?.document_name || "Documento atual"}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setRemoveExistingDocument(true)
                  }
                  className="text-zinc-500 underline-offset-2 hover:text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            )}
            {file && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-auto text-zinc-500 hover:text-red-600"
                >
                  Remover
                </button>
              </div>
            )}
            {!hasDocument && (
              <label className="mt-3 inline-flex h-9 cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                <UploadCloud className="mr-2 h-4 w-4" />{" "}
                Escolher documento
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  onChange={(event) =>
                    selectFile(event.target.files?.[0] || null)
                  }
                />
              </label>
            )}
          </div>
        </div>
      </section>

      {!hasDocument && (
        <section className="grid gap-5 border-l-2 border-red-500 pl-4">
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Detalhes da assistência
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Obrigatórios porque não existe um documento
              anexado.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceType">
                Tipo de assistência
              </Label>
              <select
                id="serviceType"
                value={form.serviceType}
                onChange={(event) =>
                  update("serviceType", event.target.value)
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value)
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="por_terminar">
                  Por terminar
                </option>
                <option value="terminado">Terminado</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expensesText">
              O que foi gasto? *
            </Label>
            <Textarea
              id="expensesText"
              value={form.expensesText}
              onChange={(event) =>
                update("expensesText", event.target.value)
              }
              placeholder="Escreva por extenso, por exemplo: dois litros de óleo hidráulico, três vedantes e material de limpeza. Não altera o stock."
              className="min-h-24"
              required={!hasDocument}
            />
            <p className="text-xs text-zinc-400">
              Este texto é apenas informativo e não está ligado
              ao stock.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anomalies">
              Anomalias verificadas *
            </Label>
            <Textarea
              id="anomalies"
              value={form.anomalies}
              onChange={(event) =>
                update("anomalies", event.target.value)
              }
              placeholder="Descreva as anomalias encontradas..."
              className="min-h-20"
              required={!hasDocument}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workPerformed">
              Trabalhos realizados *
            </Label>
            <Textarea
              id="workPerformed"
              value={form.workPerformed}
              onChange={(event) =>
                update("workPerformed", event.target.value)
              }
              placeholder="Descreva os trabalhos executados..."
              className="min-h-20"
              required={!hasDocument}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={form.observations}
              onChange={(event) =>
                update("observations", event.target.value)
              }
              placeholder="Observações adicionais..."
              className="min-h-16"
            />
          </div>
        </section>
      )}

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
          className="bg-red-600 text-white hover:bg-red-700"
          disabled={saving}
        >
          {saving && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {report ? "Guardar alterações" : "Criar assistência"}
        </Button>
      </div>
    </form>
  );
}