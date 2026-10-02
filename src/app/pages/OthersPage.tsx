// src/app/pages/OthersPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { jobsAPI } from "../api";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  Search,
  Trash2,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  PackagePlus,
  Pencil,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  X,
  LayoutList,
  History,
  TrendingDown,
  Package,
  Euro,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ==================== CONSTANTES ====================
const PAGE_SIZE = 20;

type SortDir = "asc" | "desc";

interface StockFilters {
  search: string;
  identificacao: string;
  referenciaContabilidade: string;
  status: "todos" | "esgotado" | "abaixo_minimo";
}

const EMPTY_FILTERS: StockFilters = {
  search: "",
  identificacao: "",
  referenciaContabilidade: "",
  status: "todos",
};

const UNIDADES = [
  { value: "unidades", label: "un." },
  { value: "kgs", label: "kg" },
  { value: "litros", label: "L" },
  { value: "metros", label: "m" },
  { value: "metros_quadrados", label: "m²" },
];

// ==================== UTILITÁRIOS ====================
function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT");
}

function fmtEuro(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(v));
}

function fmtUnit(item: any) {
  return UNIDADES.find((u) => u.value === item.unidade_medida)?.label ?? "un.";
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(";") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const blob = new Blob(
    ["﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==================== SUBCOMPONENTES ====================
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="ml-1 inline h-3 w-3" />
    : <ArrowDown className="ml-1 inline h-3 w-3" />;
}

function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: "red" | "amber" | "green" | "blue";
}) {
  const colours = {
    red:   "text-red-600   bg-red-50   dark:bg-red-950/30   dark:text-red-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    blue:  "text-blue-600  bg-blue-50  dark:bg-blue-950/30  dark:text-blue-400",
  };
  const cls = colours[accent ?? "blue"];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

function Pagination({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
      <span className="text-xs text-zinc-400">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          let p = i + 1;
          if (pages > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= pages - 2) p = pages - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                p === page
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {p}
            </button>
          );
        })}
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function OthersPage() {
  const {
    users, stockItems, stockMovements,
    addStockItem, updateStockItem, deleteStockItem,
    addStockMovement, deleteStockMovement,
    loadStockData, currentUser,
  } = useApp();

  const [tab, setTab] = useState<"stock" | "movimentos">("stock");
  const [jobs, setJobs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // modais
  const [isItemModal, setIsItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [movementItem, setMovementItem] = useState<any | null>(null);

  // filtros stock
  const [filters, setFilters] = useState<StockFilters>({ ...EMPTY_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [stockSort, setStockSort] = useState<{ key: string; dir: SortDir }>({ key: "nome", dir: "asc" });
  const [stockPage, setStockPage] = useState(1);

  // filtros movimentos
  const [searchMov, setSearchMov] = useState("");
  const [tipoMov, setTipoMov] = useState<"todos" | "levantamento" | "devolucao">("todos");
  const [movSort, setMovSort] = useState<{ key: string; dir: SortDir }>({ key: "data", dir: "desc" });
  const [movPage, setMovPage] = useState(1);

  // form artigo
  const [itemData, setItemData] = useState({
    nome: "", identificacao: "", referenciaContabilidade: "",
    descricao: "", precoUnitario: "", estoqueMinimo: "",
    quantidade: 0, data_aquisicao: new Date().toISOString().split("T")[0],
    unidade_medida: "unidades",
  });

  // form movimento
  const [movData, setMovData] = useState({
    user_id: currentUser?.id ?? "",
    quantidade: 1,
    tipo: "levantamento" as "levantamento" | "devolucao",
    data: new Date().toISOString().split("T")[0],
    jobId: "",
    isManutencao: false,
  });

  // ==================== EFEITOS ====================
  useEffect(() => {
    jobsAPI.getAll().then(setJobs).catch(() => {});
  }, []);

  // reset paginação ao filtrar
  useEffect(() => { setStockPage(1); }, [filters, stockSort]);
  useEffect(() => { setMovPage(1); }, [searchMov, tipoMov, movSort]);

  // ==================== PERMISSÕES ====================
  const isAdmin =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio" ||
    currentUser?.role === "projeto";

  // ==================== FILTROS STOCK ====================
  const activeCount = [
    filters.search, filters.identificacao,
    filters.referenciaContabilidade,
    filters.status !== "todos" ? "x" : "",
  ].filter(Boolean).length;

  const filteredStock = useMemo(() => {
    const q = filters.search.toLowerCase();
    let r = stockItems.filter((i: any) => {
      const matchSearch =
        !q ||
        i.nome?.toLowerCase().includes(q) ||
        i.identificacao?.toLowerCase().includes(q) ||
        i.tag?.toLowerCase().includes(q);
      const matchId =
        !filters.identificacao ||
        i.identificacao?.toLowerCase().includes(filters.identificacao.toLowerCase());
      const matchRef =
        !filters.referenciaContabilidade ||
        i.referencia_contabilidade
          ?.toLowerCase()
          .includes(filters.referenciaContabilidade.toLowerCase());
      return matchSearch && matchId && matchRef;
    });

    if (filters.status === "esgotado") {
      r = r.filter((i) => Number(i.quantidade) <= 0);
    } else if (filters.status === "abaixo_minimo") {
      r = r.filter(
        (i) =>
          i.estoque_minimo != null &&
          Number(i.quantidade) < Number(i.estoque_minimo) &&
          Number(i.quantidade) > 0
      );
    }

    const { key, dir } = stockSort;
    return [...r].sort((a: any, b: any) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [stockItems, filters, stockSort]);

  const pagedStock = filteredStock.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);

  // ==================== FILTROS MOVIMENTOS ====================
  const filteredMovements = useMemo(() => {
    const q = searchMov.toLowerCase();
    let r = stockMovements.filter((m: any) => {
      const matchTipo = tipoMov === "todos" || m.tipo === tipoMov;
      const matchQ = !q || m.item_nome?.toLowerCase().includes(q) || m.user_nome?.toLowerCase().includes(q);
      return matchTipo && matchQ;
    });
    const { key, dir } = movSort;
    return [...r].sort((a: any, b: any) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [stockMovements, searchMov, tipoMov, movSort]);

  const pagedMovements = filteredMovements.slice((movPage - 1) * PAGE_SIZE, movPage * PAGE_SIZE);

  // ==================== MÉTRICAS ====================
  const totalRef = stockItems.length;
  const semStock = stockItems.filter((i: any) => Number(i.quantidade) <= 0).length;
  const abaixoMin = stockItems.filter(
    (i: any) => i.estoque_minimo != null && Number(i.quantidade) < Number(i.estoque_minimo) && Number(i.quantidade) > 0
  ).length;
  const valorTotal = stockItems.reduce(
    (s: number, i: any) => s + (i.preco_unitario != null ? Number(i.preco_unitario) * Number(i.quantidade) : 0),
    0
  );

  // ==================== SORT ====================
  const toggleStockSort = (key: string) =>
    setStockSort((c) => c.key === key ? { key, dir: c.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const toggleMovSort = (key: string) =>
    setMovSort((c) => c.key === key ? { key, dir: c.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  // ==================== CRUD ARTIGOS ====================
  const resetItemForm = () => {
    setItemData({
      nome: "", identificacao: "", referenciaContabilidade: "",
      descricao: "", precoUnitario: "", estoqueMinimo: "",
      quantidade: 0, data_aquisicao: new Date().toISOString().split("T")[0],
      unidade_medida: "unidades",
    });
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setItemData({
      nome: item.nome ?? "",
      identificacao: item.identificacao ?? "",
      referenciaContabilidade: item.referencia_contabilidade ?? "",
      descricao: item.descricao ?? "",
      precoUnitario: item.preco_unitario != null ? String(item.preco_unitario) : "",
      estoqueMinimo: item.estoque_minimo != null ? String(item.estoque_minimo) : "",
      quantidade: item.quantidade ?? 0,
      data_aquisicao: item.data_aquisicao ?? new Date().toISOString().split("T")[0],
      unidade_medida: item.unidade_medida ?? "unidades",
    });
    setIsItemModal(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome: itemData.nome,
      identificacao: itemData.identificacao,
      referencia_contabilidade: itemData.referenciaContabilidade || null,
      descricao: itemData.descricao || null,
      preco_unitario: itemData.precoUnitario ? Number(itemData.precoUnitario) : null,
      estoque_minimo: itemData.estoqueMinimo ? Number(itemData.estoqueMinimo) : null,
      quantidade: Number(itemData.quantidade),
      data_aquisicao: itemData.data_aquisicao,
      unidade_medida: itemData.unidade_medida,
    };
    try {
      if (editingItem) await updateStockItem(editingItem.id, payload);
      else await addStockItem(payload);
      resetItemForm();
      setIsItemModal(false);
    } catch {
      alert("Erro ao guardar o artigo.");
    }
  };

  const handleDeleteItem = (id: string, nome: string) => {
    if (confirm(`Remover "${nome}" do stock?`)) deleteStockItem(id);
  };

  // ==================== CRUD MOVIMENTOS ====================
  const resetMovForm = () =>
    setMovData({
      user_id: currentUser?.id ?? "",
      quantidade: 1,
      tipo: "levantamento",
      data: new Date().toISOString().split("T")[0],
      jobId: "",
      isManutencao: false,
    });

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementItem) return;
    if (movData.tipo === "levantamento" && !movData.isManutencao && !movData.jobId) {
      alert("Seleciona o projeto ou marca como manutenção.");
      return;
    }
    if (movData.tipo === "levantamento" && Number(movData.quantidade) > Number(movementItem.quantidade)) {
      alert(`Stock disponível: ${movementItem.quantidade} ${fmtUnit(movementItem)}`);
      return;
    }
    try {
      await addStockMovement({
        item_id: movementItem.id,
        user_id: movData.user_id,
        quantidade: Number(movData.quantidade),
        tipo: movData.tipo,
        data: movData.data,
        job_id: movData.tipo === "levantamento" && !movData.isManutencao ? movData.jobId : null,
        is_manutencao: movData.tipo === "levantamento" ? movData.isManutencao : false,
      });
      resetMovForm();
      setMovementItem(null);
    } catch {
      alert("Erro ao guardar o registo.");
    }
  };

  // ==================== REFRESH ====================
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStockData().catch(() => {});
    setRefreshing(false);
  };

  // ==================== EXPORTS ====================
  const exportStock = () =>
    downloadCsv(
      `stock-${new Date().toISOString().split("T")[0]}.csv`,
      ["Artigo", "Identificação", "Ref. Contab.", "Qtd.", "Unidade", "Preço Unit. (€)", "Valor Inv. (€)", "Stock Mín.", "Data Entrada"],
      filteredStock.map((i: any) => [
        i.nome ?? "", i.identificacao ?? "", i.referencia_contabilidade ?? "",
        i.quantidade ?? 0, fmtUnit(i),
        i.preco_unitario != null ? Number(i.preco_unitario).toFixed(2) : "",
        i.preco_unitario != null ? (Number(i.preco_unitario) * Number(i.quantidade)).toFixed(2) : "",
        i.estoque_minimo ?? "", fmtDate(i.data_aquisicao),
      ])
    );

  const exportMovements = () =>
    downloadCsv(
      `movimentos-${new Date().toISOString().split("T")[0]}.csv`,
      ["Data", "Tipo", "Artigo", "Quem", "Quantidade"],
      filteredMovements.map((m: any) => [
        fmtDate(m.data), m.tipo === "levantamento" ? "Levantamento" : "Devolução",
        m.item_nome ?? "Removido", m.user_nome ?? "Removido", m.quantidade ?? 0,
      ])
    );

  // ==================== RENDER ====================
  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Cabeçalho ERP ── */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Intranet</span>
              <span>/</span>
              <span className="text-zinc-700 dark:text-zinc-300">Gestão de Stock</span>
            </div>
            <h1 className="mt-0.5 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Inventário e Movimentos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleRefresh}
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={tab === "stock" ? exportStock : exportMovements}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar CSV
            </Button>
            <Button
              size="sm"
              className="h-9 bg-red-600 text-white hover:bg-red-700"
              onClick={() => { resetItemForm(); setIsItemModal(true); }}
            >
              <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
              Novo Artigo
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:grid-cols-4">
        <KpiCard
          label="Referências Ativas"
          value={String(totalRef)}
          icon={Package}
          accent="blue"
        />
        <KpiCard
          label="Sem Stock"
          value={String(semStock)}
          sub={semStock > 0 ? "artigos esgotados" : "tudo em ordem"}
          icon={TrendingDown}
          accent={semStock > 0 ? "red" : "green"}
        />
        <KpiCard
          label="Abaixo do Mínimo"
          value={String(abaixoMin)}
          sub={abaixoMin > 0 ? "reposição necessária" : "níveis normais"}
          icon={AlertTriangle}
          accent={abaixoMin > 0 ? "amber" : "green"}
        />
        <KpiCard
          label="Valor em Inventário"
          value={fmtEuro(valorTotal)}
          sub="preço unitário × quantidade"
          icon={Euro}
          accent="blue"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {(["stock", "movimentos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
              tab === t
                ? "border-red-600 text-red-600 dark:text-red-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t === "stock" ? <LayoutList className="h-4 w-4" /> : <History className="h-4 w-4" />}
            {t === "stock" ? "Catálogo de Artigos" : "Entregas / Devoluções"}
            <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {t === "stock" ? filteredStock.length : filteredMovements.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Barra de ferramentas ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-white px-5 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
        {tab === "stock" ? (
          <>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-zinc-400" />
              <Input
                className="h-8 pl-8 text-sm"
                placeholder="Pesquisar artigo, identificação..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>

            {/* Pills de status */}
            <div className="flex gap-1">
              {(["todos", "esgotado", "abaixo_minimo"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => ({ ...f, status: s }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filters.status === s
                      ? s === "todos"
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                        : s === "esgotado"
                          ? "bg-red-600 text-white"
                          : "bg-amber-500 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {s === "todos" ? "Todos" : s === "esgotado" ? "Esgotados" : "Abaixo do Mín."}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 ml-auto"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filtros Avançados
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-4 min-w-4 bg-red-600 px-1 text-[10px] text-white">
                  {activeCount}
                </Badge>
              )}
            </Button>

            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-zinc-500"
                onClick={() => setFilters({ ...EMPTY_FILTERS })}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-zinc-400" />
              <Input
                className="h-8 pl-8 text-sm"
                placeholder="Pesquisar artigo ou utilizador..."
                value={searchMov}
                onChange={(e) => setSearchMov(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {(["todos", "levantamento", "devolucao"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoMov(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tipoMov === t
                      ? t === "todos"
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                        : t === "levantamento"
                          ? "bg-rose-600 text-white"
                          : "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {t === "todos" ? "Todos" : t === "levantamento" ? "Levantamentos" : "Devoluções"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filtros avançados stock */}
      {tab === "stock" && showFilters && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Identificação</Label>
              <Input
                className="h-8 text-sm"
                placeholder="Ex: A99999"
                value={filters.identificacao}
                onChange={(e) => setFilters((f) => ({ ...f, identificacao: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Ref. Contabilidade</Label>
              <Input
                className="h-8 text-sm"
                placeholder="Ex: 62210001"
                value={filters.referenciaContabilidade}
                onChange={(e) => setFilters((f) => ({ ...f, referenciaContabilidade: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela Stock ── */}
      {tab === "stock" && (
        <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="w-8 px-4 py-2.5 text-center text-zinc-300 dark:text-zinc-600">#</th>
                <th className="cursor-pointer select-none px-4 py-2.5 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleStockSort("nome")}>
                  Artigo <SortIcon active={stockSort.key === "nome"} dir={stockSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleStockSort("identificacao")}>
                  Identificação <SortIcon active={stockSort.key === "identificacao"} dir={stockSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 text-right hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleStockSort("quantidade")}>
                  Quantidade <SortIcon active={stockSort.key === "quantidade"} dir={stockSort.dir} />
                </th>
                <th className="px-3 py-2.5">Unid.</th>
                <th className="cursor-pointer select-none px-3 py-2.5 text-right hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleStockSort("preco_unitario")}>
                  P. Unit. <SortIcon active={stockSort.key === "preco_unitario"} dir={stockSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 text-right hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleStockSort("data_aquisicao")}>
                  Entrada <SortIcon active={stockSort.key === "data_aquisicao"} dir={stockSort.dir} />
                </th>
                <th className="px-4 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pagedStock.length ? (
                pagedStock.map((item: any, idx) => {
                  const isOut = Number(item.quantidade) <= 0;
                  const isLow =
                    !isOut &&
                    item.estoque_minimo != null &&
                    Number(item.quantidade) < Number(item.estoque_minimo);
                  const rowStart = (stockPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr
                      key={item.id}
                      className={`group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                        isOut ? "bg-red-50/40 dark:bg-red-950/10" : isLow ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center text-[11px] text-zinc-300 dark:text-zinc-600">{rowStart}</td>
                      <td className="px-4 py-2.5">
                        <button
                          className="text-left"
                          onClick={() => openEdit(item)}
                        >
                          <p className="font-medium text-zinc-800 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">
                            {item.nome}
                          </p>
                          {item.descricao && (
                            <p className="mt-0.5 text-[11px] text-zinc-400">{item.descricao}</p>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {item.identificacao ?? "—"}
                        {item.referencia_contabilidade && (
                          <div className="text-[10px] text-zinc-400">{item.referencia_contabilidade}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                            isOut
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : isLow
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {isOut && <AlertTriangle className="mr-1 h-3 w-3" />}
                          {item.quantidade ?? 0}
                        </span>
                        {item.estoque_minimo != null && (
                          <div className="mt-0.5 text-[10px] text-zinc-400">mín: {item.estoque_minimo}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">{fmtUnit(item)}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-zinc-600 dark:text-zinc-300">
                        {item.preco_unitario != null ? (
                          <>
                            <div>{fmtEuro(item.preco_unitario)}</div>
                            <div className="text-[10px] text-zinc-400">
                              {fmtEuro(Number(item.preco_unitario) * Number(item.quantidade))} total
                            </div>
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">{fmtDate(item.data_aquisicao)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300"
                            onClick={() => { resetMovForm(); setMovementItem(item); }}
                          >
                            <ArrowDownToLine className="mr-1 h-3 w-3" />
                            Mov.
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                              onClick={() => handleDeleteItem(item.id, item.nome)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-zinc-400">
                    <Boxes className="mx-auto mb-3 h-8 w-8 text-zinc-200 dark:text-zinc-700" />
                    Nenhum artigo encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={stockPage} total={filteredStock.length} pageSize={PAGE_SIZE} onChange={setStockPage} />
        </div>
      )}

      {/* ── Tabela Movimentos ── */}
      {tab === "movimentos" && (
        <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="w-8 px-4 py-2.5 text-center text-zinc-300 dark:text-zinc-600">#</th>
                <th className="cursor-pointer select-none px-4 py-2.5 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleMovSort("data")}>
                  Data <SortIcon active={movSort.key === "data"} dir={movSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleMovSort("tipo")}>
                  Tipo <SortIcon active={movSort.key === "tipo"} dir={movSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleMovSort("item_nome")}>
                  Artigo <SortIcon active={movSort.key === "item_nome"} dir={movSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleMovSort("user_nome")}>
                  Responsável <SortIcon active={movSort.key === "user_nome"} dir={movSort.dir} />
                </th>
                <th className="cursor-pointer select-none px-3 py-2.5 text-right hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => toggleMovSort("quantidade")}>
                  Qtd. <SortIcon active={movSort.key === "quantidade"} dir={movSort.dir} />
                </th>
                {isAdmin && <th className="w-12 px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pagedMovements.length ? (
                pagedMovements.map((m: any, idx) => (
                  <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-2.5 text-center text-[11px] text-zinc-300 dark:text-zinc-600">
                      {(movPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{fmtDate(m.data)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                          m.tipo === "levantamento"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}
                      >
                        {m.tipo === "levantamento"
                          ? <ArrowUpFromLine className="h-3 w-3" />
                          : <ArrowDownToLine className="h-3 w-3" />}
                        {m.tipo === "levantamento" ? "Levantamento" : "Devolução"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">
                      {m.item_nome ?? <span className="italic text-zinc-400">Artigo removido</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {m.user_nome ?? <span className="italic text-zinc-400">Utilizador removido</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-zinc-800 dark:text-zinc-100">
                      {m.quantidade ?? 0}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          onClick={() => { if (confirm("Remover este registo?")) deleteStockMovement(m.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-16 text-center text-sm text-zinc-400">
                    Nenhum registo de movimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={movPage} total={filteredMovements.length} pageSize={PAGE_SIZE} onChange={setMovPage} />
        </div>
      )}

      {/* ── Modal: Artigo ── */}
      <Dialog open={isItemModal} onOpenChange={(o) => { setIsItemModal(o); if (!o) resetItemForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Artigo" : "Novo Artigo de Stock"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Actualize os detalhes do artigo." : "Preencha os dados para registar um novo artigo no inventário."}
            </DialogDescription>
          </DialogHeader>
          <form className="mt-2 space-y-4" onSubmit={handleSubmitItem}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="i-nome">Designação *</Label>
                <Input id="i-nome" required placeholder="Ex: Parafuso M8 × 20" value={itemData.nome}
                  onChange={(e) => setItemData((d) => ({ ...d, nome: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="i-desc">Descrição</Label>
                <Input id="i-desc" placeholder="Informação adicional" value={itemData.descricao}
                  onChange={(e) => setItemData((d) => ({ ...d, descricao: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-id">Identificação *</Label>
                <Input id="i-id" required placeholder="Ex: A99999" value={itemData.identificacao}
                  onChange={(e) => setItemData((d) => ({ ...d, identificacao: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-ref">Ref. Contabilidade</Label>
                <Input id="i-ref" placeholder="Ex: 62210001" value={itemData.referenciaContabilidade}
                  onChange={(e) => setItemData((d) => ({ ...d, referenciaContabilidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-uni">Unidade de Medida</Label>
                <select id="i-uni" value={itemData.unidade_medida}
                  onChange={(e) => setItemData((d) => ({ ...d, unidade_medida: e.target.value }))}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.value} ({u.label})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-data">Data de Entrada *</Label>
                <Input id="i-data" type="date" required value={itemData.data_aquisicao}
                  onChange={(e) => setItemData((d) => ({ ...d, data_aquisicao: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-qtd">Quantidade {editingItem ? "" : "Inicial"} *</Label>
                <Input id="i-qtd" type="number" min="0" required value={itemData.quantidade}
                  onChange={(e) => setItemData((d) => ({ ...d, quantidade: Math.max(0, parseInt(e.target.value) || 0) }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i-min">Stock Mínimo</Label>
                <Input id="i-min" type="number" min="0" placeholder="0" value={itemData.estoqueMinimo}
                  onChange={(e) => setItemData((d) => ({ ...d, estoqueMinimo: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="i-preco">Preço Unitário (€)</Label>
                <Input id="i-preco" type="number" min="0" step="0.01" placeholder="0.00" value={itemData.precoUnitario}
                  onChange={(e) => setItemData((d) => ({ ...d, precoUnitario: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" onClick={() => { setIsItemModal(false); resetItemForm(); }}>Cancelar</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                {editingItem ? "Guardar Alterações" : "Criar Artigo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Movimento ── */}
      <Dialog open={Boolean(movementItem)} onOpenChange={(o) => { if (!o) { resetMovForm(); setMovementItem(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registar Movimento</DialogTitle>
            <DialogDescription>
              Levantamento desconta do stock. Devolução repõe.
            </DialogDescription>
          </DialogHeader>
          {movementItem && (
            <form className="space-y-4" onSubmit={handleAddMovement}>
              {/* Artigo selecionado */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">{movementItem.nome}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {movementItem.identificacao} · Disponível:{" "}
                  <strong>{movementItem.quantidade} {fmtUnit(movementItem)}</strong>
                </p>
              </div>

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovData((d) => ({ ...d, tipo: "levantamento" }))}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    movData.tipo === "levantamento"
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-rose-300 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <ArrowUpFromLine className="h-4 w-4" /> Levantamento
                </button>
                <button
                  type="button"
                  onClick={() => setMovData((d) => ({ ...d, tipo: "devolucao" }))}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    movData.tipo === "devolucao"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-emerald-300 dark:border-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <ArrowDownToLine className="h-4 w-4" /> Devolução
                </button>
              </div>

              {/* Destino (levantamento) */}
              {movData.tipo === "levantamento" && (
                <div className="space-y-2">
                  <Label className="text-xs">Destino *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovData((d) => ({ ...d, isManutencao: false }))}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        !movData.isManutencao
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Projeto
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovData((d) => ({ ...d, isManutencao: true, jobId: "" }))}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        movData.isManutencao
                          ? "border-zinc-700 bg-zinc-700 text-white"
                          : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Manutenção
                    </button>
                  </div>
                  {!movData.isManutencao && (
                    <select
                      required
                      value={movData.jobId}
                      onChange={(e) => setMovData((d) => ({ ...d, jobId: e.target.value }))}
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">Selecionar projeto...</option>
                      {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* Responsável */}
              <div className="space-y-1.5">
                <Label htmlFor="m-user" className="text-xs">Responsável *</Label>
                <select
                  id="m-user"
                  required
                  value={movData.user_id}
                  onChange={(e) => setMovData((d) => ({ ...d, user_id: e.target.value }))}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">Selecionar utilizador...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-qtd" className="text-xs">Quantidade *</Label>
                  <Input
                    id="m-qtd" type="number" min="1" required
                    value={movData.quantidade}
                    onChange={(e) => setMovData((d) => ({ ...d, quantidade: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-data" className="text-xs">Data *</Label>
                  <Input
                    id="m-data" type="date" required
                    value={movData.data}
                    onChange={(e) => setMovData((d) => ({ ...d, data: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => { resetMovForm(); setMovementItem(null); }}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className={movData.tipo === "devolucao" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
                >
                  Confirmar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
