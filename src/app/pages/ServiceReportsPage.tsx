import { useEffect, useState } from "react";
import { useApp } from "../AppContext";
import {
  serviceReportsAPI,
  JOB_CLIENT_COLUMN,
  type ServiceReport,
  type ServiceDocument,
} from "../api";
import { Calendar } from "../components/ui/calendar";
import { pt } from "date-fns/locale";
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
  Building2,
  CalendarRange,
  Check,
  ChevronDown,
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
  Users,
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

const getDocuments = (report: ServiceReport): ServiceDocument[] => {
  if (report.documents && report.documents.length > 0)
    return report.documents;
  // Ficheiro antigo guardado no próprio registo (antes de existirem vários ficheiros)
  if (report.document_url)
    return [
      {
        id: "legacy",
        report_id: report.id,
        name: report.document_name || "Documento",
        path: report.document_path || "",
        url: report.document_url,
        size: null,
        created_at: report.updated_at,
      },
    ];
  return [];
};

const getTechnicianNames = (
  report: ServiceReport,
  users: Array<{ id: string; nome: string }>,
): string[] =>
  (report.technician_ids || [])
    .map(
      (id) =>
        users.find((u) => String(u.id) === String(id))?.nome,
    )
    .filter((nome): nome is string => Boolean(nome));

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024)
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};

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

function downloadServiceReportDoc(
  report: ServiceReport,
  users: Array<{ id: string; nome: string }> = [],
) {
  const documents = getDocuments(report);
  const technicianNames = getTechnicianNames(report, users);
  const serviceTypeLabels = {
    avaria: "Avaria",
    preventiva: "Preventiva",
    garantia: "Ao abrigo da garantia",
  };
  const hasDocument = documents.length > 0;
  const generatedAt = formatDateTime(new Date().toISOString());
  const details = hasDocument
    ? `
      <div class="document-note">
        <strong>${documents.length > 1 ? "Documentos de assistência anexados" : "Documento de assistência anexado"}</strong>
        <p>Os detalhes técnicos constam de: ${documents.map((d) => `“${escapeHtml(d.name)}”`).join(", ")}.</p>
      </div>`
    : `
      <h2>O que foi gasto</h2>
      <p class="section-text">${escapeHtml(report.expenses_text)}</p>
      <h2>Anomalias verificadas</h2>
      <p class="section-text">${escapeHtml(report.anomalies)}</p>
      <h2>Trabalhos realizados</h2>
      <p class="section-text">${escapeHtml(report.work_performed)}</p>
      ${report.observations ? `<h2>Observações</h2><p class="section-text">${escapeHtml(report.observations)}</p>` : ""}`;

  const dayList = [...(report.days || [])].sort((a, b) =>
    String(a.day_date).localeCompare(String(b.day_date)),
  );
  const daysTable = dayList.length
    ? `<h2>Datas e detalhe</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr style="background:#f4f4f5;text-align:left;">
          <th style="padding:6px;">Data</th><th style="padding:6px;">Desloc. (h)</th><th style="padding:6px;">Presença (h)</th><th style="padding:6px;">Km</th><th style="padding:6px;">Alojamento</th><th style="padding:6px;">Materiais</th>
        </tr>
        ${dayList
          .map(
            (d) => `<tr>
          <td style="padding:6px;border-bottom:1px solid #e4e4e7;">${formatDate(String(d.day_date).slice(0, 10))}</td>
          <td style="padding:6px;border-bottom:1px solid #e4e4e7;">${Number(d.travel_hours) || 0}</td>
          <td style="padding:6px;border-bottom:1px solid #e4e4e7;">${Number(d.presence_hours) || 0}</td>
          <td style="padding:6px;border-bottom:1px solid #e4e4e7;">${Number(d.kms) || 0}</td>
          <td style="padding:6px;border-bottom:1px solid #e4e4e7;">${escapeHtml(d.accommodation)}</td>
          <td style="padding:6px;border-bottom:1px solid #e4e4e7;">${escapeHtml(d.materials)}</td>
        </tr>`,
          )
          .join("")}
      </table>`
    : "";

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
          ${technicianNames.length ? `<tr><td class="meta-label">Quem foi</td><td>${escapeHtml(technicianNames.join(", "))}</td></tr>` : ""}
          ${report.job ? `<tr><td class="meta-label">Serviço / Job</td><td>${escapeHtml(report.job.reference)} — ${escapeHtml(report.job.title)}</td></tr>` : ""}
          <tr><td class="meta-label">Tipo</td><td>${serviceTypeLabels[report.service_type]}</td></tr>
          <tr><td class="meta-label">Estado</td><td>${report.status === "terminado" ? "Terminado" : "Por terminar"}</td></tr>
        </table>
        ${daysTable}
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

// ---------- Agrupamento por obra ----------

const SERVICE_TYPE_LABELS = {
  avaria: "Avaria",
  preventiva: "Preventiva",
  garantia: "Garantia",
} as const;

const dayKey = (value?: string | null) => String(value || "").slice(0, 10);

const keyToDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const dateToKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDayShort = (key: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
  }).format(keyToDate(key));

