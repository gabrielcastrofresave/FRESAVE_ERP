// src/app/pages/ProductionCalendarPage.tsx

import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "../components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  ShieldAlert,
  Users,
  Trash2,
  Search,
  X,
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

function effectiveStatus(row: any) {
  if (row.status === "concluido") return "concluido";
  if (isPastDay(row.data)) return "nao_fez";
  return "pendente";
}

export function ProductionCalendarPage() {
  const { users, currentUser } = useApp();

  if (
    currentUser?.role !== "administrador" &&
    currentUser?.role !== "escritorio"
  ) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-zinc-300" />
        <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          Acesso Restrito
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta página só está disponível para administração.
        </p>
      </div>
    );
  }

  const [rows, setRows] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState("todos");
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rowsData, jobsData] = await Promise.all([
        productionTasksAPI.getAll(),
        jobsAPI.getAll(),
      ]);
      setRows(rowsData);
      setJobs(
        jobsData.filter((j: any) => j.status === "em_curso"),
      );
    } catch (error) {
      console.error(
        "Erro ao carregar calendário de produção:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r: any) =>
        selectedUserId === "todos" ||
        r.user_id === selectedUserId,
    );
  }, [rows, selectedUserId]);

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
    filteredRows.filter((r: any) =>
      isSameDay(new Date(r.data), day),
    );

  const handleDeleteTask = async (taskId: string) => {
    if (
      confirm(
        "Eliminar este registo (e todas as pessoas atribuídas a ele)?",
      )
    ) {
      await productionTasksAPI.deleteTask(taskId);
      await loadData();
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            TEMPOS E ATIVIDADE
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Calendário de Produção
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Atribui trabalhos obrigatórios à equipa. Cada pessoa
            regista as suas próprias horas no dia atribuído.
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
                Atribui um trabalho a um ou mais utilizadores
                para um dia específico.
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              users={users}
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setCreateOpen(false)}
              onSaved={loadData}
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <Users className="h-4 w-4" />
          <span>
            <strong>Vista de administração:</strong> atividade
            de toda a equipa
          </span>
        </div>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <option value="todos">Todos os utilizadores</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </div>

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
              dayRows(cursor).map((row: any) => (
                <TaskPill
                  key={row.id}
                  row={row}
                  onDelete={() => handleDeleteTask(row.task_id)}
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
                  className="min-h-[20rem] space-y-2 bg-white p-2 dark:bg-zinc-900"
                >
                  {dayRows(day).map((row: any) => (
                    <TaskPill
                      key={row.id}
                      compact
                      row={row}
                      onDelete={() =>
                        handleDeleteTask(row.task_id)
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <MonthView cursor={cursor} rows={filteredRows} />
        )}
      </section>
    </div>
  );
}

function TaskPill({
  row,
  onDelete,
  compact = false,
}: {
  row: any;
  onDelete: () => void;
  compact?: boolean;
}) {
  const status = effectiveStatus(row);
  return (
    <div
      className={`group rounded-lg border p-2.5 text-left transition-shadow hover:shadow-sm ${
        status === "nao_fez"
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
      } ${compact ? "p-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          {row.titulo || "(sem título)"}
        </p>
        <button
          onClick={onDelete}
          className="text-[10px] text-red-600 hover:underline dark:text-red-400"
        >
          apagar
        </button>
      </div>
      <p className="mt-1 truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
        {row.users?.nome}
      </p>
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
    </div>
  );
}

function MonthView({
  cursor,
  rows,
}: {
  cursor: Date;
  rows: any[];
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
                className={`min-h-[6.5rem] p-2 ${
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
                  {dRows.slice(0, 3).map((row: any) => {
                    const status = effectiveStatus(row);
                    return (
                      <div
                        key={row.id}
                        className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium ${
                          status === "nao_fez"
                            ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {row.users?.nome} · {row.titulo}
                      </div>
                    );
                  })}
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

function TaskForm({
  users,
  jobs,
  currentUser,
  onClose,
  onSaved,
}: {
  users: any[];
  jobs: any[];
  currentUser: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState("");
  const [data, setData] = useState(toDateInput(new Date()));
  const [descricao, setDescricao] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId) {
      alert("Seleciona o projeto (trabalho).");
      return;
    }

    setLoading(true);
    try {
      await productionTasksAPI.create({
        jobId,
        data,
        descricao: descricao.trim() || null,
        createdBy: currentUser?.id,
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
      <div className="space-y-2">
        <Label>Projeto (Trabalho) *</Label>
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
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          placeholder="Notas ou instruções para este dia..."
          className="w-full resize-y rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-600/30 dark:border-zinc-700"
        />
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
          Criar Registo
        </Button>
      </DialogFooter>
    </form>
  );
}

function normalize(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function JobPicker({
  jobs,
  value,
  onChange,
}: {
  jobs: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = jobs.find((j: any) => j.id === value);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q
      ? jobs.filter((j: any) => normalize(j.title).includes(q))
      : jobs;
    return list.slice(0, 50);
  }, [jobs, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function select(job: any) {
    onChange(job.id);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlight]) select(results[highlight]);
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
        <span className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {selected.title}
        </span>
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex shrink-0 items-center gap-1 text-xs text-red-600 hover:underline"
        >
          <X className="h-3 w-3" />
          Alterar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 dark:border-zinc-800">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Pesquisar entre ${jobs.length} projetos...`}
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-zinc-400">
            Nenhum projeto encontrado.
          </p>
        ) : (
          results.map((j: any, i: number) => (
            <button
              type="button"
              key={j.id}
              onClick={() => select(j)}
              onMouseEnter={() => setHighlight(i)}
              className={`block w-full truncate rounded px-3 py-2 text-left text-sm ${
                i === highlight
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {j.title}
            </button>
          ))
        )}
        {!query && jobs.length > 50 && (
          <p className="px-3 py-2 text-center text-[11px] text-zinc-400">
            A mostrar 50 de {jobs.length}. Escreve para filtrar.
          </p>
        )}
      </div>
    </div>
  );
}