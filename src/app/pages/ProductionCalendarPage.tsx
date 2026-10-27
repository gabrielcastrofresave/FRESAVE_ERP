// src/app/pages/ProductionCalendarPage.tsx

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useApp } from "../AppContext";
import { productionTasksAPI, jobsAPI } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { JobPicker } from "../components/JobPicker";
import { ScheduleJobPicker } from "../components/ScheduleJobPicker";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  ShieldAlert,
  Users,
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

// Altura de uma hora na grelha horária (px)
const HOUR_PX = 56;

// Cada utilizador tem uma cor fixa, para se distinguirem logo na grelha.
// (Classes escritas por extenso para o Tailwind não as remover.)
const CORES = [
  {
    bloco:
      "bg-sky-100 border-sky-500 text-sky-900 dark:bg-sky-950/70 dark:border-sky-500 dark:text-sky-100",
    ponto: "bg-sky-500",
  },
  {
    bloco:
      "bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-500 dark:text-emerald-100",
    ponto: "bg-emerald-500",
  },
  {
    bloco:
      "bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-950/70 dark:border-amber-500 dark:text-amber-100",
    ponto: "bg-amber-500",
  },
  {
    bloco:
      "bg-violet-100 border-violet-500 text-violet-900 dark:bg-violet-950/70 dark:border-violet-500 dark:text-violet-100",
    ponto: "bg-violet-500",
  },
  {
    bloco:
      "bg-fuchsia-100 border-fuchsia-500 text-fuchsia-900 dark:bg-fuchsia-950/70 dark:border-fuchsia-500 dark:text-fuchsia-100",
    ponto: "bg-fuchsia-500",
  },
  {
    bloco:
      "bg-teal-100 border-teal-500 text-teal-900 dark:bg-teal-950/70 dark:border-teal-500 dark:text-teal-100",
    ponto: "bg-teal-500",
  },
  {
    bloco:
      "bg-orange-100 border-orange-500 text-orange-900 dark:bg-orange-950/70 dark:border-orange-500 dark:text-orange-100",
    ponto: "bg-orange-500",
  },
  {
    bloco:
      "bg-indigo-100 border-indigo-500 text-indigo-900 dark:bg-indigo-950/70 dark:border-indigo-500 dark:text-indigo-100",
    ponto: "bg-indigo-500",
  },
];

function chaveUtilizador(row: any) {
  return String(row.user_id ?? nomeDoRegisto(row));
}

function corDoRegisto(row: any) {
  const k = chaveUtilizador(row);
  let h = 0;
  for (let i = 0; i < k.length; i++) {
    h = (h * 31 + k.charCodeAt(i)) >>> 0;
  }
  return CORES[h % CORES.length];
}

// "HH:MM" ou "HH:MM:SS" -> minutos desde as 00:00
function toMinutes(t: string) {
  const [h, m] = String(t).split(":");
  return Number(h) * 60 + Number(m || 0);
}

function temHorario(row: any) {
  return Boolean(row.hora_inicio && row.hora_fim);
}

function intervalo(row: any) {
  return `${row.hora_inicio.slice(0, 5)}–${row.hora_fim.slice(0, 5)}`;
}

// Horas líquidas de um registo (usa o valor guardado, ou calcula pelo horário)
function horasDoRegisto(row: any): number {
  if (row.horas_liquidas != null) return Number(row.horas_liquidas);
  if (temHorario(row)) {
    const bruto =
      toMinutes(row.hora_fim) - toMinutes(row.hora_inicio);
    return Math.max(0, bruto - (row.almoco_minutos ?? 0)) / 60;
  }
  return 0;
}

function totalHoras(rows: any[]) {
  return rows.reduce((acc, r) => acc + horasDoRegisto(r), 0);
}

function formatTotal(h: number) {
  if (h <= 0) return "";
  return `${h.toFixed(h % 1 === 0 ? 0 : 1)}h`;
}

// Data no formato YYYY-MM-DD, na hora local (toISOString devolvia o dia anterior em Lisboa)
function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