const getReportDayKeys = (report: ServiceReport): string[] => {
  const keys = (report.days || [])
    .map((d) => dayKey(d.day_date))
    .filter(Boolean)
    .sort();
  if (keys.length > 0) return Array.from(new Set(keys));
  const start = dayKey(getReportStart(report));
  const end = dayKey(getReportEnd(report));
  if (!start) return [];
  if (!end || end === start) return [start];
  // Registo antigo com intervalo: mostra cada dia do intervalo (máx. 62)
  const out: string[] = [];
  const cursor = keyToDate(start);
  const last = keyToDate(end);
  while (cursor <= last && out.length < 62) {
    out.push(dateToKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

const sumDays = (report: ServiceReport) => {
  const days = report.days || [];
  return {
    hours: days.reduce(
      (s, d) =>
        s +
        (Number(d.travel_hours) || 0) +
        (Number(d.presence_hours) || 0),
      0,
    ),
    kms: days.reduce((s, d) => s + (Number(d.kms) || 0), 0),
  };
};

const formatNumber = (n: number) =>
  String(Math.round(n * 100) / 100).replace(".", ",");

const refParts = (report: ServiceReport) => {
  const ref = String(report.job?.reference || "");
  const m = ref.match(/^([A-Za-z][A-Za-z_ ]*?)[\s_\-/]*(\d{4})/);
  return m
    ? { type: m[1].replace(/[\s_]+$/, "").toUpperCase(), year: m[2] }
    : { type: "", year: "" };
};

interface ObraGroup {
  key: string;
  jobId: string | null;
  job: any | null;
  title: string;
  reference: string;
  client: string;
  all: ServiceReport[];
  visible: ServiceReport[];
  status: "terminado" | "por_terminar";
  latest: string;
}

function buildGroups(
  all: ServiceReport[],
  visible: ServiceReport[],
): ObraGroup[] {
  const visibleIds = new Set(visible.map((r) => r.id));
  const map = new Map<string, ObraGroup>();
  for (const report of all) {
    const key = report.job_id || "__sem_obra__";
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        jobId: report.job_id || null,
        job: report.job || null,
        title: report.job_id
          ? report.job?.title || "Obra"
          : "Sem obra",
        reference: report.job?.reference || "",
        client: "",
        all: [],
        visible: [],
        status: "terminado",
        latest: "",
      };
      map.set(key, group);
    }
    group.all.push(report);
    if (visibleIds.has(report.id)) group.visible.push(report);
    if (report.status !== "terminado") group.status = "por_terminar";
    if (!group.client && report.client_name)
      group.client = report.client_name;
    if ((report.created_at || "") > group.latest)
      group.latest = report.created_at || "";
  }
  return Array.from(map.values())
    .filter((g) => g.visible.length > 0)
    .map((g) => ({
      ...g,
      visible: [...g.visible].sort((a, b) =>
        getReportStart(b).localeCompare(getReportStart(a)),
      ),
    }))
    .sort((a, b) => {
      // "Sem obra" vai sempre para o fim
      if (a.jobId === null) return 1;
      if (b.jobId === null) return -1;
      return b.latest.localeCompare(a.latest);
    });
}

export function ServiceReportsPage() {
  const { currentUser, users } = useApp();
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: "",
    status: "todos" as "terminado" | "por_terminar" | "todos",
    serviceType: "todos" as
      "avaria" | "preventiva" | "garantia" | "todos",
    technicianId: "",
    dateFrom: "",
    dateTo: "",
    jobScope: "todas" as "todas" | "com" | "sem",
    refType: "",
    refYear: "",
    files: "todos" as "todos" | "com" | "sem",
    client: "",
    sort: "recentes" as "recentes" | "antigas" | "nome",
  });
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingReport, setEditingReport] =
    useState<ServiceReport | null>(null);
  const [preset, setPreset] = useState<ObraGroup | null>(null);

  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "projeto" ||
    currentUser?.role === "chefe_producao";
  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "todos" ||
    filters.serviceType !== "todos" ||
    filters.technicianId !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.jobScope !== "todas" ||
    filters.refType !== "" ||
    filters.refYear !== "" ||
    filters.files !== "todos" ||
    filters.client !== "";
  const refTypeOptions = Array.from(
    new Set(reports.map((r) => refParts(r).type).filter(Boolean)),
  ).sort();
  const refYearOptions = Array.from(
    new Set(reports.map((r) => refParts(r).year).filter(Boolean)),
  ).sort()
    .reverse();
  const technicianOptions = Array.from(
    new Map(
      (users || [])
        .filter(
          (u: any) =>
            u &&
            u.id != null &&
            typeof u.nome === "string" &&
            u.nome.trim() !== "" &&
            u.ativo !== false,
        )
        .map((u: any) => [String(u.id), u] as [string, any]),
    ).values(),
  ).sort((a: any, b: any) => a.nome.localeCompare(b.nome, "pt"));

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() !== filters.search)
        changeFilter({ search: searchInput.trim() });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadAll = async () => {
    setLoading(true);
    try {
      setReports(await serviceReportsAPI.getAll());
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
      technicianId: "",
      dateFrom: "",
      dateTo: "",
      jobScope: "todas",
      refType: "",
      refYear: "",
      files: "todos",
      client: "",
      sort: "recentes",
    });
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Eliminar esta sub-assistência e os documentos associados?",
      )
    )
      return;
    try {
      await serviceReportsAPI.delete(id);
      await loadAll();
    } catch (error) {
      console.error("Erro ao eliminar relatório:", error);
      alert("Não foi possível eliminar a sub-assistência.");
    }
  };

  const visibleReports = reports.filter((r) => {
    if (filters.status !== "todos" && r.status !== filters.status)
      return false;
    if (
      filters.serviceType !== "todos" &&
      r.service_type !== filters.serviceType
    )
      return false;
    if (
      filters.technicianId &&
      !(r.technician_ids || []).map(String).includes(filters.technicianId)
    )
      return false;
    if (filters.jobScope === "com" && !r.job_id) return false;
    if (filters.jobScope === "sem" && r.job_id) return false;
    if (filters.refType || filters.refYear) {
      const parts = refParts(r);
      if (filters.refType && parts.type !== filters.refType) return false;
      if (filters.refYear && parts.year !== filters.refYear) return false;
    }
    const nFiles = getDocuments(r).length;
    if (filters.files === "com" && nFiles === 0) return false;
    if (filters.files === "sem" && nFiles > 0) return false;
    if (
      filters.client &&
      !getClientName(r).toLowerCase().includes(filters.client.toLowerCase())
    )
      return false;
    const start = dayKey(getReportStart(r));
    const end = dayKey(getReportEnd(r));
    if (filters.dateFrom && end < filters.dateFrom) return false;
    if (filters.dateTo && start > filters.dateTo) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        r.service_number,
        r.client_name,
        r.observations,
        r.work_performed,
        r.job?.title,
        r.job?.reference,
        r.job_id ? "" : "sem obra",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const groups = (() => {
    const list = buildGroups(reports, visibleReports);
    const sem = list.filter((g) => g.jobId === null);
    const com = list.filter((g) => g.jobId !== null);
    if (filters.sort === "antigas") com.reverse();
    if (filters.sort === "nome")
      com.sort((a, b) => a.title.localeCompare(b.title, "pt"));
    return [...com, ...sem];
  })();
  const total = groups.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageGroups = groups.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstShown = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(currentPage * PAGE_SIZE, total);

  const openNew = (group: ObraGroup | null) => {
    setEditingReport(null);
    setPreset(group);
    setCreateOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600 dark:text-red-400">
            ASSISTÊNCIA TÉCNICA
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Assistências por Obra
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cada obra tem uma assistência, com as sub-assistências lá
            dentro. Em cada sub-assistência escolhe várias datas de
            uma vez e indica horas, km, alojamento e materiais por
            data.
          </p>
        </div>
        {canCreate && (
          <Button
            className="h-10 bg-red-600 text-white hover:bg-red-700"
            onClick={() => openNew(null)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova assistência
          </Button>
        )}
      </header>

      {canCreate && (
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setEditingReport(null);
              setPreset(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] !max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReport
                  ? "Editar sub-assistência"
                  : preset
                    ? `Nova sub-assistência · ${preset.title}`
                    : "Registar assistência"}
              </DialogTitle>
            </DialogHeader>
            {createOpen && (
              <ServiceReportForm
                report={editingReport}
                preset={preset}
                onClose={() => {
                  setCreateOpen(false);
                  setEditingReport(null);
                  setPreset(null);
                }}
                onSaved={loadAll}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <section className="overflow-hidden erp-surface">
        <div className="space-y-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeFilter({ status: option.value })}
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
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Pesquisar por obra, cliente, número ou observações"
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
            <select
              value={filters.technicianId}
              onChange={(event) =>
                changeFilter({ technicianId: event.target.value })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Todos Func.</option>
              {technicianOptions.map((u: any) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>De</span>
              <Input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(event) =>
                  changeFilter({ dateFrom: event.target.value })
                }
                className="h-9 min-w-[9.5rem]"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Até</span>
              <Input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) =>
                  changeFilter({ dateTo: event.target.value })
                }
                className="h-9 min-w-[9.5rem]"
              />
            </label>
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
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[auto_auto_auto_auto_1fr_auto]">
            <select
              value={filters.jobScope}
              onChange={(e) =>
                changeFilter({
                  jobScope: e.target.value as typeof filters.jobScope,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="todas">Com e sem obra</option>
              <option value="com">Só com obra</option>
              <option value="sem">Só sem obra</option>
            </select>
            <select
              value={filters.refType}
              onChange={(e) => changeFilter({ refType: e.target.value })}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Tipo de Ref.</option>
              {refTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.refYear}
              onChange={(e) => changeFilter({ refYear: e.target.value })}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="">Ano</option>
              {refYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={filters.files}
              onChange={(e) =>
                changeFilter({
                  files: e.target.value as typeof filters.files,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="todos">Com ou sem ficheiros</option>
              <option value="com">Com ficheiros</option>
              <option value="sem">Sem ficheiros</option>
            </select>
            <Input
              value={filters.client}
              onChange={(e) => changeFilter({ client: e.target.value })}
              placeholder="Filtrar por cliente"
              className="h-9"
            />
            <select
              value={filters.sort}
              onChange={(e) =>
                changeFilter({
                  sort: e.target.value as typeof filters.sort,
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="recentes">Obras mais recentes</option>
              <option value="antigas">Obras mais antigas</option>
              <option value="nome">Obras por nome</option>
            </select>
          </div>
          {groups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {groups.length} {groups.length === 1 ? "obra" : "obras"}
              </span>
              <button
                type="button"
                onClick={() => setCollapsed(new Set())}
                className="rounded-md border border-border px-2.5 py-1 font-medium hover:bg-muted"
              >
                Mostrar todas as sub-assistências
              </button>
              <button
                type="button"
                onClick={() =>
                  setCollapsed(new Set(groups.map((g) => g.key)))
                }
                className="rounded-md border border-border px-2.5 py-1 font-medium hover:bg-muted"
              >
                Esconder todas
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A
            carregar assistências…
          </div>
        ) : pageGroups.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {pageGroups.map((group) => (
              <ObraGroupCard
                key={group.key}
                group={group}
                users={users || []}
                canEdit={canCreate}
                open={!collapsed.has(group.key)}
                onToggle={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(group.key)) next.delete(group.key);
                    else next.add(group.key);
                    return next;
                  })
                }
                onAdd={() => openNew(group)}
                onEdit={(report) => {
                  setPreset(null);
                  setEditingReport(report);
                  setCreateOpen(true);
                }}
                onDelete={handleDelete}
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
              {firstShown}–{lastShown} de {total} obras
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <span className="px-3 text-xs text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setPage(currentPage + 1)}
              >
                Seguinte <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const STATUS_BADGE = {
  terminado:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400",
  por_terminar:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400",
} as const;

function ObraGroupCard({
  group,
  users,
  canEdit,
  open,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: {
  group: ObraGroup;
  users: Array<{ id: string; nome: string }>;
  canEdit: boolean;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onEdit: (report: ServiceReport) => void;
  onDelete: (id: string) => void;
}) {
  const semObra = group.jobId === null;
  const pending = group.all.filter((r) => r.status !== "terminado").length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 bg-zinc-50/70 px-5 py-4 dark:bg-zinc-800/30">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-zinc-900 dark:text-zinc-50">
              {group.title}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {semObra
                ? "Assistências antigas ou não associadas a uma obra"
                : [group.reference, group.client]
                    .filter(Boolean)
                    .join(" · ")}
            </span>
          </span>
          <ChevronDown
            className={`ml-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {group.all.length}{" "}
            {group.all.length === 1
              ? "sub-assistência"
              : "sub-assistências"}
          </Badge>
          <Badge className={STATUS_BADGE[group.status]}>
            {group.status === "terminado"
              ? "Terminada"
              : `Por terminar${pending > 1 ? ` (${pending})` : ""}`}
          </Badge>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onAdd}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Sub-assistência
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {group.visible.map((report) => (
            <SubRow
              key={report.id}
              report={report}
              users={users}
              canEdit={canEdit}
              onEdit={() => onEdit(report)}
              onDelete={() => onDelete(report.id)}
              onDownload={() => downloadServiceReportDoc(report, users)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubRow({
  report,
  canEdit,
  onEdit,
  onDelete,
  onDownload,
  users,
}: {
  report: ServiceReport;
  users: Array<{ id: string; nome: string }>;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const [showDays, setShowDays] = useState(false);
  const documents = getDocuments(report);
  const technicianNames = getTechnicianNames(report, users);
  const dayKeys = getReportDayKeys(report);
  const totals = sumDays(report);
  const hasDetail = (report.days || []).length > 0;
  return (
    <div className="py-4 pl-8 pr-5 sm:pl-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-100">
            <Wrench className="h-3.5 w-3.5 text-red-500" />
            <span className="font-mono text-xs text-zinc-500">
              {report.service_number}
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {getClientName(report)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {documents.length > 0 && (
            <Badge className={STATUS_BADGE.terminado}>
              <Paperclip className="mr-1 h-3 w-3" />{" "}
              {documents.length === 1
                ? "1 ficheiro"
                : `${documents.length} ficheiros`}
            </Badge>
          )}
          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {SERVICE_TYPE_LABELS[report.service_type]}
          </Badge>
          <Badge className={STATUS_BADGE[report.status]}>
            {report.status === "terminado" ? "Terminado" : "Por terminar"}
          </Badge>
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
                aria-label="Editar sub-assistência"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                onClick={onDelete}
                aria-label="Eliminar sub-assistência"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {dayKeys.map((key) => (
          <span
            key={key}
            className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {formatDayShort(key)}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {technicianNames.length > 0 && (
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-red-500" />
            {technicianNames.join(", ")}
          </span>
        )}
        {hasDetail && (
          <span>
            {formatNumber(totals.hours)} h · {formatNumber(totals.kms)} km
          </span>
        )}
        {documents.length === 0 && report.expenses_text && (
          <span className="line-clamp-1 max-w-xl">
            Gasto: {report.expenses_text}
          </span>
        )}
        {hasDetail && (
          <button
            type="button"
            onClick={() => setShowDays((v) => !v)}
            className="font-medium text-red-600 hover:underline dark:text-red-400"
          >
            {showDays ? "Esconder detalhe por data" : "Ver detalhe por data"}
          </button>
        )}
      </div>

      {showDays && hasDetail && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[34rem] text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Desloc. (h)</th>
                <th className="px-3 py-2 font-medium">Presença (h)</th>
                <th className="px-3 py-2 font-medium">Km</th>
                <th className="px-3 py-2 font-medium">Alojamento</th>
                <th className="px-3 py-2 font-medium">Materiais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...(report.days || [])]
                .sort((a, b) =>
                  dayKey(a.day_date).localeCompare(dayKey(b.day_date)),
                )
                .map((d) => (
                  <tr key={d.id || d.day_date}>
                    <td className="px-3 py-2 font-medium">
                      {formatDate(dayKey(d.day_date))}
                    </td>
                    <td className="px-3 py-2">{formatNumber(Number(d.travel_hours) || 0)}</td>
                    <td className="px-3 py-2">{formatNumber(Number(d.presence_hours) || 0)}</td>
                    <td className="px-3 py-2">{formatNumber(Number(d.kms) || 0)}</td>
                    <td className="px-3 py-2">{d.accommodation || "—"}</td>
                    <td className="px-3 py-2">{d.materials || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              title={doc.name}
              className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-red-300 hover:text-red-600"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-red-500" />
              <span className="truncate">{doc.name}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface DayRow {
  travelHours: string;
  presenceHours: string;
  kms: string;
  accommodation: string;
  materials: string;
}

const emptyDayRow = (): DayRow => ({
  travelHours: "",
  presenceHours: "",
  kms: "",
  accommodation: "",
  materials: "",
});

const toNum = (v: string) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function initialDayRows(report: ServiceReport | null): Record<string, DayRow> {
  const rows: Record<string, DayRow> = {};
  if (!report) return rows;
  const byKey = new Map(
    (report.days || []).map((d) => [dayKey(d.day_date), d]),
  );
  for (const key of getReportDayKeys(report)) {
    const d = byKey.get(key);
    rows[key] = d
      ? {
          travelHours: d.travel_hours ? String(d.travel_hours) : "",
          presenceHours: d.presence_hours ? String(d.presence_hours) : "",
          kms: d.kms ? String(d.kms) : "",
          accommodation: d.accommodation || "",
          materials: d.materials || "",
        }
      : emptyDayRow();
  }
  return rows;
}

function ServiceReportForm({
  report,
  preset,
  onClose,
  onSaved,
}: {
  report: ServiceReport | null;
  preset: ObraGroup | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const { users } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [removedDocIds, setRemovedDocIds] = useState<string[]>([]);
  const [technicianIds, setTechnicianIds] = useState<string[]>(
    (report?.technician_ids || []).map(String),
  );
  const [dayRows, setDayRows] = useState<Record<string, DayRow>>(
    () => initialDayRows(report),
  );
  const [form, setForm] = useState({
    jobId: report?.job_id || preset?.jobId || "",
    clientName: report
      ? getClientName(report)
      : preset?.client || "",
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

  const existingDocs = report
    ? getDocuments(report).filter((d) => !removedDocIds.includes(d.id))
    : [];
  const hasDocument = files.length > 0 || existingDocs.length > 0;
  const technicianOptions = Array.from(
    new Map(
      (users || [])
        .filter(
          (u: any) =>
            u &&
            u.id != null &&
            typeof u.nome === "string" &&
            u.nome.trim() !== "" &&
            (u.ativo !== false ||
              technicianIds.includes(String(u.id))),
        )
        .map((u: any) => [String(u.id), u] as [string, any]),
    ).values(),
  ).sort((a: any, b: any) => a.nome.localeCompare(b.nome, "pt"));
  const toggleTechnician = (id: string) =>
    setTechnicianIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectedKeys = Object.keys(dayRows).sort();
  const lockedObra = !report && preset?.jobId ? preset : null;

  const onSelectDates = (dates: Date[] | undefined) => {
    const keys = (dates || []).map(dateToKey);
    setDayRows((current) => {
      const next: Record<string, DayRow> = {};
      for (const key of keys) next[key] = current[key] || emptyDayRow();
      return next;
    });
  };
  const updateDay = (key: string, patch: Partial<DayRow>) =>
    setDayRows((current) => ({
      ...current,
      [key]: { ...(current[key] || emptyDayRow()), ...patch },
    }));

  const selectFiles = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const accepted: File[] = [];
    const tooBig: string[] = [];
    Array.from(selected).forEach((f) => {
      if (f.size > MAX_FILE_SIZE) tooBig.push(f.name);
      else accepted.push(f);
    });
    if (tooBig.length > 0)
      alert(
        `Não pode ultrapassar 15 MB por ficheiro:\n${tooBig.join("\n")}`,
      );
    if (accepted.length === 0) return;
    setFiles((current) => {
      const known = new Set(current.map((f) => `${f.name}|${f.size}`));
      return [
        ...current,
        ...accepted.filter((f) => !known.has(`${f.name}|${f.size}`)),
      ];
    });
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedKeys.length === 0) {
      alert("Escolha pelo menos uma data no calendário.");
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
        `${selectedKeys[0]}T12:00:00`,
      ).toISOString(),
      endDate: new Date(
        `${selectedKeys[selectedKeys.length - 1]}T12:00:00`,
      ).toISOString(),
      reportDate: new Date(
        `${selectedKeys[selectedKeys.length - 1]}T12:00:00`,
      ).toISOString(),
      serviceType: form.serviceType,
      expensesText: form.expensesText,
      anomalies: form.anomalies,
      workPerformed: form.workPerformed,
      observations: form.observations,
      status: form.status,
      days: selectedKeys.map((key) => ({
        dayDate: key,
        travelHours: toNum(dayRows[key].travelHours),
        presenceHours: toNum(dayRows[key].presenceHours),
        kms: toNum(dayRows[key].kms),
        accommodation: dayRows[key].accommodation.trim(),
        materials: dayRows[key].materials.trim(),
      })),
      technicianIds,
      documents: files,
    };

    try {
      if (report) {
        await serviceReportsAPI.update(report.id, {
          ...payload,
          jobId: form.jobId || null,
          removeDocumentIds: removedDocIds,
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
        <div className="space-y-2 sm:col-span-2">
          <div>
            <Label>Obra (serviço / job)</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lockedObra
                ? "Esta sub-assistência fica dentro da obra abaixo."
                : "Facultativo — sem obra, fica na secção “Sem obra”. Pode associar a PROD, PROD_INT ou outro tipo de job."}
            </p>
          </div>
          {lockedObra ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {lockedObra.title}
              </p>
              {lockedObra.reference && (
                <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  {lockedObra.reference}
                </p>
              )}
            </div>
          ) : (
            <JobSearchPicker
              value={form.jobId}
              onChange={(jobId) => update("jobId", jobId)}
              onPickJob={(job) => {
                const c = JOB_CLIENT_COLUMN
                  ? (job?.[JOB_CLIENT_COLUMN] as string)
                  : "";
                setForm((current) =>
                  current.clientName.trim() || !c
                    ? current
                    : { ...current, clientName: c },
                );
              }}
              knownJobs={report?.job ? [report.job] : []}
            />
          )}
        </div>
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="serviceType">Tipo de assistência</Label>
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
              onChange={(event) => update("status", event.target.value)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="por_terminar">Por terminar</option>
              <option value="terminado">Terminado</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarRange className="h-4 w-4 text-red-500" /> Datas da
          sub-assistência *
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clique em vários dias do calendário. Para cada data pode
          indicar horas de deslocação e de presença, km, alojamento e
          materiais.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="justify-self-start rounded-lg border border-border">
            <Calendar
              mode="multiple"
              locale={pt}
              weekStartsOn={1}
              selected={selectedKeys.map(keyToDate)}
              onSelect={onSelectDates}
              defaultMonth={
                selectedKeys[0] ? keyToDate(selectedKeys[0]) : undefined
              }
            />
          </div>
          <div className="min-w-0 space-y-3">
            {selectedKeys.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                Ainda não escolheu nenhuma data.
              </p>
            )}
            {selectedKeys.map((key) => {
              const row = dayRows[key] || emptyDayRow();
              return (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(key)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setDayRows((current) => {
                          const next = { ...current };
                          delete next[key];
                          return next;
                        })
                      }
                      className="text-xs text-muted-foreground hover:text-red-600"
                    >
                      Remover data
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Desloc. (h)
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={row.travelHours}
                        onChange={(e) =>
                          updateDay(key, { travelHours: e.target.value })
                        }
                        className="h-8"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Presença (h)
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={row.presenceHours}
                        onChange={(e) =>
                          updateDay(key, { presenceHours: e.target.value })
                        }
                        className="h-8"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Km
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={row.kms}
                        onChange={(e) =>
                          updateDay(key, { kms: e.target.value })
                        }
                        className="h-8"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Alojamento
                      </Label>
                      <Input
                        value={row.accommodation}
                        onChange={(e) =>
                          updateDay(key, { accommodation: e.target.value })
                        }
                        className="h-8"
                        placeholder="Hotel, noites…"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Materiais
                      </Label>
                      <Input
                        value={row.materials}
                        onChange={(e) =>
                          updateDay(key, { materials: e.target.value })
                        }
                        className="h-8"
                        placeholder="Materiais usados"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-red-500" /> Quem foi
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Facultativo — escolha uma ou mais pessoas que fizeram
              a assistência.
            </p>
          </div>
          {technicianIds.length > 0 && (
            <button
              type="button"
              onClick={() => setTechnicianIds([])}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-red-600 hover:underline"
            >
              Limpar ({technicianIds.length})
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {technicianOptions.map((u: any) => {
            const id = String(u.id);
            const selected = technicianIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleTechnician(id)}
                aria-pressed={selected}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-border bg-muted/50 text-foreground hover:border-red-300"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
                {u.nome}
              </button>
            );
          })}
          {technicianOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Não há utilizadores para escolher.
            </p>
          )}
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
              Ficheiros da assistência
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pode anexar vários ficheiros. Com pelo menos um, os
              detalhes técnicos deixam de ser obrigatórios. Aceita
              PDF, Word, Excel e imagens, até 15 MB cada.
            </p>

            {(existingDocs.length > 0 || files.length > 0) && (
              <ul className="mt-3 space-y-1.5">
                {existingDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {doc.name}
                    </a>
                    {doc.size ? (
                      <span className="shrink-0 text-muted-foreground">
                        {formatFileSize(doc.size)}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setRemovedDocIds((current) => [
                          ...current,
                          doc.id,
                        ])
                      }
                      className="ml-auto shrink-0 text-zinc-500 underline-offset-2 hover:text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </li>
                ))}
                {files.map((f, index) => (
                  <li
                    key={`${f.name}-${f.size}-${index}`}
                    className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 font-normal text-muted-foreground">
                      {formatFileSize(f.size)} · novo
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      className="ml-auto shrink-0 font-normal text-zinc-500 hover:text-red-600"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="mt-3 inline-flex h-9 cursor-pointer items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <UploadCloud className="mr-2 h-4 w-4" />{" "}
              {hasDocument ? "Adicionar mais ficheiros" : "Escolher ficheiros"}
              <input
                type="file"
                multiple
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={(event) => {
                  selectFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
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
          {report ? "Guardar alterações" : "Criar sub-assistência"}
        </Button>
      </div>
    </form>
  );
}