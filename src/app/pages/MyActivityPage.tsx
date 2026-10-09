// src/app/pages/MyActivityPage.tsx

import { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { productionTasksAPI, jobsAPI } from "../api";
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
  DialogDescription,
} from "../components/ui/dialog";
import { JobPicker } from "../components/JobPicker";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";

type ViewMode = "dia" | "semana" | "mes";

const DAY_NAMES = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
];

// Pausas de lanche (em minutos desde a meia-noite) que não contam
const PAUSAS_LANCHE: [number, number][] = [
  [10 * 60 + 30, 10 * 60 + 40], // 10:30–10:40
  [16 * 60, 16 * 60 + 10], // 16:00–16:10
];

// Opções de almoço (valor em minutos; "0" = não almoçou)
const ALMOCO_OPCOES = [
  { value: "0", label: "Não almocei" },
  { value: "30", label: "30 minutos (½ hora)" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1 hora e meia" },
];

function toDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ---------- Cálculo de horas ----------

// Converte "HH:MM" (ou "HH:MM:SS") em minutos desde a meia-noite
function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Minutos brutos entre início e fim; null se inválido
function minutesBetween(
  inicio?: string | null,
  fim?: string | null,
): number | null {
  const a = toMinutes(inicio);
  const b = toMinutes(fim);
  if (a === null || b === null || b <= a) return null;
  return b - a;
}

// Minutos de sobreposição entre dois intervalos
function overlap(
  a1: number,
  a2: number,
  b1: number,
  b2: number,
) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

// Total líquido: desconta pausas de lanche e o almoço escolhido
function netMinutes(
  inicio?: string | null,
  fim?: string | null,
  almocoMin?: number | null,
): number | null {
  const a = toMinutes(inicio);
  const b = toMinutes(fim);
  if (a === null || b === null || b <= a) return null;
  const pausas = PAUSAS_LANCHE.reduce(
    (acc, [p1, p2]) => acc + overlap(a, b, p1, p2),
    0,
  );
  return Math.max(0, b - a - pausas - (almocoMin ?? 0));
}

// Ex.: 510 min -> "8,5 h"
function formatHours(mins: number) {
  return `${(mins / 60).toLocaleString("pt-PT", {
    maximumFractionDigits: 2,
  })} h`;
}

function totalMinutes(list: any[]) {
  return list.reduce(
    (acc, r) =>
      acc +
      (netMinutes(
        r.hora_inicio,
        r.hora_fim,
        r.almoco_minutos,
      ) ?? 0),
    0,
  );
}

export function MyActivityPage() {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(
    null,
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRows, allJobs] = await Promise.all([
        productionTasksAPI.getAll(),
        jobsAPI.getAll(),
      ]);
      setRows(
        allRows.filter(
          (r: any) => r.user_id === currentUser?.id,
        ),
      );
      setJobs(
        allJobs.filter((j: any) => j.status === "em_curso"),
      );
    } catch (error) {
      console.error("Erro ao carregar atividade:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  function shift(direction: number) {
    setCursor((current) => {
      if (view === "dia") return addDays(current, direction);
      if (view === "semana")
        return addDays(current, direction * 7);
      const d = new Date(current);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  }

  const weekStart = startOfWeekMonday(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i),
  );

  const title =
    view === "dia"
      ? cursor.toLocaleDateString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : view === "semana"
        ? `${weekDays[0].toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} — ${weekDays[6].toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}`
        : cursor.toLocaleDateString("pt-PT", {
            month: "long",
            year: "numeric",
          });

  const dayRows = (day: Date) =>
    rows.filter((r: any) => isSameDay(new Date(r.data), day));

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            O MEU ESPAÇO
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            A Minha Atividade
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Os teus registos de horas. Clica num registo para o
            editar.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-red-600 text-white hover:bg-red-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Registo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Novo Registo</DialogTitle>
              <DialogDescription>
                Regista o teu trabalho para um dia específico.
              </DialogDescription>
            </DialogHeader>
            <RegistoForm
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setCreateOpen(false)}
              onSaved={loadData}
            />
          </DialogContent>
        </Dialog>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => shift(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-8 text-xs text-red-600"
              onClick={() => setCursor(new Date())}
            >
              Hoje
            </Button>
            <h2 className="ml-2 text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
              {title}
            </h2>
          </div>
          <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {(["dia", "semana", "mes"] as ViewMode[]).map(
              (v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {v === "mes" ? "Mês" : v}
                </button>
              ),
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[28rem] items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
            carregar registos…
          </div>
        ) : view === "dia" ? (
          <div className="min-h-[20rem] space-y-2 p-4">
            {dayRows(cursor).length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                Sem registos neste dia.
              </p>
            ) : (
              <>
                {dayRows(cursor).map((row: any) => (
                  <TaskPill
                    key={row.id}
                    row={row}
                    onClick={() => setEditingRow(row)}
                  />
                ))}
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Total do dia
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {formatHours(totalMinutes(dayRows(cursor)))}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : view === "semana" ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[840px] grid-cols-7 divide-x divide-zinc-100 dark:divide-zinc-800">
              <div className="col-span-7 grid grid-cols-7 divide-x divide-zinc-100 bg-zinc-50 dark:divide-zinc-800 dark:bg-zinc-800/50">
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`px-3 py-3 text-center ${
                      isSameDay(day, new Date())
                        ? "bg-red-50 dark:bg-red-950/20"
                        : ""
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      {DAY_NAMES[(day.getDay() + 6) % 7]}
                    </p>
                    <p
                      className={`mt-1 text-lg font-semibold ${
                        isSameDay(day, new Date())
                          ? "text-red-600"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                ))}
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="min-h-[20rem] space-y-2 bg-white p-2 dark:bg-zinc-900"
                >
                  {dayRows(day).map((row: any) => (
                    <TaskPill
                      key={row.id}
                      compact
                      row={row}
                      onClick={() => setEditingRow(row)}
                    />
                  ))}
                </div>
              ))}
              {/* Rodapé: total de horas líquidas trabalhadas por dia */}
              <div className="col-span-7 grid grid-cols-7 divide-x divide-zinc-100 border-t border-zinc-200 bg-zinc-50 dark:divide-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50">
                {weekDays.map((day) => {
                  const total = totalMinutes(dayRows(day));
                  return (
                    <div
                      key={`total-${day.toISOString()}`}
                      className="px-3 py-3 text-center"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {total > 0 ? formatHours(total) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <MonthView
            cursor={cursor}
            rows={rows}
            onSelect={setEditingRow}
          />
        )}
      </section>

      {/* Modal: editar registo */}
      <Dialog
        open={Boolean(editingRow)}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Registo</DialogTitle>
            <DialogDescription>
              {editingRow &&
                new Date(editingRow.data).toLocaleDateString(
                  "pt-PT",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )}
            </DialogDescription>
          </DialogHeader>
          {editingRow && (
            <RegistoForm
              key={editingRow.id}
              row={editingRow}
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setEditingRow(null)}
              onSaved={loadData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskPill({
  row,
  onClick,
  compact = false,
}: {
  row: any;
  onClick: () => void;
  compact?: boolean;
}) {
  const liquidos = netMinutes(
    row.hora_inicio,
    row.hora_fim,
    row.almoco_minutos,
  );
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-left transition-shadow hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 ${
        compact ? "p-2" : ""
      }`}
    >
      <p className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        {row.titulo || "(sem título)"}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px]">
        <span className="text-zinc-500 dark:text-zinc-400">
          {row.hora_inicio && row.hora_fim
            ? `${row.hora_inicio.slice(0, 5)}–${row.hora_fim.slice(0, 5)}`
            : "Sem horário"}
        </span>
        {liquidos !== null && (
          <span className="font-bold text-zinc-900 dark:text-zinc-50">
            {formatHours(liquidos)}
          </span>
        )}
      </div>
    </button>
  );
}

function MonthView({
  cursor,
  rows,
  onSelect,
}: {
  cursor: Date;
  rows: any[];
  onSelect: (row: any) => void;
}) {
  const first = startOfWeekMonday(
    new Date(cursor.getFullYear(), cursor.getMonth(), 1),
  );
  const days = Array.from({ length: 42 }, (_, i) =>
    addDays(first, i),
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 dark:divide-zinc-800">
          {days.map((day) => {
            const dRows = rows.filter((r: any) =>
              isSameDay(new Date(r.data), day),
            );
            const currentMonth =
              day.getMonth() === cursor.getMonth();
            const total = totalMinutes(dRows);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[6.5rem] p-2 ${
                  currentMonth
                    ? "bg-white dark:bg-zinc-900"
                    : "bg-zinc-50/60 dark:bg-zinc-900/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div
                    className={`text-xs font-medium ${
                      isSameDay(day, new Date())
                        ? "grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
                        : currentMonth
                          ? "text-zinc-700 dark:text-zinc-300"
                          : "text-zinc-300 dark:text-zinc-700"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {total > 0 && (
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50">
                      {formatHours(total)}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dRows.slice(0, 3).map((row: any) => (
                    <button
                      key={row.id}
                      onClick={() => onSelect(row)}
                      className="block w-full truncate rounded bg-zinc-100 px-1.5 py-1 text-left text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {row.titulo || "(sem título)"}
                    </button>
                  ))}
                  {dRows.length > 3 && (
                    <p className="px-1 text-[10px] text-zinc-400">
                      +{dRows.length - 3} registos
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Campo de seleção do almoço
function AlmocoSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Almoço *</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 dark:border-zinc-700"
      >
        <option value="" disabled>
          Escolhe uma opção
        </option>
        {ALMOCO_OPCOES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Formulário único: cria um registo novo ou edita um existente (se vier "row")
function RegistoForm({
  row,
  jobs,
  currentUser,
  onClose,
  onSaved,
}: {
  row?: any;
  jobs: any[];
  currentUser: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = Boolean(row);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState(
    row?.titulo && row.titulo !== "(sem título)"
      ? row.titulo
      : "",
  );
  const [jobId, setJobId] = useState(row?.job_id ?? "");
  const [data, setData] = useState(
    row?.data
      ? String(row.data).slice(0, 10)
      : toDateInput(new Date()),
  );
  const [horaInicio, setHoraInicio] = useState(
    row?.hora_inicio?.slice(0, 5) ?? "",
  );
  const [horaFim, setHoraFim] = useState(
    row?.hora_fim?.slice(0, 5) ?? "",
  );
  const [almoco, setAlmoco] = useState(
    row?.almoco_minutos != null
      ? String(row.almoco_minutos)
      : "",
  );

  const horasCalculadas = netMinutes(
    horaInicio,
    horaFim,
    almoco === "" ? null : Number(almoco),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      alert("Indica o título do registo.");
      return;
    }
    if (minutesBetween(horaInicio, horaFim) === null) {
      alert(
        "A hora de fim tem de ser posterior à hora de início.",
      );
      return;
    }
    if (almoco === "") {
      alert("Escolhe a opção de almoço.");
      return;
    }
    if (!isEdit && !currentUser?.id) {
      alert("Sessão inválida. Volta a iniciar sessão.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await productionTasksAPI.updateTask(row.task_id, {
          titulo: titulo.trim(),
          jobId: jobId || null,
          data,
        });
        await productionTasksAPI.updateAssignee(row.id, {
          horaInicio,
          horaFim,
          almocoMinutos: Number(almoco),
        });
      } else {
        await productionTasksAPI.create({
          jobId: jobId || null,
          titulo: titulo.trim(),
          data,
          horaInicio,
          horaFim,
          almocoMinutos: Number(almoco),
          createdBy: currentUser?.id,
          assigneeIds: [currentUser?.id],
        });
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar registo:", error);
      alert(
        `Erro ao guardar registo: ${error?.message ?? JSON.stringify(error)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="mt-3 grid gap-5 md:grid-cols-3"
      onSubmit={submit}
    >
      <div className="space-y-2 md:col-span-3">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Montagem de estrutura"
          required
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Trabalho (opcional)</Label>
        <JobPicker
          jobs={jobs}
          value={jobId}
          onChange={setJobId}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data *</Label>
        <Input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="horaInicio">Hora Início *</Label>
        <Input
          id="horaInicio"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="horaFim">Hora Fim *</Label>
        <Input
          id="horaFim"
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
          required
        />
      </div>

      <AlmocoSelect
        id="almoco"
        value={almoco}
        onChange={setAlmoco}
      />

      <div className="space-y-2 md:col-span-3">
        <Label>Total de horas</Label>
        <div className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
          {horasCalculadas !== null
            ? formatHours(horasCalculadas)
            : "—"}
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Pausas de lanche (10:30–10:40 e 16:00–16:10)
          descontadas automaticamente.
        </p>
      </div>

      <DialogFooter className="mt-2 md:col-span-3">
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
          {isEdit ? "Guardar Alterações" : "Criar Registo"}
        </Button>
      </DialogFooter>
    </form>
  );
}