// Intervalo de datas que a vista atual mostra (só este período é pedido à base de dados)
function periodoVisivel(view: ViewMode, cursor: Date) {
  if (view === "dia") {
    const s = toDateInput(cursor);
    return { from: s, to: s };
  }
  if (view === "semana") {
    const inicio = startOfWeekMonday(cursor);
    return {
      from: toDateInput(inicio),
      to: toDateInput(addDays(inicio, 6)),
    };
  }
  // Mês: a grelha tem 42 dias a começar na segunda da primeira semana
  const primeiro = startOfWeekMonday(
    new Date(cursor.getFullYear(), cursor.getMonth(), 1),
  );
  return {
    from: toDateInput(primeiro),
    to: toDateInput(addDays(primeiro, 41)),
  };
}

// Chave do dia de um registo ("YYYY-MM-DD"), mesmo que a coluna venha com hora
function chaveDia(row: any) {
  return String(row.data).slice(0, 10);
}

function nomeDoRegisto(row: any) {
  return (
    row.users?.nome ||
    row.wintouch_nome ||
    row.wintouch_custo ||
    "—"
  );
}

function formatDataLonga(data?: string) {
  if (!data) return "—";
  return new Date(
    `${String(data).slice(0, 10)}T00:00:00`,
  ).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHoras(valor: any) {
  return valor != null ? `${Number(valor).toFixed(2)} h` : "—";
}

// Ordena: primeiro os que têm horário (por hora de início), depois os restantes
function ordenar(a: any, b: any) {
  const ha = temHorario(a) ? a.hora_inicio : "99:99";
  const hb = temHorario(b) ? b.hora_inicio : "99:99";
  if (ha !== hb) return ha < hb ? -1 : 1;
  return nomeDoRegisto(a).localeCompare(nomeDoRegisto(b));
}

export function ProductionCalendarPage() {
  const { users, currentUser } = useApp();

  const [rows, setRows] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);

  const isAdmin =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio";

  const pedidoAtual = useRef(0);

  // Só carrega se tiver acesso, e ignora respostas antigas
  const loadRows = useCallback(async () => {
    if (!isAdmin) return;
    const id = ++pedidoAtual.current;
    setLoading(true);
    try {
      const { from, to } = periodoVisivel(view, cursor);
      const data = await productionTasksAPI.getAll(from, to);
      if (id === pedidoAtual.current) setRows(data);
    } catch (error) {
      console.error(
        "Erro ao carregar calendário de produção:",
        error,
      );
    } finally {
      if (id === pedidoAtual.current) setLoading(false);
    }
  }, [view, cursor, isAdmin]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Trabalhos: só quando o diálogo de criação abre pela primeira vez
  useEffect(() => {
    if (
      !isAdmin ||
      !(createOpen || editingRow) ||
      jobs.length > 0
    )
      return;
    jobsAPI
      .getAll()
      .then((data: any[]) =>
        setJobs(
          data.filter((j: any) => j.status === "em_curso"),
        ),
      )
      .catch((error: unknown) =>
        console.error("Erro ao carregar trabalhos:", error),
      );
  }, [isAdmin, createOpen, editingRow, jobs.length]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r: any) =>
          selectedUserId === "todos" ||
          r.user_id === selectedUserId,
      ),
    [rows, selectedUserId],
  );

  // Agrupa por dia uma única vez (já ordenado por hora)
  const rowsPorDia = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const r of filteredRows) {
      const chave = chaveDia(r);
      const lista = mapa.get(chave);
      if (lista) lista.push(r);
      else mapa.set(chave, [r]);
    }
    for (const lista of mapa.values()) lista.sort(ordenar);
    return mapa;
  }, [filteredRows]);

  // Legenda de cores: quem aparece neste período
  const legenda = useMemo(() => {
    const mapa = new Map<
      string,
      { nome: string; userId?: string; cor: (typeof CORES)[number] }
    >();
    for (const r of rows) {
      const k = chaveUtilizador(r);
      if (!mapa.has(k)) {
        mapa.set(k, {
          nome: nomeDoRegisto(r),
          userId: r.user_id,
          cor: corDoRegisto(r),
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );
  }, [rows]);

  // Os hooks ficam todos acima deste ponto. O controlo de acesso só é feito
  // depois, para o número de hooks ser sempre o mesmo entre renderizações.
  if (!isAdmin) {
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

  function abrirDia(day: Date) {
    setCursor(day);
    setView("dia");
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

  // Elimina (soft delete) a atribuição desta linha. Nas horas do Wintouch,
  // o programa de sincronização pergunta depois na consola se apaga também lá.
  const handleDeleteTask = async (row: any) => {
    const msg = row.origem_wintouch
      ? "Eliminar esta hora importada do Wintouch?\n\nO programa de sincronização vai perguntar na consola se a apaga também no Wintouch."
      : "Eliminar este registo?";
    if (!confirm(msg)) return;
    try {
      await productionTasksAPI.deleteAssignee(row.id);
      setDetalhe(null);
      await loadRows();
    } catch (error: any) {
      alert(
        `Não foi possível apagar: ${error?.message ?? error}`,
      );
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
            Vê, cria e corrige os registos de toda a equipa. As
            alterações feitas aqui prevalecem sobre o que cada pessoa
            registou na Minha Atividade.
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
                Escolhe o tema e atribui o registo a um ou mais
                utilizadores para um dia específico.
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setCreateOpen(false)}
              onSaved={loadRows}
            />
          </DialogContent>
        </Dialog>
      </header>

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
                `${nomeDoRegisto(editingRow)} · ${formatDataLonga(editingRow.data)}`}
            </DialogDescription>
          </DialogHeader>
          {editingRow && (
            <TaskForm
              key={editingRow.id}
              row={editingRow}
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setEditingRow(null)}
              onSaved={loadRows}
            />
          )}
        </DialogContent>
      </Dialog>

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

        {/* Legenda de cores */}
        {legenda.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            {legenda.map((l) => {
              const ativo =
                l.userId && selectedUserId === l.userId;
              return (
                <button
                  key={l.nome}
                  type="button"
                  disabled={!l.userId}
                  onClick={() =>
                    l.userId &&
                    setSelectedUserId(
                      ativo ? "todos" : l.userId,
                    )
                  }
                  title={
                    l.userId
                      ? ativo
                        ? "Mostrar todos"
                        : `Mostrar só ${l.nome}`
                      : l.nome
                  }
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    ativo
                      ? "border-zinc-800 bg-zinc-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${l.cor.ponto}`}
                  />
                  {l.nome}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[28rem] items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
            carregar registos…
          </div>
        ) : view === "mes" ? (
          <MonthView
            cursor={cursor}
            rowsPorDia={rowsPorDia}
            onOpen={(row) => setDetalhe(row)}
            onPickDay={abrirDia}
          />
        ) : (
          <TimeGrid
            days={view === "dia" ? [cursor] : weekDays}
            rowsPorDia={rowsPorDia}
            onOpen={(row) => setDetalhe(row)}
            onPickDay={view === "semana" ? abrirDia : undefined}
            soLista={selectedUserId === "todos"}
          />
        )}
      </section>

      <Dialog
        open={!!detalhe}
        onOpenChange={(open) => !open && setDetalhe(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {detalhe.titulo || "(sem título)"}
                </DialogTitle>
                <DialogDescription>
                  {detalhe.origem_wintouch
                    ? "Horas importadas do Wintouch"
                    : "Registo criado no calendário"}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DetalheItem
                  label="Utilizador"
                  value={nomeDoRegisto(detalhe)}
                />
                <DetalheItem
                  label="Data"
                  value={formatDataLonga(detalhe.data)}
                />
                <DetalheItem
                  label="Tipo"
                  value={detalhe.tipo || "—"}
                />
                <DetalheItem
                  label="Horário"
                  value={
                    temHorario(detalhe)
                      ? intervalo(detalhe)
                      : "Sem horário"
                  }
                />
                <DetalheItem
                  label="Almoço"
                  value={
                    detalhe.almoco_minutos != null
                      ? `${detalhe.almoco_minutos} min`
                      : "—"
                  }
                />
                <DetalheItem
                  label="Horas líquidas"
                  value={formatHoras(detalhe.horas_liquidas)}
                />
                <DetalheItem
                  label="Trabalho"
                  value={detalhe.trabalho || "—"}
                />
                <DetalheItem
                  label="Código do trabalho"
                  value={detalhe.codigo_trabalho || "—"}
                />
                <DetalheItem
                  label="Local"
                  value={detalhe.local || "—"}
                />
                {detalhe.descricao && (
                  <div className="col-span-2 min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      O que foi feito
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line break-words text-zinc-800 dark:text-zinc-100">
                      {detalhe.descricao}
                    </dd>
                  </div>
                )}
                {detalhe.origem_wintouch && (
                  <>
                    <DetalheItem
                      label="Código de custo"
                      value={detalhe.wintouch_custo || "—"}
                    />
                    <DetalheItem
                      label="Referência Wintouch"
                      value={detalhe.origem_wintouch}
                    />
                  </>
                )}
              </dl>

              <DialogFooter className="mt-4">
                {!detalhe.origem_wintouch && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingRow(detalhe);
                      setDetalhe(null);
                    }}
                  >
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => handleDeleteTask(detalhe)}
                >
                  Apagar registo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDetalhe(null)}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetalheItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-zinc-800 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grelha horária (vistas Dia e Semana)
// ---------------------------------------------------------------------------

type Posicionado = { row: any; s: number; e: number; col: number; cols: number };

// Distribui registos sobrepostos lado a lado, em colunas
function posicionar(rows: any[]): Posicionado[] {
  const itens: Posicionado[] = rows
    .filter(temHorario)
    .map((row) => {
      const s = toMinutes(row.hora_inicio);
      const e = Math.max(toMinutes(row.hora_fim), s + 15);
      return { row, s, e, col: 0, cols: 1 };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);

  let grupo: Posicionado[] = [];
  let fimColunas: number[] = [];
  let fimGrupo = -1;

  const fechar = () => {
    for (const it of grupo) it.cols = fimColunas.length || 1;
    grupo = [];
    fimColunas = [];
    fimGrupo = -1;
  };

  for (const it of itens) {
    if (grupo.length && it.s >= fimGrupo) fechar();
    let idx = fimColunas.findIndex((fim) => fim <= it.s);
    if (idx === -1) {
      idx = fimColunas.length;
      fimColunas.push(it.e);
    } else {
      fimColunas[idx] = it.e;
    }
    it.col = idx;
    fimGrupo = Math.max(fimGrupo, it.e);
    grupo.push(it);
  }
  fechar();
  return itens;
}

// Separa o que faz sentido pôr na grelha do que deve ir para a lista.
// Se a MESMA pessoa tem registos com horários sobrepostos, não são slots reais
// (são horas trabalhadas por tarefa), por isso vão para a lista em vez de
// ficarem espremidos lado a lado. Registos sem horário também vão para a lista.
function separar(rows: any[]) {
  const grelha: any[] = [];
  const lista: any[] = rows.filter((r) => !temHorario(r));

  const porUtilizador = new Map<string, any[]>();
  for (const r of rows.filter(temHorario)) {
    const k = chaveUtilizador(r);
    const l = porUtilizador.get(k);
    if (l) l.push(r);
    else porUtilizador.set(k, [r]);
  }

  for (const grupo of porUtilizador.values()) {
    grupo.sort(
      (a, b) =>
        toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio),
    );
    let cluster: any[] = [];
    let fim = -1;
    const fechar = () => {
      (cluster.length > 1 ? lista : grelha).push(...cluster);
      cluster = [];
      fim = -1;
    };
    for (const r of grupo) {
      const s = toMinutes(r.hora_inicio);
      if (cluster.length && s >= fim) fechar();
      cluster.push(r);
      fim = Math.max(fim, toMinutes(r.hora_fim));
    }
    fechar();
  }

  lista.sort(ordenar);
  return { grelha, lista };
}

function TimeGrid({
  days,
  rowsPorDia,
  onOpen,
  onPickDay,
  soLista = false,
}: {
  days: Date[];
  rowsPorDia: Map<string, any[]>;
  onOpen: (row: any) => void;
  onPickDay?: (day: Date) => void;
  soLista?: boolean;
}) {
  const hoje = new Date();
  const unico = days.length === 1;

  const porDia = days.map((day) => {
    const lista = rowsPorDia.get(toDateInput(day)) ?? [];
    // Sem utilizador escolhido: tudo em lista, ordenado por nome
    if (soLista) {
      return {
        day,
        lista,
        posicionados: [] as Posicionado[],
        semHorario: [...lista].sort(
          (a, b) =>
            nomeDoRegisto(a).localeCompare(nomeDoRegisto(b)) ||
            ordenar(a, b),
        ),
      };
    }
    const { grelha, lista: paraLista } = separar(lista);
    return {
      day,
      lista,
      posicionados: posicionar(grelha),
      semHorario: paraLista,
    };
  });

  // Intervalo de horas visível: pelo menos 07–19, alarga se houver registos fora disto
  let minMin = 7 * 60;
  let maxMin = 19 * 60;
  for (const d of porDia) {
    for (const p of d.posicionados) {
      minMin = Math.min(minMin, p.s);
      maxMin = Math.max(maxMin, p.e);
    }
  }
  const startH = Math.max(0, Math.floor(minMin / 60));
  const endH = Math.min(24, Math.ceil(maxMin / 60));
  const horas = Array.from(
    { length: endH - startH },
    (_, i) => startH + i,
  );
  const alturaTotal = horas.length * HOUR_PX;

  const haSemHorario = porDia.some((d) => d.semHorario.length > 0);
  const nowMin = hoje.getHours() * 60 + hoje.getMinutes();
  const nowTop = ((nowMin - startH * 60) / 60) * HOUR_PX;
  const nowVisivel = nowMin >= startH * 60 && nowMin <= endH * 60;

  const colunas = {
    gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: unico ? 0 : 960 }}>
        {/* Cabeçalho dos dias */}
        <div className="flex border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
          {!soLista && <div className="w-12 shrink-0" />}
          <div className="grid flex-1" style={colunas}>
            {porDia.map(({ day, lista }) => {
              const hojeCol = isSameDay(day, hoje);
              const total = formatTotal(totalHoras(lista));
              return (
                <button
                  key={toDateInput(day)}
                  type="button"
                  disabled={!onPickDay}
                  onClick={() => onPickDay?.(day)}
                  className={`min-w-0 border-l border-zinc-100 px-2 py-2.5 text-center first:border-l-0 dark:border-zinc-800 ${
                    hojeCol ? "bg-red-50 dark:bg-red-950/20" : ""
                  } ${onPickDay ? "hover:bg-zinc-100 dark:hover:bg-zinc-800" : "cursor-default"}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {DAY_NAMES[(day.getDay() + 6) % 7]}
                  </p>
                  <p
                    className={`text-lg font-semibold leading-tight ${
                      hojeCol
                        ? "text-red-600"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                  <p className="mt-0.5 h-3.5 text-[10px] text-zinc-400">
                    {lista.length > 0
                      ? `${lista.length} reg.${total ? ` · ${total}` : ""}`
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Registos sem horário (ex.: horas importadas do Wintouch) */}
        {(haSemHorario || soLista) && (
          <div
            className={`flex bg-zinc-50/60 dark:bg-zinc-900 ${
              soLista
                ? ""
                : "border-b border-zinc-100 dark:border-zinc-800"
            }`}
          >
            {!soLista && (
              <div className="flex w-12 shrink-0 items-start justify-end pr-2 pt-2 text-[9px] font-semibold uppercase leading-tight tracking-wide text-zinc-400">
                Lista
              </div>
            )}
            <div className="grid flex-1" style={colunas}>
              {porDia.map(({ day, semHorario }) => (
                <div
                  key={toDateInput(day)}
                  className={`min-w-0 space-y-1 border-l border-zinc-100 p-1.5 first:border-l-0 dark:border-zinc-800 ${
                    soLista ? "min-h-[20rem]" : ""
                  } ${
                    soLista && isSameDay(day, hoje)
                      ? "bg-red-50/40 dark:bg-red-950/10"
                      : ""
                  }`}
                >
                  {soLista && semHorario.length === 0 && (
                    <p className="py-6 text-center text-[11px] text-zinc-400">
                      Sem registos
                    </p>
                  )}
                  {semHorario.map((row) => (
                    <SemHorarioChip
                      key={row.id}
                      row={row}
                      onOpen={() => onOpen(row)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corpo com as horas (só quando há um utilizador escolhido) */}
        {!soLista && (
        <div className="flex" style={{ height: alturaTotal }}>
          <div className="relative w-12 shrink-0">
            {horas.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-zinc-400"
                style={{ top: i * HOUR_PX, display: i === 0 ? "none" : undefined }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          <div className="grid flex-1" style={colunas}>
            {porDia.map(({ day, posicionados }) => {
              const hojeCol = isSameDay(day, hoje);
              return (
                <div
                  key={toDateInput(day)}
                  className={`relative border-l border-zinc-100 first:border-l-0 dark:border-zinc-800 ${
                    hojeCol ? "bg-red-50/30 dark:bg-red-950/10" : ""
                  }`}
                  style={{
                    height: alturaTotal,
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, rgba(161,161,170,0.28) ${HOUR_PX - 1}px, rgba(161,161,170,0.28) ${HOUR_PX}px)`,
                  }}
                >
                  {posicionados.map((p) => (
                    <BlocoHorario
                      key={p.row.id}
                      item={p}
                      startMin={startH * 60}
                      largo={unico}
                      onOpen={() => onOpen(p.row)}
                    />
                  ))}
                  {hojeCol && nowVisivel && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: nowTop }}
                    >
                      <span className="-ml-1 h-2 w-2 rounded-full bg-red-600" />
                      <span className="h-px flex-1 bg-red-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function BlocoHorario({
  item,
  startMin,
  largo,
  onOpen,
}: {
  item: Posicionado;
  startMin: number;
  largo: boolean;
  onOpen: () => void;
}) {
  const { row, s, e, col, cols } = item;
  const top = ((s - startMin) / 60) * HOUR_PX;
  const altura = Math.max(((e - s) / 60) * HOUR_PX, 22);
  const cor = corDoRegisto(row);
  const baixo = altura < 40;
  const estreito = cols > 2 && !largo;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${nomeDoRegisto(row)} · ${row.titulo ?? ""} · ${intervalo(row)}`}
      className={`absolute z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left shadow-sm transition hover:z-30 hover:shadow-md hover:brightness-95 ${cor.bloco}`}
      style={{
        top,
        height: altura - 2,
        left: `calc(${(col / cols) * 100}% + 2px)`,
        width: `calc(${100 / cols}% - 4px)`,
      }}
    >
      {baixo ? (
        <p className="truncate text-[11px] font-semibold leading-tight">
          {nomeDoRegisto(row)}
          {!estreito && (
            <span className="ml-1 font-normal opacity-75">
              {intervalo(row)}
            </span>
          )}
        </p>
      ) : (
        <>
          <p className="truncate text-[11px] font-semibold leading-tight">
            {nomeDoRegisto(row)}
          </p>
          <p className="truncate text-[10px] leading-tight opacity-80">
            {intervalo(row)}
          </p>
          {row.titulo && (
            <p className="mt-0.5 line-clamp-2 break-words text-[10px] leading-tight opacity-90">
              {row.titulo}
            </p>
          )}
          {altura > 100 && row.descricao && (
            <p className="mt-1 line-clamp-3 break-words text-[10px] leading-tight opacity-70">
              {row.descricao}
            </p>
          )}
        </>
      )}
    </button>
  );
}

function SemHorarioChip({
  row,
  onOpen,
}: {
  row: any;
  onOpen: () => void;
}) {
  const cor = corDoRegisto(row);
  const horas = formatTotal(horasDoRegisto(row));
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${nomeDoRegisto(row)} · ${row.titulo ?? ""}`}
      className={`block w-full rounded border-l-4 px-1.5 py-1 text-left text-[10px] hover:brightness-95 ${cor.bloco}`}
    >
      <span className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate font-semibold">
          {nomeDoRegisto(row)}
        </span>
        {horas && (
          <span className="shrink-0 font-semibold">{horas}</span>
        )}
        {row.origem_wintouch && (
          <span className="shrink-0 rounded bg-white/60 px-1 text-[9px] uppercase tracking-wide dark:bg-black/30">
            W
          </span>
        )}
      </span>
      {row.titulo && (
        <span className="block truncate opacity-90">
          {row.titulo}
        </span>
      )}
      {temHorario(row) && (
        <span className="block opacity-70">{intervalo(row)}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Vista Mês
// ---------------------------------------------------------------------------

const MAX_POR_DIA_MES = 4;

function MonthView({
  cursor,
  rowsPorDia,
  onOpen,
  onPickDay,
}: {
  cursor: Date;
  rowsPorDia: Map<string, any[]>;
  onOpen: (row: any) => void;
  onPickDay: (day: Date) => void;
}) {
  const first = startOfWeekMonday(
    new Date(cursor.getFullYear(), cursor.getMonth(), 1),
  );
  const days = Array.from({ length: 42 }, (_, i) =>
    addDays(first, i),
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
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
            const dRows =
              rowsPorDia.get(toDateInput(day)) ?? [];
            const currentMonth =
              day.getMonth() === cursor.getMonth();
            const hoje = isSameDay(day, new Date());
            const total = formatTotal(totalHoras(dRows));
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[8.5rem] p-1.5 ${
                  currentMonth
                    ? "bg-white dark:bg-zinc-900"
                    : "bg-zinc-50/60 dark:bg-zinc-900/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    className={`text-xs font-medium hover:underline ${
                      hoje
                        ? "grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white no-underline"
                        : currentMonth
                          ? "text-zinc-700 dark:text-zinc-300"
                          : "text-zinc-300 dark:text-zinc-700"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                  {total && (
                    <span className="text-[10px] text-zinc-400">
                      {total}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dRows.slice(0, MAX_POR_DIA_MES).map((row: any) => {
                    const cor = corDoRegisto(row);
                    return (
                      <button
                        key={row.id}
                        onClick={() => onOpen(row)}
                        title={`${nomeDoRegisto(row)} · ${row.titulo ?? ""}`}
                        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${cor.ponto}`}
                        />
                        {temHorario(row) && (
                          <span className="shrink-0 tabular-nums text-zinc-400">
                            {row.hora_inicio.slice(0, 5)}
                          </span>
                        )}
                        <span className="min-w-0 truncate font-medium">
                          {nomeDoRegisto(row)}
                        </span>
                      </button>
                    );
                  })}
                  {dRows.length > MAX_POR_DIA_MES && (
                    <button
                      type="button"
                      onClick={() => onPickDay(day)}
                      className="px-1 text-[10px] font-medium text-red-600 hover:underline"
                    >
                      +{dRows.length - MAX_POR_DIA_MES} mais
                    </button>
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

const ALMOCO_OPCOES = [
  { value: "", label: "—" },
  { value: "0", label: "Não almoçou" },
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1 hora e meia" },
];

// Cria registos (para vários utilizadores) ou edita um registo existente (se vier "row")
function TaskForm({
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
  const { users } = useApp();
  const isEdit = Boolean(row);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(row?.job_id ?? "");
  const [titulo, setTitulo] = useState(
    row?.titulo && row.titulo !== "(sem título)" ? row.titulo : "",
  );
  const [descricao, setDescricao] = useState(row?.descricao ?? "");
  const [data, setData] = useState(
    row?.data ? String(row.data).slice(0, 10) : toDateInput(new Date()),
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [horaInicio, setHoraInicio] = useState(
    row?.hora_inicio?.slice(0, 5) ?? "",
  );
  const [horaFim, setHoraFim] = useState(row?.hora_fim?.slice(0, 5) ?? "");
  const [almoco, setAlmoco] = useState(
    row?.almoco_minutos != null ? String(row.almoco_minutos) : "",
  );

  function toggleUser(id: string) {
    setAssigneeIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!titulo.trim()) {
      alert("Escolhe o tema do registo.");
      return;
    }
    if (!descricao.trim()) {
      alert("Descreve o que foi feito.");
      return;
    }
    if (!isEdit && assigneeIds.length === 0) {
      alert("Seleciona pelo menos um utilizador.");
      return;
    }
    if ((horaInicio && !horaFim) || (!horaInicio && horaFim)) {
      alert("Preenche a hora de início e a de fim (ou nenhuma).");
      return;
    }
    if (horaInicio && horaFim && horaFim <= horaInicio) {
      alert("A hora de fim tem de ser depois da de início.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await productionTasksAPI.updateTask(row.task_id, {
          titulo: titulo.trim(),
          descricao,
          jobId: jobId || null,
          data,
        });
        await productionTasksAPI.updateAssignee(row.id, {
          horaInicio: (horaInicio || null) as any,
          horaFim: (horaFim || null) as any,
          almocoMinutos: (almoco === "" ? null : Number(almoco)) as any,
        });
      } else {
        await productionTasksAPI.create({
          jobId: jobId || null,
          titulo: titulo.trim(),
          descricao,
          data,
          createdBy: currentUser?.id,
          assigneeIds,
          horaInicio: horaInicio || undefined,
          horaFim: horaFim || undefined,
          almocoMinutos: almoco !== "" ? Number(almoco) : undefined,
        });
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar registo:", error);
      alert(`Erro ao guardar registo: ${error?.message ?? error}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 grid gap-4 md:grid-cols-3" onSubmit={submit}>
      <div className="space-y-2 md:col-span-3">
        <Label>Tema / Trabalho *</Label>
        <ScheduleJobPicker
          value={jobId}
          titulo={titulo}
          onPick={({ jobId, titulo }) => {
            setJobId(jobId);
            setTitulo(titulo);
          }}
          onClear={() => {
            setJobId("");
            setTitulo("");
          }}
          fallback={
            <JobPicker
              jobs={jobs}
              value={jobId}
              onChange={(id: string) => {
                setJobId(id);
                setTitulo(jobs.find((j: any) => j.id === id)?.title ?? "");
              }}
            />
          }
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          value={titulo}
          readOnly
          tabIndex={-1}
          placeholder="Preenchido ao escolher o tema"
          className="cursor-default bg-zinc-50 dark:bg-zinc-800"
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

      <div className="space-y-2 md:col-span-3">
        <Label htmlFor="descricao">O que foi feito *</Label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          required
          placeholder="Descreve o trabalho feito neste registo"
          className="w-full resize-y rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 dark:border-zinc-700"
        />
      </div>

      {!isEdit && (
        <div className="space-y-2 md:col-span-3">
          <Label>Utilizadores * ({assigneeIds.length} selecionados)</Label>
          <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700 sm:grid-cols-3">
            {users.map((u: any) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                />
                <span className="truncate">{u.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="hi">Início</Label>
        <Input
          id="hi"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hf">Fim</Label>
        <Input
          id="hf"
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="alm">Almoço</Label>
        <select
          id="alm"
          value={almoco}
          onChange={(e) => setAlmoco(e.target.value)}
          className="h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 dark:border-zinc-700"
        >
          {ALMOCO_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <DialogFooter className="mt-2 md:col-span-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Guardar Alterações" : "Criar Registo"}
        </Button>
      </DialogFooter>
    </form>
  );
}