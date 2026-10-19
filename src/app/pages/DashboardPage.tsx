// src/app/pages/DashboardPage.tsx
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApp } from "../AppContext";
import {
  jobsAPI,
  productionTasksAPI,
  trackingAPI,
  calcJobHoursConsumed,
} from "../api";
import { OrderStatusView } from "../components/OrderStatusView";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Users,
  Car,
  Hammer,
  AlertTriangle,
  Boxes,
  Clock3,
  CheckCircle2,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardPlus,
  Loader2,
  Package,
  Search,
} from "lucide-react";

// ==================== CONSTANTES (fora do componente) ====================
const CARD =
  "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

const FLEET_STATUSES = [
  "disponivel",
  "em_uso",
  "manutencao",
  "avaria",
] as const;

const STATUS_STYLES: Record<string, string> = {
  disponivel:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400",
  em_uso:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  manutencao:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400",
  avaria:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400",
};

const STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em Uso",
  manutencao: "Em Manutenção",
  avaria: "Em Avaria",
};

const TONE_NEUTRAL =
  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
const TONE_BAD =
  "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400";
const TONE_GOOD =
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400";

const COLOR_NEUTRAL = "#3f3f46";
const COLOR_BAD = "#dc2626";
const COLOR_GOOD = "#16a34a";

// Formatadores criados uma única vez (criar Intl.* é caro)
const dueFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("pt-PT");

const formatDueDate = (value: string) =>
  dueFormatter.format(new Date(value));
const formatDate = (value: string) =>
  dateFormatter.format(new Date(value));

// Data local (toISOString usa UTC e pode dar o dia errado perto da meia-noite)
function todayInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ==================== GRÁFICO CIRCULAR ====================
const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CircularProgress = memo(function CircularProgress({
  percent,
  label,
  sublabel,
  color,
}: {
  percent: number;
  label: string;
  sublabel: string;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset =
    CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg
          viewBox="0 0 80 80"
          className="h-20 w-20 -rotate-90"
        >
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            className="stroke-zinc-100 dark:stroke-zinc-800"
          />
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.5s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </p>
        <p className="text-[11px] text-zinc-400">{sublabel}</p>
      </div>
    </div>
  );
});

// ==================== CARTÃO DE PROGRESSO DE UM PROJETO ====================
const JobProgressCard = memo(function JobProgressCard({
  job,
  assigneeRows,
  now,
}: {
  job: any;
  assigneeRows: any[];
  now: number;
}) {
  const created = new Date(job.created_at).getTime();
  const due = new Date(job.due_date).getTime();
  const span = due - created;
  const datePercent =
    span > 0
      ? ((now - created) / span) * 100
      : now > due
        ? 100
        : 0;

  const hoursConsumed = calcJobHoursConsumed(job, assigneeRows);
  const hoursPercent = job.max_hours
    ? (hoursConsumed / Number(job.max_hours)) * 100
    : null;

  const checklist: any[] = job.checklist ?? [];
  const checklistDone = checklist.filter(
    (c) => c.checked,
  ).length;
  const checklistPercent = checklist.length
    ? (checklistDone / checklist.length) * 100
    : 0;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="mb-3 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
        {job.title}
      </p>
      <div className="flex items-center justify-around">
        <CircularProgress
          percent={datePercent}
          label="Prazo"
          sublabel={formatDate(job.due_date)}
          color={datePercent >= 100 ? COLOR_BAD : COLOR_NEUTRAL}
        />
        {hoursPercent !== null ? (
          <CircularProgress
            percent={hoursPercent}
            label="Horas"
            sublabel={`${hoursConsumed.toFixed(1)}/${job.max_hours}h`}
            color={
              hoursPercent >= 100 ? COLOR_BAD : COLOR_NEUTRAL
            }
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full border-8 border-dashed border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-300">-</span>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Horas
              </p>
              <p className="text-[11px] text-zinc-400">
                sem limite
              </p>
            </div>
          </div>
        )}
        <CircularProgress
          percent={checklistPercent}
          label="Checklist"
          sublabel={`${checklistDone}/${checklist.length} fases`}
          color={
            checklistPercent >= 100 ? COLOR_GOOD : COLOR_NEUTRAL
          }
        />
      </div>
    </div>
  );
});

// ==================== LINHAS DAS LISTAS ====================
const UrgentJobRow = memo(function UrgentJobRow({
  job,
  now,
}: {
  job: any;
  now: number;
}) {
  const overdue = new Date(job.due_date).getTime() < now;
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          overdue
            ? TONE_BAD
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        <Clock3 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {job.title}
        </p>
        <p className="text-xs text-zinc-400">
          {job.assignees?.length
            ? job.assignees.map((a: any) => a.nome).join(", ") +
              " · "
            : ""}
          Prazo: {formatDueDate(job.due_date)}
        </p>
      </div>
      {overdue && (
        <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          Atrasado
        </Badge>
      )}
    </div>
  );
});

