// src/app/pages/SchedulesPage.tsx
//
// Planeamentos = TEMAS de trabalho. Cada tema está ligado a UM trabalho, mas um
// trabalho pode ter VÁRIOS temas. Na Minha Atividade o utilizador escolhe o tema
// e o trabalho fica ligado automaticamente.
//
// Depende de (ver schedules-setup.md):
//   schedulesAPI -> getPage, create, update, delete
//   jobsAPI      -> getPage, getAllReferenceTypes, getAllReferenceYears

import { useState, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import {
  jobsAPI,
  schedulesAPI,
  JOB_CLIENT_COLUMN,
  type ScheduleStatusFilter,
} from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;

const SELECT_CLASS =
  "h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

type ScheduleFilters = {
  status: ScheduleStatusFilter; // "em_curso" | "concluido" | "todos" (estado do trabalho)
  search: string;
  referenceType: string;
  referenceYear: string;
  referenceNumber: string;
};

const DEFAULT_FILTERS: ScheduleFilters = {
  status: "em_curso",
  search: "",
  referenceType: "",
  referenceYear: "",
  referenceNumber: "",
};

const STATUS_OPTIONS: { value: ScheduleStatusFilter; label: string }[] = [
  { value: "em_curso", label: "Trabalhos em curso" },
  { value: "concluido", label: "Trabalhos concluídos" },
  { value: "todos", label: "Todos" },
];

export function SchedulesPage() {
  const { currentUser } = useApp();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [refTypes, setRefTypes] = useState<string[]>([]);
  const [refYears, setRefYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const requestId = useRef(0);

  const canManage =
    currentUser?.role === "administrador" ||
    currentUser?.role === "projeto";

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters =
    filters.search !== "" ||
    filters.referenceType !== "" ||
    filters.referenceYear !== "" ||
    filters.referenceNumber !== "";

  useEffect(() => {
    Promise.all([
      jobsAPI.getAllReferenceTypes(),
      jobsAPI.getAllReferenceYears(),
    ])
      .then(([types, years]) => {
        setRefTypes(types);
        setRefYears(years);
      })
      .catch((error: unknown) =>
        console.error("Erro ao carregar opções de filtro:", error),
      );
  }, []);

  const loadPage = async (silent = false) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const pageData = await schedulesAPI.getPage(page, PAGE_SIZE, {
        status: filters.status,
        search: filters.search || undefined,
        referenceType: filters.referenceType || undefined,
        referenceYear: filters.referenceYear || undefined,
        referenceNumber: filters.referenceNumber.trim() || undefined,
      });

      if (id !== requestId.current) return;

      const lastPage = Math.max(1, Math.ceil(pageData.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setSchedules(pageData.schedules);
      setTotal(pageData.total);
    } catch (error) {
      console.error("Erro ao carregar planeamentos:", error);
    } finally {
      if (id === requestId.current && !silent) setLoading(false);
    }
  };

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

  const changeFilter = (patch: Partial<ScheduleFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters((current) => ({ ...DEFAULT_FILTERS, status: current.status }));
    setPage(1);
  };

  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600 dark:text-red-400">
            PLANEAMENTO
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planeamentos de Trabalho
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cada trabalho pode ter vários temas. Na Minha Atividade escolhe-se o
            tema e o trabalho fica ligado automaticamente.
          </p>
        </div>
        {canManage && (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="h-10 bg-red-600 text-white hover:bg-red-700"
                onClick={() => setEditing(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Planeamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar Tema" : "Criar Planeamento"}
                </DialogTitle>
              </DialogHeader>
              <ScheduleForm
                key={editing?.id ?? "new"}
                schedule={editing}
                onClose={() => {
                  setCreateOpen(false);
                  setEditing(null);
                }}
                onSaved={() => loadPage()}
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

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Pesquisar por referência (PROD_2026_123), cliente ou nome"
                className="pl-9"
              />
            </div>

            <select
              value={filters.referenceType}
              onChange={(e) => changeFilter({ referenceType: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">Tipo de Ref.</option>
              {refTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filters.referenceYear}
              onChange={(e) => changeFilter({ referenceYear: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">Ano</option>
              {refYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <Input
              value={filters.referenceNumber}
              onChange={(e) =>
                changeFilter({ referenceNumber: e.target.value })
              }
              placeholder="N.º interno"
              className="h-9 sm:w-32"
            />

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
          <div className="flex min-h-48 items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar
            planeamentos…
          </div>
        ) : schedules.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {schedules.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                canEdit={canManage}
                onEdit={() => {
                  setEditing(schedule);
                  setCreateOpen(true);
                }}
                onDelete={() => setToDelete(schedule)}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
            <ClipboardList className="h-7 w-7 text-zinc-300" />
            <p className="mt-3 text-sm text-zinc-400">
              {hasActiveFilters
                ? "Nenhum planeamento corresponde aos filtros. Experimenta limpar a pesquisa."
                : "Ainda não há planeamentos."}
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
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Tema</DialogTitle>
          </DialogHeader>
          {toDelete && (
            <DeleteScheduleForm
              schedule={toDelete}
              onClose={() => setToDelete(null)}
              onDeleted={() => loadPage()}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleRow({
  schedule,
  canEdit,
  onEdit,
  onDelete,
}: {
  schedule: any;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const job = schedule.job;
  const clientName = JOB_CLIENT_COLUMN ? job?.[JOB_CLIENT_COLUMN] : null;
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {schedule.titulo}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {job?.title || "Trabalho removido"}
          {clientName ? ` · ${clientName}` : ""}
        </p>
      </div>

      <span className="hidden shrink-0 font-mono text-[11px] text-zinc-400 sm:block">
        {job?.reference}
      </span>

      {job?.status === "concluido" && (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          Concluído
        </Badge>
      )}

      {canEdit && (
        <div className="flex items-center">
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
        </div>
      )}
    </div>
  );
}

// Seletor de trabalho com os mesmos filtros da página de Trabalhos:
// pesquisa por título/rastreio, tipo de referência, ano e n.º interno
function JobPicker({
  value,
  onChange,
}: {
  value: any | null;
  onChange: (job: any | null) => void;
}) {
  const [refTypes, setRefTypes] = useState<string[]>([]);
  const [refYears, setRefYears] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [referenceYear, setReferenceYear] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    Promise.all([
      jobsAPI.getAllReferenceTypes(),
      jobsAPI.getAllReferenceYears(),
    ])
      .then(([types, years]) => {
        setRefTypes(types);
        setRefYears(years);
      })
      .catch((error: unknown) =>
        console.error("Erro ao carregar filtros:", error),
      );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const id = ++pedido.current;
    setSearching(true);
    jobsAPI
      .getPage(1, 20, {
        status: "em_curso",
        search: search || undefined,
        referenceType: referenceType || undefined,
        referenceYear: referenceYear || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
      })
      .then((data: any) => {
        if (id === pedido.current) setResults(data.jobs ?? []);
      })
      .catch((error: unknown) =>
        console.error("Erro ao pesquisar trabalhos:", error),
      )
      .finally(() => {
        if (id === pedido.current) setSearching(false);
      });
  }, [search, referenceType, referenceYear, referenceNumber]);

  const temFiltros =
    searchInput !== "" ||
    referenceType !== "" ||
    referenceYear !== "" ||
    referenceNumber !== "";

  function limparFiltros() {
    setSearchInput("");
    setSearch("");
    setReferenceType("");
    setReferenceYear("");
    setReferenceNumber("");
  }

  return (
    <div className="min-w-0 space-y-2">
      {value && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {value.title}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {value.reference}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onChange(null)}
            aria-label="Remover trabalho"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Pesquisar por título ou rastreio"
          className="h-9 pl-9"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={referenceType}
          onChange={(e) => setReferenceType(e.target.value)}
          className={`${SELECT_CLASS} min-w-0`}
        >
          <option value="">Tipo de Ref.</option>
          {refTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={referenceYear}
          onChange={(e) => setReferenceYear(e.target.value)}
          className={`${SELECT_CLASS} min-w-0`}
        >
          <option value="">Ano</option>
          {refYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <Input
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="N.º interno"
          className="h-9 min-w-0"
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
        {searching && results.length === 0 ? (
          <p className="flex items-center px-3 py-3 text-xs text-zinc-400">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />A pesquisar…
          </p>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-between px-3 py-3">
            <p className="text-xs text-zinc-400">
              Nenhum trabalho em curso corresponde à pesquisa.
            </p>
            {temFiltros && (
              <button
                type="button"
                onClick={limparFiltros}
                className="text-xs font-medium text-red-600"
              >
                Limpar
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => onChange(job)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                    job.id === value?.id ? "bg-red-50/60 dark:bg-red-950/20" : ""
                  }`}
                >
                  <span className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-100">
                    {job.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                    {job.reference}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScheduleForm({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: any | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = Boolean(schedule);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any | null>(schedule?.job ?? null);
  // Ao criar: vários temas de uma vez. Ao editar: só o tema selecionado.
  const [temas, setTemas] = useState<string[]>(
    isEdit ? [schedule.titulo ?? ""] : [""],
  );

  const updateTema = (index: number, value: string) =>
    setTemas((current) => current.map((t, i) => (i === index ? value : t)));
  const removeTema = (index: number) =>
    setTemas((current) => current.filter((_, i) => i !== index));

  // Temas válidos, sem vazios nem repetidos
  const cleaned = temas.map((t) => t.trim()).filter(Boolean);
  const finalTemas = cleaned.filter(
    (t, i) =>
      cleaned.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i,
  );

  const missing = [
    !job && "o trabalho",
    finalTemas.length === 0 && "pelo menos um tema",
  ].filter(Boolean) as string[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (missing.length > 0) {
      alert(`Falta escolher: ${missing.join(" e ")}.`);
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await schedulesAPI.update(schedule.id, {
          jobId: job.id,
          titulo: finalTemas[0],
        });
      } else {
        await schedulesAPI.create({ jobId: job.id, temas: finalTemas });
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar planeamento:", error);
      alert(error?.message || "Erro ao guardar planeamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 grid min-w-0 gap-4 [&>*]:min-w-0" onSubmit={submit}>
      <div className="space-y-2">
        <Label>Trabalho *</Label>
        <JobPicker value={job} onChange={setJob} />
      </div>

      <div className="space-y-2">
        <Label>{isEdit ? "Tema *" : "Temas deste trabalho *"}</Label>
        <div className="space-y-2">
          {temas.map((tema, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={tema}
                onChange={(e) => updateTema(index, e.target.value)}
                placeholder="Ex: Montagem do cilindro"
                className="min-w-0"
              />
              {temas.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-zinc-400 hover:text-red-600"
                  onClick={() => removeTema(index)}
                  aria-label="Remover tema"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {!isEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setTemas((current) => [...current, ""])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar tema
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">
          Cada tema aparece na Minha Atividade já ligado a este trabalho.
        </p>
      </div>

      {missing.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Falta escolher: {missing.join(" e ")}.
        </p>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-red-600 text-white hover:bg-red-700"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit
            ? "Guardar Alterações"
            : finalTemas.length > 1
              ? `Criar ${finalTemas.length} Temas`
              : "Criar Tema"}
        </Button>
      </div>
    </form>
  );
}

function DeleteScheduleForm({
  schedule,
  onClose,
  onDeleted,
}: {
  schedule: any;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await schedulesAPI.delete(schedule.id);
      await onDeleted();
      onClose();
    } catch (error) {
      console.error("Erro ao eliminar planeamento:", error);
      alert("Erro ao eliminar planeamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="min-w-0 text-xs text-red-700 dark:text-red-400">
          <p className="font-medium">
            O tema “{schedule.titulo}” deixa de aparecer na Minha Atividade.
          </p>
          <p className="mt-1 truncate">
            {schedule.job?.reference} · {schedule.job?.title}
          </p>
          <p className="mt-1">
            O trabalho e as atividades já registadas não são afetados.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white hover:bg-red-700"
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