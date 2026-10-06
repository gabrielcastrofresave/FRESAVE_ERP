// src/app/pages/JobsPage.tsx

import { useState, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import {
  jobsAPI,
  productionTasksAPI,
  calcJobHoursConsumed,
  JOB_CHECKLIST_ITEMS,
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
  ClipboardList,
  Clock3,
  Download,
  FileCheck2,
  Loader2,
  Plus,
  Users,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";

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

// Fases fixas (iguais para todos os trabalhos) + progresso guardado na BD
type Stage = {
  key: string;
  label: string;
  checked: boolean;
  checked_at: string | null;
};

const getStages = (job: any): Stage[] =>
  JOB_CHECKLIST_ITEMS.map((stage) => {
    const row = (job.checklist || []).find(
      (c: any) => c.item_key === stage.key,
    );
    return {
      key: stage.key,
      label: stage.label,
      checked: Boolean(row?.checked),
      checked_at: row?.checked_at ?? null,
    };
  });

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

        ${
          job.description
            ? `<h2>Descrição / Âmbito</h2><p class="section-text">${job.description}</p>`
            : ""
        }

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
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [jobToComplete, setJobToComplete] = useState<any | null>(
    null,
  );

  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "projeto" ||
    currentUser?.role === "chefe_producao";

  // silent = recarrega sem mostrar o spinner (usado depois de marcar fases)
  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [jobsData, tasksData] = await Promise.all([
        jobsAPI.getAll(),
        productionTasksAPI.getAll(),
      ]);
      setJobs(jobsData);
      setTasks(tasksData);
    } catch (error) {
      console.error("Erro ao carregar trabalhos:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const isOverdue = (job: any) => {
    const pastDueDate = new Date(job.due_date).getTime() < Date.now();
    if (pastDueDate) return true;
    if (job.max_hours) {
      const consumed = calcJobHoursConsumed(job, tasks);
      return consumed >= Number(job.max_hours);
    }
    return false;
  };

  const isChecklistComplete = (job: any) =>
    getStages(job).every((s) => s.checked);

  const active = useMemo(
    () => jobs.filter((j) => j.status === "em_curso"),
    [jobs],
  );
  const completed = useMemo(
    () => jobs.filter((j) => j.status === "concluido"),
    [jobs],
  );
  const overdue = useMemo(
    () => active.filter(isOverdue),
    [active, tasks],
  );

  const handleToggleStage = async (
    jobId: string,
    stageKey: string,
    checked: boolean,
  ) => {
    // Atualiza logo no ecrã, sem esperar pela base de dados
    const checkedAt = checked ? new Date().toISOString() : null;
    setJobs((current) =>
      current.map((job) => {
        if (job.id !== jobId) return job;
        const rows = job.checklist || [];
        const exists = rows.some((r: any) => r.item_key === stageKey);
        const checklist = exists
          ? rows.map((r: any) =>
              r.item_key === stageKey
                ? { ...r, checked, checked_at: checkedAt }
                : r,
            )
          : [
              ...rows,
              { item_key: stageKey, checked, checked_at: checkedAt },
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
      await loadAll(true);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm("Eliminar este trabalho? Esta ação não pode ser desfeita.")) {
      try {
        await jobsAPI.delete(id);
        await loadAll();
      } catch (error) {
        console.error("Erro ao eliminar trabalho:", error);
        alert("Erro ao eliminar trabalho.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            ORDEM DE TRABALHO
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Trabalhos e Relatórios
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Cada trabalho tem um prazo, as mesmas fases de produção e,
            opcionalmente, um limite de horas. Só é possível concluir
            depois de todas as fases estarem marcadas.
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
                className="h-10 bg-red-600 text-white hover:bg-red-700"
                onClick={() => setEditingJob(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Trabalho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingJob ? "Editar Trabalho" : "Criar Trabalho"}
                </DialogTitle>
              </DialogHeader>
              <JobForm
                job={editingJob}
                users={users}
                onClose={() => {
                  setCreateOpen(false);
                  setEditingJob(null);
                }}
                onSaved={() => loadAll()}
              />
            </DialogContent>
          </Dialog>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <WorkMetric
          label="Em Execução"
          value={active.length}
          icon={Clock3}
          tone="zinc"
        />
        <WorkMetric
          label="Fora do Prazo/Limite"
          value={overdue.length}
          icon={AlertTriangle}
          tone="red"
        />
        <WorkMetric
          label="Concluídos"
          value={completed.length}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                EM CURSO
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Fila de Trabalhos
              </h2>
            </div>
            <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {active.length}
            </Badge>
          </div>
          {loading ? (
            <LoadingState />
          ) : active.length ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {active.map((job) => (
                <ActiveJob
                  key={job.id}
                  job={job}
                  overdue={isOverdue(job)}
                  hoursConsumed={calcJobHoursConsumed(job, tasks)}
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
                  onDelete={() => handleDeleteJob(job.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyWork text="Não existem trabalhos em execução." />
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                HISTÓRICO
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Relatórios Concluídos
              </h2>
            </div>
            <FileCheck2 className="h-5 w-5 text-emerald-500" />
          </div>
          {loading ? (
            <LoadingState />
          ) : completed.length ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {completed.slice(0, 8).map((job) => (
                <CompletedJob key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyWork text="Os relatórios concluídos aparecerão aqui." />
          )}
        </div>
      </section>

      <Dialog
        open={Boolean(jobToComplete)}
        onOpenChange={(open) => !open && setJobToComplete(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Concluir e Registar Relatório</DialogTitle>
          </DialogHeader>
          {jobToComplete && (
            <CompletionForm
              job={jobToComplete}
              overdue={isOverdue(jobToComplete)}
              onClose={() => setJobToComplete(null)}
              onSaved={() => loadAll()}
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
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: "zinc" | "red" | "emerald";
}) {
  const colors = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar
      trabalhos…
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
  const pastDate = new Date(job.due_date).getTime() < Date.now();
  const stages = getStages(job);
  const checkedCount = stages.filter((s) => s.checked).length;
  const totalCount = stages.length;

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
                {job.tracking_code && ` · Rastreio: ${job.tracking_code}`}
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
          {job.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
              {job.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span
              className={
                pastDate ? "font-medium text-red-600 dark:text-red-400" : ""
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
                Horas: {hoursConsumed.toFixed(1)} / {job.max_hours}h
              </span>
            )}
            {job.assignees?.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {job.assignees.map((a: any) => a.nome).join(", ")}
              </span>
            )}
          </div>

          {/* Fases */}
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
                      onToggleStage(item.key, e.target.checked)
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

          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {!checklistComplete && (
              <p className="text-[11px] text-zinc-400">
                Marca todas as fases para poderes concluir o trabalho.
              </p>
            )}
            <Button
              size="sm"
              className="ml-auto h-8 bg-red-600 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
              onClick={onComplete}
              disabled={!checklistComplete}
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
  const [form, setForm] = useState({
    reference: job?.reference || "",
    title: job?.title || "",
    department: job?.department || "",
    description: job?.description || "",
    dueDate: localDateTimeInput(job?.due_date),
    maxHours: job?.max_hours != null ? String(job.max_hours) : "",
  });
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    job?.assignees?.map((a: any) => a.id) || [],
  );
  const [nonStandard, setNonStandard] = useState<boolean>(
    Boolean(job?.non_standard),
  );

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleAssignee = (id: string) => {
    setAssigneeIds((current) =>
      current.includes(id)
        ? current.filter((a) => a !== id)
        : [...current, id],
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (job) {
        await jobsAPI.update(job.id, {
          title: form.title,
          department: form.department || undefined,
          description: form.description || undefined,
          dueDate: new Date(form.dueDate).toISOString(),
          maxHours: form.maxHours ? Number(form.maxHours) : null,
          assigneeIds,
          nonStandard,
        });
      } else {
        await jobsAPI.create({
          reference: form.reference || undefined,
          title: form.title,
          department: form.department || undefined,
          assigneeIds,
          description: form.description || undefined,
          dueDate: new Date(form.dueDate).toISOString(),
          maxHours: form.maxHours ? Number(form.maxHours) : null,
          nonStandard,
        });
      }
      await onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao guardar trabalho:", error);
      alert("Erro ao guardar trabalho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reference">Referência (opcional)</Label>
          <Input
            id="reference"
            value={form.reference}
            onChange={(e) => update("reference", e.target.value)}
            placeholder="Gerada automaticamente"
            disabled={Boolean(job)}
          />
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
        <Label htmlFor="title">Título do Trabalho *</Label>
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
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
            placeholder="Ex: Manutenção"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxHours">Limite de Horas (opcional)</Label>
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

      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
        <input
          type="checkbox"
          checked={nonStandard}
          onChange={(e) => setNonStandard(e.target.checked)}
          className="h-4 w-4 accent-red-600"
        />
        Trabalho não tipo
      </label>

      <div className="space-y-2">
        <Label>Funcionários Atribuídos</Label>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
          {users.map((u: any) => (
            <label
              key={u.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={assigneeIds.includes(u.id)}
                onChange={() => toggleAssignee(u.id)}
                className="h-4 w-4"
              />
              {u.nome}
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-400">
          {assigneeIds.length} funcionário(s) selecionado(s).
        </p>
      </div>
      {!job && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Fases (iguais para todos os trabalhos)
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {JOB_CHECKLIST_ITEMS.map((item) => (
              <li key={item.key}>• {item.label}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição / Âmbito</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Descreva o trabalho a executar e as condições relevantes."
        />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {job ? "Guardar Alterações" : "Criar Trabalho"}
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
        <Label htmlFor="wentWrong">O que correu mal / constrangimentos</Label>
        <Textarea
          id="wentWrong"
          value={form.wentWrong}
          onChange={(e) => update("wentWrong", e.target.value)}
          required
          className="min-h-24"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="conclusion">Conclusão e Próximos Passos</Label>
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
            onChange={(e) => update("delayReason", e.target.value)}
            required
            className="min-h-24"
          />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-red-600 hover:bg-red-700"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Relatório e Concluir
        </Button>
      </div>
    </form>
  );
}