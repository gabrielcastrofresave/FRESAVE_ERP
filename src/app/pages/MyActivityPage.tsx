// src/app/pages/MyActivityPage.tsx

import { useState, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { productionTasksAPI, jobsAPI } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Hammer,
  Car,
  AlertTriangle,
  Clock3,
  CheckCircle2,
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

const STATUS_STYLES: Record<string, string> = {
  pendente:
    "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  concluido:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400",
  nao_fez: "border-red-600 bg-red-600 text-white",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  nao_fez: "Não Fez",
};

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
function isPastDay(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}
function isToday(dateStr: string) {
  return isSameDay(new Date(dateStr), new Date());
}

function effectiveStatus(row: any) {
  if (row.status === "concluido") return "concluido";
  if (isPastDay(row.data)) return "nao_fez";
  return "pendente";
}

export function MyActivityPage() {
  const { currentUser, vehicles } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [completingRow, setCompletingRow] = useState<
    any | null
  >(null);

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
        allJobs.filter(
          (j: any) =>
            j.status === "em_curso" &&
            j.assignees?.some(
              (a: any) => a.id === currentUser?.id,
            ),
        ),
      );
    } catch (error) {
      console.error("Erro ao carregar atividade:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const todayRows = useMemo(
    () => rows.filter((r: any) => isToday(r.data)),
    [rows],
  );
  const pendingTodayRows = useMemo(
    () =>
      todayRows.filter((r: any) => r.status !== "concluido"),
    [todayRows],
  );
  const overdueRows = useMemo(
    () =>
      rows.filter((r: any) => effectiveStatus(r) === "nao_fez"),
    [rows],
  );

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

  const disponiveis = vehicles.filter(
    (v: any) => v.status === "disponivel",
  ).length;
  const emAvaria = vehicles.filter(
    (v: any) => v.status === "avaria",
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            O MEU ESPAÇO
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            A Minha Atividade
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Consulta os teus trabalhos obrigatórios, os projetos
            atribuídos a ti e o estado geral da frota.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-red-600 text-white hover:bg-red-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Registo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Registo</DialogTitle>
              <DialogDescription>
                Regista uma atividade tua, por tua iniciativa.
              </DialogDescription>
            </DialogHeader>
            <SelfRegisterForm
              currentUser={currentUser}
              jobs={jobs}
              onClose={() => setCreateOpen(false)}
              onSaved={loadData}
            />
          </DialogContent>
        </Dialog>
      </header>

      {/* Trabalhos obrigatórios hoje */}
      <section
        className={`overflow-hidden rounded-xl border shadow-sm ${
          pendingTodayRows.length > 0
            ? "border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/10"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            {pendingTodayRows.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Trabalhos Obrigatórios Hoje
            </h2>
          </div>
          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {pendingTodayRows.length}
          </Badge>
        </div>

        {loading ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-zinc-400">
            A carregar…
          </div>
        ) : todayRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            Não tens trabalhos atribuídos para hoje.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {todayRows.map((row: any) => (
              <div
                key={row.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    row.status === "concluido"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                  }`}
                >
                  {row.tipo === "producao" ? (
                    <Hammer className="h-4 w-4" />
                  ) : (
                    <Clock3 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {row.titulo || "(sem título)"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {row.tipo === "producao"
                      ? "Produção"
                      : "Manutenção"}
                    {row.cliente_obra
                      ? ` · ${row.cliente_obra}`
                      : ""}
                  </p>
                </div>
                {row.status === "concluido" ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                    {row.hora_inicio?.slice(0, 5)}–
                    {row.hora_fim?.slice(0, 5)}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 bg-red-600 text-xs text-white hover:bg-red-700"
                    onClick={() => setCompletingRow(row)}
                  >
                    Registar Horas
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Avisos de dias em falta */}
      {overdueRows.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Tens <strong>{overdueRows.length}</strong>{" "}
            trabalho(s) de dias anteriores que não foram
            registados ("Não Fez").
          </span>
        </div>
      )}

      {/* Os meus projetos */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Projetos Atribuídos a Mim
          </h2>
          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {jobs.length}
          </Badge>
        </div>
        {jobs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            Não tens projetos atribuídos de momento.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {jobs.map((job: any) => (
              <div
                key={job.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <Hammer className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {job.title}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Prazo:{" "}
                    {new Date(job.due_date).toLocaleDateString(
                      "pt-PT",
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Calendário pessoal */}
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
          <div className="flex min-h-[20rem] items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
            carregar registos…
          </div>
        ) : view === "dia" ? (
          <div className="min-h-[16rem] space-y-2 p-4">
            {dayRows(cursor).length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                Sem registos neste dia.
              </p>
            ) : (
              dayRows(cursor).map((row: any) => (
                <TaskPill
                  key={row.id}
                  row={row}
                  onClick={() => setCompletingRow(row)}
                />
              ))
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
                  className="min-h-[16rem] space-y-2 bg-white p-2 dark:bg-zinc-900"
                >
                  {dayRows(day).map((row: any) => (
                    <TaskPill
                      key={row.id}
                      compact
                      row={row}
                      onClick={() => setCompletingRow(row)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <MonthView
            cursor={cursor}
            rows={rows}
            onSelect={setCompletingRow}
          />
        )}
      </section>

      {/* Estado da frota (info geral) */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <Car className="h-4 w-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Estado da Frota
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <MiniStat label="Total" value={vehicles.length} />
          <MiniStat
            label="Disponíveis"
            value={disponiveis}
            tone="text-emerald-600"
          />
          <MiniStat
            label="Em Avaria"
            value={emAvaria}
            tone="text-rose-600"
          />
          <MiniStat
            label="Outros"
            value={vehicles.length - disponiveis - emAvaria}
          />
        </div>
      </section>

      {/* Modal: registar horas de uma atribuição */}
      <Dialog
        open={Boolean(completingRow)}
        onOpenChange={(open) => !open && setCompletingRow(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {completingRow?.titulo || "Registar Horas"}
            </DialogTitle>
            <DialogDescription>
              {completingRow &&
                new Date(completingRow.data).toLocaleDateString(
                  "pt-PT",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )}
            </DialogDescription>
          </DialogHeader>
          {completingRow && (
            <CompleteForm
              row={completingRow}
              onClose={() => setCompletingRow(null)}
              onSaved={loadData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p
        className={`text-2xl font-semibold ${tone || "text-zinc-900 dark:text-zinc-50"}`}
      >
        {value}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
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
  const status = effectiveStatus(row);
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-2.5 text-left transition-shadow hover:shadow-sm ${
        status === "nao_fez"
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
      } ${compact ? "p-2" : ""}`}
    >
      <p className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        {row.titulo || "(sem título)"}
      </p>
      {row.cliente_obra && (
        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {row.cliente_obra}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
        <span className="text-zinc-500 dark:text-zinc-400">
          {row.hora_inicio && row.hora_fim
            ? `${row.hora_inicio.slice(0, 5)}–${row.hora_fim.slice(0, 5)}`
            : "Sem horário"}
        </span>
        <Badge className={STATUS_STYLES[status] || ""}>
          {STATUS_LABELS[status]}
        </Badge>
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
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[6rem] p-2 ${
                  currentMonth
                    ? "bg-white dark:bg-zinc-900"
                    : "bg-zinc-50/60 dark:bg-zinc-900/40"
                }`}
              >
                <div
                  className={`mb-1 text-xs font-medium ${
                    isSameDay(day, new Date())
                      ? "grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
                      : currentMonth
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-300 dark:text-zinc-700"
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dRows.slice(0, 2).map((row: any) => {
                    const status = effectiveStatus(row);
                    return (
                      <button
                        key={row.id}
                        onClick={() => onSelect(row)}
                        className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium ${
                          status === "nao_fez"
                            ? "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-300"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {row.titulo}
                      </button>
                    );
                  })}
                  {dRows.length > 2 && (
                    <p className="px-1 text-[10px] text-zinc-400">
                      +{dRows.length - 2} registos
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

function CompleteForm({
  row,
  onClose,
  onSaved,
}: {
  row: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [horaInicio, setHoraInicio] = useState(
    row.hora_inicio?.slice(0, 5) || "",
  );
  const [horaFim, setHoraFim] = useState(
    row.hora_fim?.slice(0, 5) || "",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await productionTasksAPI.updateAssignee(row.id, {
        horaInicio,
        horaFim,
        status: "concluido",
      });
      await onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao registar horas:", error);
      alert("Erro ao registar horas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {row.tipo === "producao" ? "Produção" : "Manutenção"}
          {row.cliente_obra ? ` · ${row.cliente_obra}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
          Marcar Concluído
        </Button>
      </DialogFooter>
    </form>
  );
}
function SelfRegisterForm({
  currentUser,
  jobs,
  onClose,
  onSaved,
}: {
  currentUser: any;
  jobs: any[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<"producao" | "manutencao">(
    jobs.length > 0 ? "producao" : "manutencao",
  );
  const [jobId, setJobId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [clienteObra, setClienteObra] = useState("");
  const [local, setLocal] = useState("");
  const [data, setData] = useState(toDateInput(new Date()));
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tipo === "producao" && !jobId) {
      alert("Seleciona o projeto.");
      return;
    }
    if (tipo === "manutencao" && !titulo.trim()) {
      alert("Escreve o que fizeste.");
      return;
    }
    setLoading(true);
    try {
      await productionTasksAPI.create({
        tipo,
        jobId: tipo === "producao" ? jobId : null,
        titulo: tipo === "manutencao" ? titulo : undefined,
        clienteObra,
        local,
        data,
        createdBy: currentUser?.id,
        assigneeIds: [currentUser?.id],
      });
      await onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao criar registo:", error);
      alert("Erro ao criar registo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 grid gap-4" onSubmit={submit}>
      {jobs.length > 0 && (
        <div className="space-y-2">
          <Label>Tipo de Registo *</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo("producao")}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                tipo === "producao"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Produção
            </button>
            <button
              type="button"
              onClick={() => setTipo("manutencao")}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                tipo === "manutencao"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Manutenção
            </button>
          </div>
        </div>
      )}

      {tipo === "producao" ? (
        <div className="space-y-2">
          <Label htmlFor="jobId">Projeto *</Label>
          <select
            id="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 text-sm dark:border-zinc-700"
          >
            <option value="">Selecionar projeto...</option>
            {jobs.map((j: any) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="titulo">O Que Fizeste *</Label>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Manutenção da prensa 2"
            required
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clienteObra">Cliente / Obra</Label>
          <Input
            id="clienteObra"
            value={clienteObra}
            onChange={(e) => setClienteObra(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="local">Local</Label>
          <Input
            id="local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label htmlFor="horaInicio">Hora Início</Label>
          <Input
            id="horaInicio"
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horaFim">Hora Fim</Label>
          <Input
            id="horaFim"
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
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
          Registar
        </Button>
      </DialogFooter>
    </form>
  );
}