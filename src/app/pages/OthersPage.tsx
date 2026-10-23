// src/app/pages/OthersPage.tsx
import { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
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
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// ==================== TIPOS ====================
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
  { value: "un", label: "un." },
  { value: "kgs", label: "kg" },
  { value: "kg", label: "kg" },
  { value: "litros", label: "L" },
  { value: "metros", label: "m" },
  { value: "metros_quadrados", label: "m²" },
  { value: "cento", label: "Cento" },
  { value: "cx", label: "Cx" },
];

const PAGE_SIZE = 100;

// Lista de movimentos virtualizada: só se desenham as linhas visíveis (altura fixa)
const MOV_ROW_H = 40;
const MOV_OVERSCAN = 12;

// ==================== UTILITÁRIOS ====================
function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function fmtEuro(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2,
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
  if (!active) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-30" />;
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
  const cls = {
    red:   "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    blue:  "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  }[accent ?? "blue"];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
        {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

function Pagination({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs text-zinc-500">
        {total === 0 ? "0 itens" : `${from}–${to} de ${total.toLocaleString("pt-PT")} itens`}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs text-zinc-600 dark:text-zinc-300">
          {page} / {totalPages}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => onChange(totalPages)}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function OthersPage() {
  const {
    users, stockItems, stockMovements, stockItemsTotal,
    addStockItem, updateStockItem, deleteStockItem,
    addStockMovement, deleteStockMovement,
    loadStockData, currentUser,
  } = useApp();

  const [tab, setTab] = useState<"stock" | "movimentos">("stock");
  const [jobs, setJobs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // paginação client-side (só o catálogo; os movimentos usam lista virtualizada)
  const [stockPage, setStockPage] = useState(1);

  // lista virtualizada dos movimentos
  const movListRef = useRef<HTMLDivElement>(null);
  const [movScroll, setMovScroll] = useState({ top: 0, height: 600 });

  // modais
  const [isItemModal, setIsItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [movementItem, setMovementItem] = useState<any | null>(null);

  // filtros stock
  const [filters, setFilters] = useState<StockFilters>({ ...EMPTY_FILTERS });
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [stockSort, setStockSort] = useState<{ key: string; dir: SortDir }>({ key: "nome", dir: "asc" });

  // filtros movimentos
  const [searchMov, setSearchMov] = useState("");
  const deferredSearchMov = useDeferredValue(searchMov);
  const [tipoMov, setTipoMov] = useState<"todos" | "levantamento" | "devolucao">("todos");
  const [movSort, setMovSort] = useState<{ key: string; dir: SortDir }>({ key: "data", dir: "desc" });

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

  // Reset page ao mudar filtros
  useEffect(() => { setStockPage(1); }, [filters, stockSort]);

  // Mede a altura visível da lista de movimentos
  useEffect(() => {
    if (tab !== "movimentos") return;
    const el = movListRef.current;
    if (!el) return;
    const measure = () =>
      setMovScroll((s) => (s.height === el.clientHeight ? s : { ...s, height: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  // Volta ao topo quando mudam os filtros / ordenação dos movimentos
  useEffect(() => {
    movListRef.current?.scrollTo({ top: 0 });
    setMovScroll((s) => ({ ...s, top: 0 }));
  }, [deferredSearchMov, tipoMov, movSort]);

  // ==================== PERMISSÕES ====================
  const isAdmin = ["administrador", "escritorio", "projeto"].includes(currentUser?.role ?? "");

  // ==================== FILTRAGEM STOCK ====================
  const activeFiltersCount = [
    filters.search, filters.identificacao, filters.referenciaContabilidade,
    filters.status !== "todos" ? "x" : "",
  ].filter(Boolean).length;

  const filteredStock = useMemo(() => {
    const q = filters.search.toLowerCase();
    let r = stockItems.filter((i: any) => {
      if (q && !i.nome?.toLowerCase().includes(q) && !i.identificacao?.toLowerCase().includes(q) && !i.tag?.toLowerCase().includes(q)) return false;
      if (filters.identificacao && !i.identificacao?.toLowerCase().includes(filters.identificacao.toLowerCase())) return false;
      if (filters.referenciaContabilidade && !i.referencia_contabilidade?.toLowerCase().includes(filters.referenciaContabilidade.toLowerCase())) return false;
      return true;
    });
    if (filters.status === "esgotado") r = r.filter((i: any) => Number(i.quantidade) <= 0);
    else if (filters.status === "abaixo_minimo") r = r.filter((i: any) => i.estoque_minimo != null && Number(i.quantidade) < Number(i.estoque_minimo) && Number(i.quantidade) > 0);

    const { key, dir } = stockSort;
    return [...r].sort((a: any, b: any) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [stockItems, filters, stockSort]);

  const pagedStock = useMemo(() => {
    const start = (stockPage - 1) * PAGE_SIZE;
    return filteredStock.slice(start, start + PAGE_SIZE);
  }, [filteredStock, stockPage]);

  // ==================== FILTRAGEM MOVIMENTOS ====================
  const filteredMovements = useMemo(() => {
    const q = deferredSearchMov.toLowerCase();
    let r = stockMovements.filter((m: any) => {
      if (tipoMov !== "todos" && m.tipo !== tipoMov) return false;
      if (q && !m.item_nome?.toLowerCase().includes(q) && !m.user_nome?.toLowerCase().includes(q)) return false;
      return true;
    });
    const { key, dir } = movSort;
    return [...r].sort((a: any, b: any) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [stockMovements, deferredSearchMov, tipoMov, movSort]);

  // Só as linhas visíveis (+ margem) são desenhadas
  const movStart = Math.max(0, Math.floor(movScroll.top / MOV_ROW_H) - MOV_OVERSCAN);
  const movEnd = Math.min(
    filteredMovements.length,
    Math.ceil((movScroll.top + movScroll.height) / MOV_ROW_H) + MOV_OVERSCAN,
  );
  const visibleMovements = useMemo(
    () => filteredMovements.slice(movStart, movEnd),
    [filteredMovements, movStart, movEnd],
  );

  // ==================== MÉTRICAS ====================
  const totalRef = stockItemsTotal || stockItems.length;
  const semStock = stockItems.filter((i: any) => Number(i.quantidade) <= 0).length;
  const abaixoMin = stockItems.filter((i: any) => i.estoque_minimo != null && Number(i.quantidade) < Number(i.estoque_minimo) && Number(i.quantidade) > 0).length;
  const valorTotal = stockItems.reduce((s: number, i: any) => s + (i.preco_unitario != null ? Number(i.preco_unitario) * Number(i.quantidade) : 0), 0);

  // ==================== SORT ====================
  const toggleStockSort = (key: string) =>
    setStockSort((c) => c.key === key ? { key, dir: c.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const toggleMovSort = (key: string) =>
    setMovSort((c) => c.key === key ? { key, dir: c.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  // ==================== CRUD ARTIGOS ====================
  const resetItemForm = () => {
    setItemData({ nome: "", identificacao: "", referenciaContabilidade: "", descricao: "", precoUnitario: "", estoqueMinimo: "", quantidade: 0, data_aquisicao: new Date().toISOString().split("T")[0], unidade_medida: "unidades" });
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setItemData({
      nome: item.nome ?? "", identificacao: item.identificacao ?? "",
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
  const resetMovForm = () => setMovData({
    user_id: currentUser?.id ?? "", quantidade: 1, tipo: "levantamento",
    data: new Date().toISOString().split("T")[0], jobId: "", isManutencao: false,
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
      ["Artigo", "Identificação", "Ref. Contab.", "Qtd.", "Unidade", "Preço Unit. (€)", "Stock Mín.", "Data Entrada"],
      filteredStock.map((i: any) => [
        i.nome ?? "", i.identificacao ?? "", i.referencia_contabilidade ?? "",
        i.quantidade ?? 0, fmtUnit(i),
        i.preco_unitario != null ? Number(i.preco_unitario).toFixed(2) : "",
        i.estoque_minimo ?? "", fmtDate(i.data_aquisicao),
      ])
    );

  const exportMovements = () =>
    downloadCsv(
      `movimentos-${new Date().toISOString().split("T")[0]}.csv`,
      ["Data", "Tipo", "Artigo", "Quem", "Quantidade"],
      filteredMovements.map((m: any) => [
        fmtDate(m.data), m.tipo === "levantamento" ? "Levantamento" : "Devolução",
        m.item_nome ?? "", m.user_nome ?? "", m.quantidade ?? 0,
      ])
    );

  const isLoading = stockItems.length === 0 && !refreshing;

  // ==================== RENDER ====================
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span>Intranet</span><span>/</span>
            <span className="text-zinc-600 dark:text-zinc-300">Gestão de Stock</span>
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Inventário e Movimentos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" className="h-8"
            onClick={tab === "stock" ? exportStock : exportMovements}
            disabled={tab === "stock" ? filteredStock.length === 0 : filteredMovements.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" />CSV
          </Button>
          <Button size="sm" className="h-8 bg-red-600 text-white hover:bg-red-700"
            onClick={() => { resetItemForm(); setIsItemModal(true); }}>
            <PackagePlus className="mr-1.5 h-3.5 w-3.5" />Novo Artigo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:grid-cols-4">
        <KpiCard label="Referências" value={totalRef.toLocaleString("pt-PT")} icon={Package} accent="blue" />
        <KpiCard label="Sem Stock" value={String(semStock)} sub={semStock > 0 ? "esgotados" : "tudo OK"} icon={TrendingDown} accent={semStock > 0 ? "red" : "green"} />
        <KpiCard label="Abaixo do Mínimo" value={String(abaixoMin)} sub={abaixoMin > 0 ? "repor" : "níveis OK"} icon={AlertTriangle} accent={abaixoMin > 0 ? "amber" : "green"} />
        <KpiCard label="Valor Inventário" value={fmtEuro(valorTotal)} sub="preço × quantidade" icon={Euro} accent="blue" />
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {(["stock", "movimentos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "border-red-600 text-red-600 dark:text-red-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t === "stock" ? <LayoutList className="h-4 w-4" /> : <History className="h-4 w-4" />}
            {t === "stock" ? "Catálogo" : "Movimentos"}
            <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {t === "stock" ? filteredStock.length.toLocaleString("pt-PT") : filteredMovements.length.toLocaleString("pt-PT")}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-100 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        {tab === "stock" ? (
          <>
            <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
              <Search className="pointer-events-none absolute left-2.5 top-1.5 h-4 w-4 text-zinc-400" />
              <Input className="h-7 pl-8 text-sm" placeholder="Pesquisar artigo, identificação..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
            </div>
            <div className="flex gap-1">
              {(["todos", "esgotado", "abaixo_minimo"] as const).map((s) => (
                <button key={s} onClick={() => setFilters((f) => ({ ...f, status: s }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filters.status === s
                      ? s === "todos" ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : s === "esgotado" ? "bg-red-600 text-white"
                        : "bg-amber-500 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}>
                  {s === "todos" ? "Todos" : s === "esgotado" ? "Esgotados" : "Abaixo Mín."}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="ml-auto h-7"
              onClick={() => setShowAdvFilters((v) => !v)}>
              <Filter className="mr-1 h-3.5 w-3.5" />Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">{activeFiltersCount}</span>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-zinc-500"
                onClick={() => setFilters({ ...EMPTY_FILTERS })}>
                <X className="mr-1 h-3.5 w-3.5" />Limpar
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
              <Search className="pointer-events-none absolute left-2.5 top-1.5 h-4 w-4 text-zinc-400" />
              <Input className="h-7 pl-8 text-sm" placeholder="Artigo, utilizador..."
                value={searchMov} onChange={(e) => setSearchMov(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {(["todos", "levantamento", "devolucao"] as const).map((t) => (
                <button key={t} onClick={() => setTipoMov(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tipoMov === t
                      ? t === "todos" ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : t === "levantamento" ? "bg-rose-600 text-white"
                        : "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}>
                  {t === "todos" ? "Todos" : t === "levantamento" ? "Levantamentos" : "Devoluções"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filtros avançados */}
      {tab === "stock" && showAdvFilters && (
        <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Identificação</Label>
              <Input className="h-7 text-sm" placeholder="Ex: A99999" value={filters.identificacao}
                onChange={(e) => setFilters((f) => ({ ...f, identificacao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-500">Ref. Contabilidade</Label>
              <Input className="h-7 text-sm" placeholder="Ex: 62210001" value={filters.referenciaContabilidade}
                onChange={(e) => setFilters((f) => ({ ...f, referenciaContabilidade: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "stock" && (
          <>
            {/* Cabeçalho de colunas */}
            <div className="flex shrink-0 border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <div className="w-10 shrink-0 px-3 py-2 text-center">#</div>
              <div className="min-w-0 flex-1 cursor-pointer select-none px-3 py-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => toggleStockSort("nome")}>
                Artigo <SortIcon active={stockSort.key === "nome"} dir={stockSort.dir} />
              </div>
              <div className="w-36 shrink-0 cursor-pointer select-none px-3 py-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => toggleStockSort("identificacao")}>
                Identificação <SortIcon active={stockSort.key === "identificacao"} dir={stockSort.dir} />
              </div>
              <div className="w-28 shrink-0 cursor-pointer select-none px-3 py-2 text-right hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => toggleStockSort("quantidade")}>
                Quantidade <SortIcon active={stockSort.key === "quantidade"} dir={stockSort.dir} />
              </div>
              <div className="w-28 shrink-0 cursor-pointer select-none px-3 py-2 text-right hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => toggleStockSort("preco_unitario")}>
                Preço <SortIcon active={stockSort.key === "preco_unitario"} dir={stockSort.dir} />
              </div>
              <div className="w-24 shrink-0 cursor-pointer select-none px-3 py-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => toggleStockSort("data_aquisicao")}>
                Entrada <SortIcon active={stockSort.key === "data_aquisicao"} dir={stockSort.dir} />
              </div>
              <div className="w-32 shrink-0 px-3 py-2 text-right">Ações</div>
            </div>

            {/* Linhas com scroll */}
            <ScrollArea.Root className="flex-1 overflow-hidden">
              <ScrollArea.Viewport className="h-full w-full">
                {isLoading ? (
                  <div className="flex h-40 items-center justify-center gap-3 text-zinc-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">A carregar artigos...</span>
                  </div>
                ) : pagedStock.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-zinc-400">
                    <Boxes className="h-7 w-7 text-zinc-200 dark:text-zinc-700" />
                    <span className="text-sm">Nenhum artigo encontrado com os filtros aplicados.</span>
                  </div>
                ) : (
                  pagedStock.map((item: any, idx: number) => {
                    const isOut = Number(item.quantidade) <= 0;
                    const isLow = !isOut && item.estoque_minimo != null && Number(item.quantidade) < Number(item.estoque_minimo);
                    const globalIdx = (stockPage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <div key={item.id}
                        className={`flex items-center border-b border-zinc-100 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                          isOut ? "bg-red-50/40 dark:bg-red-950/10" : isLow ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                        }`}
                      >
                        <div className="w-10 shrink-0 px-3 text-center text-[11px] text-zinc-300 dark:text-zinc-700">{globalIdx}</div>
                        <div className="min-w-0 flex-1 px-3">
                          <button className="w-full text-left" onClick={() => openEdit(item)}>
                            <p className="truncate font-medium text-zinc-800 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">{item.nome}</p>
                            {item.descricao && <p className="truncate text-[11px] text-zinc-400">{item.descricao}</p>}
                          </button>
                        </div>
                        <div className="w-36 shrink-0 px-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="truncate">{item.identificacao ?? "—"}</div>
                          {item.referencia_contabilidade && (
                            <div className="truncate text-[10px] text-zinc-400">{item.referencia_contabilidade}</div>
                          )}
                        </div>
                        <div className="w-28 shrink-0 px-3 text-right">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                            isOut ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : isLow ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}>
                            {isOut && <AlertTriangle className="h-3 w-3" />}
                            {item.quantidade ?? 0} {fmtUnit(item)}
                          </span>
                          {item.estoque_minimo != null && (
                            <div className="mt-0.5 text-[10px] text-zinc-400">mín: {item.estoque_minimo}</div>
                          )}
                        </div>
                        <div className="w-28 shrink-0 px-3 text-right text-xs text-zinc-600 dark:text-zinc-300">
                          {item.preco_unitario != null ? (
                            <>
                              <div>{fmtEuro(item.preco_unitario)}</div>
                              <div className="text-[10px] text-zinc-400">{fmtEuro(Number(item.preco_unitario) * Number(item.quantidade))}</div>
                            </>
                          ) : "—"}
                        </div>
                        <div className="w-24 shrink-0 px-3 text-xs text-zinc-500">{fmtDate(item.data_aquisicao)}</div>
                        <div className="w-32 shrink-0 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300"
                              onClick={() => { resetMovForm(); setMovementItem(item); }}>
                              <ArrowDownToLine className="mr-1 h-3 w-3" />Mov.
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                              onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                onClick={() => handleDeleteItem(item.id, item.nome)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none border-l border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <Pagination page={stockPage} total={filteredStock.length} pageSize={PAGE_SIZE} onChange={setStockPage} />
          </>
        )}

        {tab === "movimentos" && (
          <>
            {/* Cabeçalho de colunas */}
            <div className="flex shrink-0 border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <div className="w-10 shrink-0 px-3 py-2 text-center">#</div>
              <div className="w-24 shrink-0 cursor-pointer select-none px-3 py-2" onClick={() => toggleMovSort("data")}>
                Data <SortIcon active={movSort.key === "data"} dir={movSort.dir} />
              </div>
              <div className="w-32 shrink-0 px-3 py-2">Tipo</div>
              <div className="min-w-0 flex-1 cursor-pointer select-none px-3 py-2" onClick={() => toggleMovSort("item_nome")}>
                Artigo <SortIcon active={movSort.key === "item_nome"} dir={movSort.dir} />
              </div>
              <div className="w-36 shrink-0 cursor-pointer select-none px-3 py-2" onClick={() => toggleMovSort("user_nome")}>
                Responsável <SortIcon active={movSort.key === "user_nome"} dir={movSort.dir} />
              </div>
              <div className="w-20 shrink-0 cursor-pointer select-none px-3 py-2 text-right" onClick={() => toggleMovSort("quantidade")}>
                Qtd. <SortIcon active={movSort.key === "quantidade"} dir={movSort.dir} />
              </div>
              {isAdmin && <div className="w-12 shrink-0 px-3 py-2" />}
            </div>

            <div
              ref={movListRef}
              className="min-h-0 flex-1 overflow-y-auto"
              onScroll={(e) => {
                const top = e.currentTarget.scrollTop;
                setMovScroll((s) => (s.top === top ? s : { ...s, top }));
              }}
            >
              {filteredMovements.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
                  Nenhum registo de movimento encontrado.
                </div>
              ) : (
                <div style={{ height: filteredMovements.length * MOV_ROW_H, position: "relative" }}>
                  <div style={{ position: "absolute", top: movStart * MOV_ROW_H, left: 0, right: 0 }}>
                    {visibleMovements.map((m: any, idx: number) => (
                      <div
                        key={m.id}
                        style={{ height: MOV_ROW_H }}
                        className="flex items-center border-b border-zinc-100 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      >
                        <div className="w-10 shrink-0 px-3 text-center text-[11px] text-zinc-300 dark:text-zinc-700">{movStart + idx + 1}</div>
                        <div className="w-24 shrink-0 px-3 text-xs text-zinc-500">{fmtDate(m.data)}</div>
                        <div className="w-32 shrink-0 px-3">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                            m.tipo === "levantamento"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          }`}>
                            {m.tipo === "levantamento" ? <ArrowUpFromLine className="h-3 w-3" /> : <ArrowDownToLine className="h-3 w-3" />}
                            {m.tipo === "levantamento" ? "Levant." : "Devol."}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 px-3 font-medium text-zinc-800 dark:text-zinc-100 truncate">
                          {m.item_nome ?? <span className="italic font-normal text-zinc-400">Removido</span>}
                        </div>
                        <div className="w-36 shrink-0 px-3 text-xs text-zinc-500 truncate">{m.user_nome ?? "—"}</div>
                        <div className="w-20 shrink-0 px-3 text-right font-semibold text-zinc-800 dark:text-zinc-100">{m.quantidade ?? 0}</div>
                        {isAdmin && (
                          <div className="w-12 shrink-0 px-3 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                              onClick={() => { if (confirm("Remover este registo?")) deleteStockMovement(m.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500">
                {filteredMovements.length.toLocaleString("pt-PT")} movimentos
                {filteredMovements.length !== stockMovements.length &&
                  ` (de ${stockMovements.length.toLocaleString("pt-PT")})`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Modal: Artigo */}
      <Dialog open={isItemModal} onOpenChange={(o) => { setIsItemModal(o); if (!o) resetItemForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Artigo" : "Novo Artigo de Stock"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Actualize os detalhes do artigo." : "Preencha os dados para registar no inventário."}
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
                  {[...new Map(UNIDADES.map(u => [u.value, u])).values()].map((u) => (
                    <option key={u.value} value={u.value}>{u.value} ({u.label})</option>
                  ))}
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
              <div className="sm:col-span-2 space-y-1.5">
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

      {/* Modal: Movimento */}
      <Dialog open={Boolean(movementItem)} onOpenChange={(o) => { if (!o) { resetMovForm(); setMovementItem(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registar Movimento</DialogTitle>
            <DialogDescription>Levantamento desconta. Devolução repõe.</DialogDescription>
          </DialogHeader>
          {movementItem && (
            <form className="space-y-4" onSubmit={handleAddMovement}>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">{movementItem.nome}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {movementItem.identificacao} · Disponível: <strong>{movementItem.quantidade} {fmtUnit(movementItem)}</strong>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["levantamento", "devolucao"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setMovData((d) => ({ ...d, tipo: t }))}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      movData.tipo === t
                        ? t === "levantamento" ? "border-rose-600 bg-rose-600 text-white" : "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                    }`}>
                    {t === "levantamento" ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
                    {t === "levantamento" ? "Levantamento" : "Devolução"}
                  </button>
                ))}
              </div>
              {movData.tipo === "levantamento" && (
                <div className="space-y-2">
                  <Label className="text-xs">Destino *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setMovData((d) => ({ ...d, isManutencao: false }))}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${!movData.isManutencao ? "border-red-600 bg-red-600 text-white" : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"}`}>
                      Projeto
                    </button>
                    <button type="button" onClick={() => setMovData((d) => ({ ...d, isManutencao: true, jobId: "" }))}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${movData.isManutencao ? "border-zinc-700 bg-zinc-700 text-white" : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"}`}>
                      Manutenção
                    </button>
                  </div>
                  {!movData.isManutencao && (
                    <select required value={movData.jobId} onChange={(e) => setMovData((d) => ({ ...d, jobId: e.target.value }))}
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="">Selecionar projeto...</option>
                      {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="m-user" className="text-xs">Responsável *</Label>
                <select id="m-user" required value={movData.user_id} onChange={(e) => setMovData((d) => ({ ...d, user_id: e.target.value }))}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <option value="">Selecionar utilizador...</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-qtd" className="text-xs">Quantidade *</Label>
                  <Input id="m-qtd" type="number" min="1" required value={movData.quantidade}
                    onChange={(e) => setMovData((d) => ({ ...d, quantidade: Math.max(1, parseInt(e.target.value) || 1) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-data" className="text-xs">Data *</Label>
                  <Input id="m-data" type="date" required value={movData.data}
                    onChange={(e) => setMovData((d) => ({ ...d, data: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => { resetMovForm(); setMovementItem(null); }}>Cancelar</Button>
                <Button type="submit" className={movData.tipo === "devolucao" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
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