const MovementRow = memo(function MovementRow({
  m,
}: {
  m: any;
}) {
  const out = m.tipo === "levantamento";
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          out
            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
            : TONE_GOOD
        }`}
      >
        {out ? (
          <ArrowUpFromLine className="h-4 w-4" />
        ) : (
          <ArrowDownToLine className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {m.item_nome || "Artigo removido"}
        </p>
        <p className="text-xs text-zinc-400">
          {m.user_nome || "-"} · {m.quantidade} unid.
        </p>
      </div>
    </div>
  );
});

// ==================== PÁGINA ====================
export function DashboardPage() {
  const {
    currentUser,
    users,
    vehicles,
    equipment,
    stockItems,
    stockMovements,
  } = useApp();

  const [trackOpen, setTrackOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [assigneeRows, setAssigneeRows] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // silent = true → atualiza sem mostrar o "A carregar…"
  const loadJobs = useCallback(async (silent = false) => {
    if (!silent) setJobsLoading(true);
    try {
      const [jobsData, rowsData] = await Promise.all([
        jobsAPI.getAll(),
        productionTasksAPI.getAll(),
      ]);
      if (!mounted.current) return;
      setJobs(jobsData);
      setAssigneeRows(rowsData);
    } catch (err) {
      console.error("Erro ao carregar trabalhos:", err);
    } finally {
      if (mounted.current) setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Uma única passagem pelos trabalhos (antes eram 4 filtros/sorts por render)
  const {
    now,
    activeJobs,
    overdueCount,
    upcomingJobs,
    myJobs,
  } = useMemo(() => {
    const now = Date.now();
    const myId = currentUser?.id;
    const active: any[] = [];
    const mine: any[] = [];
    let overdue = 0;

    for (const j of jobs) {
      if (j.status !== "em_curso") continue;
      active.push(j);
      if (new Date(j.due_date).getTime() < now) overdue++;
      if (
        myId &&
        j.assignees?.some((a: any) => a.id === myId)
      ) {
        mine.push(j);
      }
    }

    const upcoming = [...active]
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() -
          new Date(b.due_date).getTime(),
      )
      .slice(0, 5);

    return {
      now,
      activeJobs: active,
      overdueCount: overdue,
      upcomingJobs: upcoming,
      myJobs: mine,
    };
  }, [jobs, currentUser?.id]);

  // Frota: uma só passagem em vez de 6 filtros
  const fleetCounts = useMemo(() => {
    const counts: Record<string, number> = {
      disponivel: 0,
      em_uso: 0,
      manutencao: 0,
      avaria: 0,
    };
    for (const v of vehicles) {
      if (v.status in counts) counts[v.status]++;
    }
    return counts;
  }, [vehicles]);

  const equipmentSemStock = useMemo(
    () =>
      stockItems.filter((i: any) => Number(i.quantidade) <= 0)
        .length,
    [stockItems],
  );

  const activeUsers = useMemo(
    () => users.filter((u: any) => u.ativo).length,
    [users],
  );

  const recentMovements = useMemo(
    () => stockMovements.slice(0, 6),
    [stockMovements],
  );

  const stats = useMemo(
    () => [
      {
        label: "Utilizadores Ativos",
        value: activeUsers,
        sub: `${users.length} total`,
        icon: Users,
        tone: TONE_NEUTRAL,
      },
      {
        label: "Viaturas",
        value: vehicles.length,
        sub: `${fleetCounts.disponivel} disponíveis`,
        icon: Car,
        tone: TONE_NEUTRAL,
      },
      {
        label: "Equipamentos",
        value: equipment.length,
        sub: `${equipmentSemStock} artigo(s) sem stock`,
        icon: Package,
        tone: TONE_NEUTRAL,
      },
      {
        label: "Trabalhos em Curso",
        value: activeJobs.length,
        sub:
          overdueCount > 0
            ? `${overdueCount} fora do prazo`
            : "tudo dentro do prazo",
        icon: Hammer,
        tone: overdueCount > 0 ? TONE_BAD : TONE_GOOD,
      },
    ],
    [
      activeUsers,
      users.length,
      vehicles.length,
      fleetCounts.disponivel,
      equipment.length,
      equipmentSemStock,
      activeJobs.length,
      overdueCount,
    ],
  );

  const closeRegister = useCallback(
    () => setRegisterOpen(false),
    [],
  );
  const closeTrack = useCallback(() => setTrackOpen(false), []);
  const handleRegistered = useCallback(() => {
    setRegisterOpen(false);
    loadJobs(true); // atualiza horas/progresso sem piscar
  }, [loadJobs]);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            VISÃO GERAL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Olá,{" "}
            {currentUser?.nome?.split(" ")[0] || "bem-vindo"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Aqui tens um resumo rápido da frota, equipamentos,
            stock e trabalhos em curso.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setTrackOpen(true)}
            className="h-10"
          >
            <Search className="mr-2 h-4 w-4" />
            Ver Estado da Encomenda
          </Button>
          <Button
            onClick={() => setRegisterOpen(true)}
            className="h-10 bg-red-600 text-white hover:bg-red-700"
          >
            <ClipboardPlus className="mr-2 h-4 w-4" />
            Registar Atividade
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${stat.tone}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
                <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                  {stat.sub}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {fleetCounts.avaria > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{fleetCounts.avaria}</strong> viatura(s) em
            avaria neste momento.
          </span>
        </div>
      )}

      {/* Progresso dos meus projetos */}
      {myJobs.length > 0 && (
        <section className={CARD}>
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              PROGRESSO
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Os Meus Projetos
            </h2>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {myJobs.map((job: any) => (
              <JobProgressCard
                key={job.id}
                job={job}
                assigneeRows={assigneeRows}
                now={now}
              />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={CARD}>
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                PRÓXIMOS PRAZOS
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Trabalhos Urgentes (equipa)
              </h2>
            </div>
            <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {activeJobs.length}
            </Badge>
          </div>

          {jobsLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-zinc-400">
              A carregar…
            </div>
          ) : upcomingJobs.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              <p className="text-sm text-zinc-400">
                Sem trabalhos em curso.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {upcomingJobs.map((job: any) => (
                <UrgentJobRow
                  key={job.id}
                  job={job}
                  now={now}
                />
              ))}
            </div>
          )}
        </div>

        <div className={CARD}>
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                ARMAZÉM
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Movimentos Recentes
              </h2>
            </div>
            <Boxes className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
          </div>
          {recentMovements.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <Boxes className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-400">
                Sem movimentos registados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentMovements.map((m: any) => (
                <MovementRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Estado da Frota
          </h2>
          <div className="flex items-center gap-1 text-xs font-medium text-zinc-400">
            <ArrowRight className="h-3 w-3" />
            <span>Camiões, viaturas e restante frota</span>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {FLEET_STATUSES.map((status) => (
            <div
              key={status}
              className={`rounded-lg border px-4 py-3 ${STATUS_STYLES[status]}`}
            >
              <p className="text-2xl font-semibold">
                {fleetCounts[status]}
              </p>
              <p className="text-xs font-medium">
                {STATUS_LABELS[status]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Dialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar Atividade</DialogTitle>
          </DialogHeader>
          <QuickRegisterForm
            currentUser={currentUser}
            onClose={closeRegister}
            onSaved={handleRegistered}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ver Estado da Encomenda</DialogTitle>
          </DialogHeader>
          <TrackLookupForm onClose={closeTrack} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== CONSULTA DE ENCOMENDA ====================
// Estava definido DENTRO do DashboardPage: a cada render era um componente
// "novo" e o React desmontava/remontava o formulário (perdia o foco ao escrever).
function TrackLookupForm({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setJob(null);
    try {
      const data = await trackingAPI.getByCode(code.trim());
      if (data) setJob(data);
      else setNotFound(true);
    } catch (error) {
      console.error("Erro ao consultar:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  if (job) {
    return (
      <div className="mt-3">
        <OrderStatusView job={job} />
      </div>
    );
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={search}>
      <div className="space-y-2">
        <Label htmlFor="track-code">Código de Rastreio</Label>
        <Input
          id="track-code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase())
          }
          placeholder="Ex: AB12CD34"
          className="font-mono uppercase tracking-widest"
          required
        />
      </div>
      {notFound && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Código não encontrado. Verifica se está correto.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="submit"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading}
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Consultar
        </Button>
      </div>
    </form>
  );
}

// ==================== REGISTO RÁPIDO ====================
function QuickRegisterForm({
  currentUser,
  onClose,
  onSaved,
}: {
  currentUser: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    clienteObra: "",
    local: "",
    horaInicio: "",
    horaFim: "",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await productionTasksAPI.create({
        tipo: "manutencao",
        titulo: form.titulo,
        clienteObra: form.clienteObra,
        local: form.local,
        data: todayInput(),
        createdBy: currentUser?.id,
        assigneeIds: [currentUser?.id],
      });
      onSaved();
    } catch (error) {
      console.error("Erro ao registar atividade:", error);
      alert("Erro ao registar atividade.");
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="qr-titulo">O que fizeste? *</Label>
        <Input
          id="qr-titulo"
          value={form.titulo}
          onChange={(e) => update("titulo", e.target.value)}
          placeholder="Ex: Manutenção da linha 2"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="qr-cliente">Cliente / Obra</Label>
          <Input
            id="qr-cliente"
            value={form.clienteObra}
            onChange={(e) =>
              update("clienteObra", e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qr-local">Local</Label>
          <Input
            id="qr-local"
            value={form.local}
            onChange={(e) => update("local", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="qr-inicio">Hora Início</Label>
          <Input
            id="qr-inicio"
            type="time"
            value={form.horaInicio}
            onChange={(e) =>
              update("horaInicio", e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qr-fim">Hora Fim</Label>
          <Input
            id="qr-fim"
            type="time"
            value={form.horaFim}
            onChange={(e) => update("horaFim", e.target.value)}
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