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
  DialogTrigger,
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
  Maximize2,
  Filter,
  X,
} from "lucide-react";

const PREVIEW_LIMIT = 5;

// ==================== TIPOS ====================
type SortDirection = "asc" | "desc";

interface StockFilters {
  tag: string;
  artigo: string;
  identificacao: string;
  referenciaContabilidade: string;
  status: "todos" | "esgotado" | "abaixo_minimo";
}

const EMPTY_STOCK_FILTERS: StockFilters = {
  tag: "",
  artigo: "",
  identificacao: "",
  referenciaContabilidade: "",
  status: "todos",
};

// ==================== COMPONENTES AUXILIARES ====================
function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active)
    return (
      <ArrowUpDown className="ml-1 inline h-3 w-3 text-zinc-300" />
    );
  return direction === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

function MiniMetric({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          warning && value > 0
            ? "text-red-600"
            : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ==================== FUNÇÕES UTILITÁRIAS ====================
function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escapeCell = (value: string | number) => {
    const str = String(value ?? "");
    if (
      str.includes(";") ||
      str.includes('"') ||
      str.includes("\n")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ];

  const csvContent = "\ufeff" + lines.join("\r\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDatePt(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-PT");
}

function formatEuro(value: any) {
  if (value === null || value === undefined || value === "")
    return "-";
  return `${Number(value).toFixed(2)} €`;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function OthersPage() {
  const {
    users,
    stockItems,
    stockMovements,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addStockMovement,
    deleteStockMovement,
    currentUser,
  } = useApp();

  // ==================== ESTADO ====================
  const [jobs, setJobs] = useState<any[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(
    null,
  );
  const [movementItem, setMovementItem] = useState<any | null>(
    null,
  );

  const [stockExpanded, setStockExpanded] = useState(false);
  const [movementsExpanded, setMovementsExpanded] =
    useState(false);

  const [showStockFilters, setShowStockFilters] =
    useState(false);
  const [showMovFilters, setShowMovFilters] = useState(false);

  const [searchMov, setSearchMov] = useState("");
  const [tipoFilter, setTipoFilter] = useState<
    "todos" | "levantamento" | "devolucao"
  >("todos");

  const [stockFilters, setStockFilters] =
    useState<StockFilters>({
      ...EMPTY_STOCK_FILTERS,
    });

  const [stockSort, setStockSort] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: "nome",
    direction: "asc",
  });

  const [movSort, setMovSort] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: "data",
    direction: "desc",
  });

  const [itemData, setItemData] = useState({
    nome: "",
    identificacao: "",
    referenciaContabilidade: "",
    descricao: "",
    precoUnitario: "",
    estoqueMinimo: "",
    quantidade: 0,
    data_aquisicao: new Date().toISOString().split("T")[0],
    unidade_medida: "unidades", // NOVO
  });

  const UNIDADES_MEDIDA = [
    { value: "unidades", label: "Unidades" },
    { value: "kgs", label: "Quilogramas (kg)" },
    { value: "litros", label: "Litros (l)" },
    { value: "metros", label: "Metros (m)" },
    {
      value: "metros_quadrados",
      label: "Metros Quadrados (m²)",
    },
  ];

  const [movData, setMovData] = useState({
    user_id: "",
    quantidade: 1,
    tipo: "levantamento" as "levantamento" | "devolucao",
    data: new Date().toISOString().split("T")[0],
    jobId: "",
    isManutencao: false,
  });

  // ==================== EFEITOS ====================
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await jobsAPI.getAll();
        setJobs(data || []);
      } catch (error) {
        console.error("Erro ao carregar projetos:", error);
      }
    };
    loadJobs();
  }, []);

  // ==================== PERMISSÕES ====================
  const canDelete =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio" ||
    currentUser?.role === "projeto";

  // ==================== FILTROS ====================
  const activeStockFiltersCount = [
    stockFilters.tag,
    stockFilters.artigo,
    stockFilters.identificacao,
    stockFilters.referenciaContabilidade,
    stockFilters.status !== "todos" ? stockFilters.status : "",
  ].filter(Boolean).length;

  const activeMovFiltersCount = tipoFilter !== "todos" ? 1 : 0;

  const updateStockFilter = (
    key: keyof StockFilters,
    value: string,
  ) =>
    setStockFilters((current) => ({
      ...current,
      [key]: value,
    }));

  const clearStockFilters = () =>
    setStockFilters({ ...EMPTY_STOCK_FILTERS });

  // ==================== FILTRAGEM + ORDENAÇÃO: STOCK ====================
  const filteredStock = useMemo(() => {
    let result = stockItems.filter((i: any) => {
      const matchesTag =
        !stockFilters.tag ||
        i.tag
          ?.toLowerCase()
          .includes(stockFilters.tag.toLowerCase());
      const matchesArtigo =
        !stockFilters.artigo ||
        i.nome
          ?.toLowerCase()
          .includes(stockFilters.artigo.toLowerCase());
      const matchesIdentificacao =
        !stockFilters.identificacao ||
        i.identificacao
          ?.toLowerCase()
          .includes(stockFilters.identificacao.toLowerCase());
      const matchesReferencia =
        !stockFilters.referenciaContabilidade ||
        i.referencia_contabilidade
          ?.toLowerCase()
          .includes(
            stockFilters.referenciaContabilidade.toLowerCase(),
          );
      return (
        matchesTag &&
        matchesArtigo &&
        matchesIdentificacao &&
        matchesReferencia
      );
    });

    if (stockFilters.status === "esgotado") {
      result = result.filter((i) => Number(i.quantidade) <= 0);
    } else if (stockFilters.status === "abaixo_minimo") {
      result = result.filter(
        (i) =>
          i.estoque_minimo != null &&
          Number(i.quantidade) <= Number(i.estoque_minimo) &&
          Number(i.quantidade) > 0,
      );
    }

    const { key, direction } = stockSort;
    result = [...result].sort((a: any, b: any) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string") {
        return direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [stockItems, stockFilters, stockSort]);

  // ==================== FILTRAGEM + ORDENAÇÃO: MOVIMENTOS ====================
  const filteredMovements = useMemo(() => {
    let result = stockMovements.filter((m) => {
      const matchesTipo =
        tipoFilter === "todos" || m.tipo === tipoFilter;
      const q = searchMov.toLowerCase();
      const matchesSearch =
        !q ||
        m.item_nome?.toLowerCase().includes(q) ||
        m.user_nome?.toLowerCase().includes(q);
      return matchesTipo && matchesSearch;
    });

    const { key, direction } = movSort;
    result = [...result].sort((a: any, b: any) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string") {
        return direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [stockMovements, searchMov, tipoFilter, movSort]);

  const visibleStock = stockExpanded
    ? filteredStock
    : filteredStock.slice(0, PREVIEW_LIMIT);
  const visibleMovements = movementsExpanded
    ? filteredMovements
    : filteredMovements.slice(0, PREVIEW_LIMIT);

  // ==================== ORDENAÇÃO ====================
  const toggleStockSort = (key: string) => {
    setStockSort((current) =>
      current.key === key
        ? {
            key,
            direction:
              current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  };

  const toggleMovSort = (key: string) => {
    setMovSort((current) =>
      current.key === key
        ? {
            key,
            direction:
              current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  };

  // ==================== MÉTRICAS ====================
  const totalUnidades = stockItems.reduce(
    (sum, i) => sum + Number(i.quantidade),
    0,
  );
  const semStock = stockItems.filter(
    (i) => Number(i.quantidade) <= 0,
  ).length;

  // ==================== CRUD ARTIGOS ====================
  const resetItemForm = () => {
    setItemData({
      nome: "",
      identificacao: "",
      referenciaContabilidade: "",
      descricao: "",
      precoUnitario: "",
      estoqueMinimo: "",
      quantidade: 0,
      data_aquisicao: new Date().toISOString().split("T")[0],
      unidade_medida: "unidades", // NOVO
    });
    setEditingItem(null);
  };

  const openCreateItem = () => {
    resetItemForm();
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setItemData({
      nome: item.nome || "",
      identificacao: item.identificacao || "",
      referenciaContabilidade:
        item.referencia_contabilidade || "",
      descricao: item.descricao || "",
      precoUnitario:
        item.preco_unitario != null
          ? String(item.preco_unitario)
          : "",
      estoqueMinimo:
        item.estoque_minimo != null
          ? String(item.estoque_minimo)
          : "",
      quantidade: item.quantidade || 0,
      data_aquisicao:
        item.data_aquisicao ||
        new Date().toISOString().split("T")[0],
      unidade_medida: item.unidade_medida || "unidades", // NOVO
    });
    setIsItemModalOpen(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nome: itemData.nome,
        identificacao: itemData.identificacao,
        referencia_contabilidade:
          itemData.referenciaContabilidade,
        descricao: itemData.descricao,
        preco_unitario: itemData.precoUnitario
          ? Number(itemData.precoUnitario)
          : null,
        estoque_minimo: itemData.estoqueMinimo
          ? Number(itemData.estoqueMinimo)
          : null,
        quantidade: Number(itemData.quantidade),
        data_aquisicao: itemData.data_aquisicao,
        unidade_medida: itemData.unidade_medida, // NOVO
      };

      if (editingItem) {
        await updateStockItem(editingItem.id, payload);
      } else {
        await addStockItem(payload);
      }

      resetItemForm();
      setIsItemModalOpen(false);
    } catch (error) {
      console.error("Erro ao guardar item:", error);
      alert("Erro ao guardar o artigo.");
    }
  };

  const handleDeleteItem = async (id: string, nome: string) => {
    if (
      confirm(
        `Remover "${nome}" do stock? O histórico associado também será apagado.`,
      )
    ) {
      await deleteStockItem(id);
    }
  };

  // ==================== CRUD MOVIMENTOS ====================
  const resetMovementForm = () => {
    setMovData({
      user_id: "",
      quantidade: 1,
      tipo: "levantamento",
      data: new Date().toISOString().split("T")[0],
      jobId: "",
      isManutencao: false,
    });
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementItem) return;

    // Validação: projeto ou manutenção obrigatório
    if (
      movData.tipo === "levantamento" &&
      !movData.isManutencao &&
      !movData.jobId
    ) {
      alert("Seleciona o projeto ou marca como manutenção.");
      return;
    }

    // Validação: não permitir levantamento acima da quantidade
    if (
      movData.tipo === "levantamento" &&
      Number(movData.quantidade) >
        Number(movementItem.quantidade)
    ) {
      alert(
        `Quantidade máxima para levantamento: ${movementItem.quantidade} unid.`,
      );
      return;
    }

    try {
      await addStockMovement({
        item_id: movementItem.id,
        user_id: movData.user_id,
        quantidade: Number(movData.quantidade),
        tipo: movData.tipo,
        data: movData.data,
        job_id:
          movData.tipo === "levantamento" &&
          !movData.isManutencao
            ? movData.jobId
            : null,
        is_manutencao:
          movData.tipo === "levantamento"
            ? movData.isManutencao
            : false,
      });

      resetMovementForm();
      setMovementItem(null);
    } catch (error) {
      console.error("Erro ao submeter movimento:", error);
      alert("Erro ao guardar o registo.");
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (confirm("Remover este registo de movimento?")) {
      try {
        await deleteStockMovement(id);
      } catch (error) {
        console.error("Erro ao remover movimento:", error);
        alert("Erro ao remover o registo.");
      }
    }
  };

  // ==================== EXPORTAÇÕES CSV ====================
  const exportStockCsv = () => {
    downloadCsv(
      `stock-${new Date().toISOString().split("T")[0]}.csv`,
      [
        "Tag",
        "Artigo",
        "Descrição",
        "Identificação",
        "Referência Contabilidade",
        "Quantidade",
        "Unidade",
        "Stock Mínimo",
        "Preço Unitário",
        "Valor Inventário",
        "Data de Entrada",
      ],
      filteredStock.map((item: any) => [
        item.tag || "",
        item.nome || "",
        item.descricao || "",
        item.identificacao || "",
        item.referencia_contabilidade || "",
        item.quantidade ?? 0,
        UNIDADES_MEDIDA.find(
          (u) => u.value === item.unidade_medida, // ✅ CORRETO: "item" está em scope
        )?.label || "Unidades",
        item.estoque_minimo ?? "",
        item.preco_unitario != null
          ? Number(item.preco_unitario).toFixed(2)
          : "",
        item.valor_inventario != null
          ? Number(item.valor_inventario).toFixed(2)
          : "",
        formatDatePt(item.data_aquisicao),
      ]),
    );
  };
  const exportMovementsCsv = () => {
    downloadCsv(
      `movimentos-stock-${
        new Date().toISOString().split("T")[0]
      }.csv`,
      ["Data", "Ação", "Artigo", "Quem", "Quantidade"],
      filteredMovements.map((m: any) => [
        formatDatePt(m.data),
        m.tipo === "levantamento"
          ? "Levantamento"
          : "Devolução",
        m.item_nome || "Artigo Removido",
        m.user_nome || "Utilizador Apagado",
        m.quantidade ?? 0,
      ]),
    );
  };

  // ==================== BARRA DE TOPO: CATÁLOGO ====================
  const StockHeaderBar = () => (
    <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Catálogo de Artigos
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            A quantidade é atualizada em cada movimento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setShowStockFilters((v) => !v)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {activeStockFiltersCount > 0 && (
              <Badge className="ml-2 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                {activeStockFiltersCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-9"
            onClick={exportStockCsv}
            disabled={filteredStock.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {showStockFilters && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                Tag
              </Label>
              <Input
                value={stockFilters.tag}
                onChange={(e) =>
                  updateStockFilter("tag", e.target.value)
                }
                placeholder="Ex: A00001"
                className="h-9 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                Artigo
              </Label>
              <Input
                value={stockFilters.artigo}
                onChange={(e) =>
                  updateStockFilter("artigo", e.target.value)
                }
                placeholder="Ex: Parafuso M8"
                className="h-9 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                Identificação
              </Label>
              <Input
                value={stockFilters.identificacao}
                onChange={(e) =>
                  updateStockFilter(
                    "identificacao",
                    e.target.value,
                  )
                }
                placeholder="Ex: A99999"
                className="h-9 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                Referência de Contabilidade
              </Label>
              <Input
                value={stockFilters.referenciaContabilidade}
                onChange={(e) =>
                  updateStockFilter(
                    "referenciaContabilidade",
                    e.target.value,
                  )
                }
                placeholder="Ex: 62210001"
                className="h-9 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500 dark:text-zinc-400">
                Estado
              </Label>
              <select
                value={stockFilters.status}
                onChange={(e) =>
                  updateStockFilter(
                    "status",
                    e.target.value as
                      "todos" | "esgotado" | "abaixo_minimo",
                  )
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="todos">Todos os estados</option>
                <option value="esgotado">Esgotado</option>
                <option value="abaixo_minimo">
                  Abaixo do Mínimo
                </option>
              </select>
            </div>
          </div>
          {activeStockFiltersCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearStockFilters}
                className="h-8 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ==================== BARRA DE TOPO: MOVIMENTOS ====================
  const MovementsHeaderBar = () => (
    <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Entregas e Devoluções
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Histórico de entradas e saídas de material.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={searchMov}
              onChange={(e) => setSearchMov(e.target.value)}
              className="h-9 w-48 pl-9"
              placeholder="Pesquisar..."
            />
          </div>
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setShowMovFilters((v) => !v)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {activeMovFiltersCount > 0 && (
              <Badge className="ml-2 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                {activeMovFiltersCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-9"
            onClick={exportMovementsCsv}
            disabled={filteredMovements.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {showMovFilters && (
        <div className="mt-4 grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500 dark:text-zinc-400">
              Tipo de Ação
            </Label>
            <div className="flex items-center gap-1 rounded-lg bg-white p-1 dark:bg-zinc-900">
              {(
                ["todos", "levantamento", "devolucao"] as const
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFilter(t)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    tipoFilter === t
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {t === "todos"
                    ? "Todos"
                    : t === "levantamento"
                      ? "Levantamentos"
                      : "Devoluções"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== RENDER: TABELA DE STOCK ====================
  const renderStockTable = (items: any[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
          <tr>
            <th
              className="cursor-pointer select-none px-5 py-3"
              onClick={() => toggleStockSort("tag")}
            >
              Tag{" "}
              <SortIcon
                active={stockSort.key === "tag"}
                direction={stockSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-5 py-3"
              onClick={() => toggleStockSort("nome")}
            >
              Artigo{" "}
              <SortIcon
                active={stockSort.key === "nome"}
                direction={stockSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-right"
              onClick={() => toggleStockSort("quantidade")}
            >
              Quantidade{" "}
              <SortIcon
                active={stockSort.key === "quantidade"}
                direction={stockSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-right"
              onClick={() => toggleStockSort("quantidade")}
            >
              Quantidade{" "}
              <SortIcon
                active={stockSort.key === "quantidade"}
                direction={stockSort.direction}
              />
            </th>
            <th className="px-4 py-3">Unidade</th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-right"
              onClick={() => toggleStockSort("preco_unitario")}
            >
              Preço Unit.{" "}
              <SortIcon
                active={stockSort.key === "preco_unitario"}
                direction={stockSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-right"
              onClick={() =>
                toggleStockSort("valor_inventario")
              }
            >
              Valor Inventário{" "}
              <SortIcon
                active={stockSort.key === "valor_inventario"}
                direction={stockSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3"
              onClick={() => toggleStockSort("data_aquisicao")}
            >
              Data de Entrada{" "}
              <SortIcon
                active={stockSort.key === "data_aquisicao"}
                direction={stockSort.direction}
              />
            </th>
            <th className="px-5 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.length ? (
            items.map((item: any) => {
              const isEsgotado = Number(item.quantidade) <= 0;
              const isAbaixoMinimo =
                item.estoque_minimo != null &&
                Number(item.quantidade) <=
                  Number(item.estoque_minimo);
              return (
                <tr
                  key={item.id}
                  className="group transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-5 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {item.tag || "-"}
                  </td>
                  <td
                    className="cursor-pointer px-5 py-4"
                    onClick={() => openEditItem(item)}
                  >
                    <p className="font-medium text-zinc-800 dark:text-zinc-100">
                      {item.nome}
                    </p>
                    <p className="mt-1 font-mono text-xs text-zinc-400">
                      {item.identificacao || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Badge
                      className={
                        isEsgotado
                          ? "border-red-600 bg-red-600 text-white dark:border-red-600 dark:bg-red-600"
                          : isAbaixoMinimo
                            ? "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }
                    >
                      {item.quantidade} unid.
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {formatEuro(item.preco_unitario)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {formatEuro(item.valor_inventario)}
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDatePt(item.data_aquisicao)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        onClick={() => openEditItem(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        onClick={() => setMovementItem(item)}
                      >
                        <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                        Movimentar
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          onClick={() =>
                            handleDeleteItem(item.id, item.nome)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-16 text-center text-sm text-zinc-400"
              >
                <Boxes className="mx-auto mb-3 h-7 w-7 text-zinc-300" />
                Não foram encontrados artigos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ==================== RENDER: TABELA DE MOVIMENTOS ====================
  const renderMovementsTable = (items: any[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
          <tr>
            <th
              className="cursor-pointer select-none px-5 py-3"
              onClick={() => toggleMovSort("data")}
            >
              Data{" "}
              <SortIcon
                active={movSort.key === "data"}
                direction={movSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3"
              onClick={() => toggleMovSort("tipo")}
            >
              Ação{" "}
              <SortIcon
                active={movSort.key === "tipo"}
                direction={movSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3"
              onClick={() => toggleMovSort("item_nome")}
            >
              Artigo{" "}
              <SortIcon
                active={movSort.key === "item_nome"}
                direction={movSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3"
              onClick={() => toggleMovSort("user_nome")}
            >
              Quem{" "}
              <SortIcon
                active={movSort.key === "user_nome"}
                direction={movSort.direction}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-right"
              onClick={() => toggleMovSort("quantidade")}
            >
              Quantidade{" "}
              <SortIcon
                active={movSort.key === "quantidade"}
                direction={movSort.direction}
              />
            </th>
            {canDelete && <th className="px-5 py-3"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.length ? (
            items.map((m: any) => (
              <tr
                key={m.id}
                className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50"
              >
                <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDatePt(m.data)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      m.tipo === "levantamento"
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                    }`}
                  >
                    {m.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">
                  {m.item_nome || "Artigo Removido"}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {m.user_nome || "Utilizador Apagado"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-800 dark:text-zinc-100">
                  {m.quantidade} unid.
                </td>
                {canDelete && (
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      onClick={() => handleDeleteMovement(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={canDelete ? 6 : 5}
                className="px-5 py-14 text-center text-sm text-zinc-400"
              >
                Nenhum registo de movimento encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ==================== RENDER PRINCIPAL ====================
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            INVENTÁRIO
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gestão de Stock
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Registe artigos, acompanhe quantidades e mantenha o
            histórico de entregas e devoluções.
          </p>
        </div>
        <Dialog
          open={isItemModalOpen}
          onOpenChange={(open) => {
            setIsItemModalOpen(open);
            if (!open) resetItemForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={openCreateItem}
              className="h-10 bg-red-600 text-white hover:bg-red-700"
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              Novo Artigo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem
                  ? "Editar Artigo"
                  : "Novo Artigo de Stock"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Atualize os detalhes do artigo."
                  : "Cria o item de inventário para permitir entregas/devoluções."}
              </DialogDescription>
            </DialogHeader>
            <form
              className="mt-3 space-y-4"
              onSubmit={handleSubmitItem}
            >
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Designação do Artigo *
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Parafuso M8"
                  required
                  value={itemData.nome}
                  onChange={(e) =>
                    setItemData({
                      ...itemData,
                      nome: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: 10mm"
                  value={itemData.descricao}
                  onChange={(e) =>
                    setItemData({
                      ...itemData,
                      descricao: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identificacao">
                  Identificação *
                </Label>
                <Input
                  id="identificacao"
                  placeholder="Ex: A99999"
                  required
                  value={itemData.identificacao}
                  onChange={(e) =>
                    setItemData({
                      ...itemData,
                      identificacao: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenciaContabilidade">
                  Referência de Contabilidade
                </Label>
                <Input
                  id="referenciaContabilidade"
                  placeholder="Ex: 62210001"
                  value={itemData.referenciaContabilidade}
                  onChange={(e) =>
                    setItemData({
                      ...itemData,
                      referenciaContabilidade: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade_medida">
                  Unidade de Medida *
                </Label>
                <select
                  id="unidade_medida"
                  required
                  value={itemData.unidade_medida}
                  onChange={(e) =>
                    setItemData({
                      ...itemData,
                      unidade_medida: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {UNIDADES_MEDIDA.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precoUnitario">
                    Preço Unitário (€)
                  </Label>
                  <Input
                    id="precoUnitario"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemData.precoUnitario}
                    onChange={(e) =>
                      setItemData({
                        ...itemData,
                        precoUnitario: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estoqueMinimo">
                    Stock Mínimo
                  </Label>
                  <Input
                    id="estoqueMinimo"
                    type="number"
                    min="0"
                    value={itemData.estoqueMinimo}
                    onChange={(e) =>
                      setItemData({
                        ...itemData,
                        estoqueMinimo: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">
                    Quantidade {editingItem ? "" : "Inicial"} *
                  </Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="0"
                    required
                    value={itemData.quantidade}
                    onChange={(e) =>
                      setItemData({
                        ...itemData,
                        quantidade: Math.max(
                          0,
                          parseInt(e.target.value) || 0,
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_aquisicao">
                    Data de Entrada *
                  </Label>
                  <Input
                    id="data_aquisicao"
                    type="date"
                    required
                    value={itemData.data_aquisicao}
                    onChange={(e) =>
                      setItemData({
                        ...itemData,
                        data_aquisicao: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsItemModalOpen(false);
                    resetItemForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {editingItem
                    ? "Guardar Alterações"
                    : "Guardar Artigo"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Mini métricas */}
      <section className="grid gap-4 sm:grid-cols-3">
        <MiniMetric label="Referências" value={"+10000"} />
        <MiniMetric
          label="Artigos Sem Stock"
          value={semStock}
          warning
        />
        <MiniMetric
          label="Unidades em Armazém"
          value={totalUnidades}
        />
      </section>

      {/* Catálogo de artigos */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <StockHeaderBar />

        {renderStockTable(visibleStock)}

        {filteredStock.length > PREVIEW_LIMIT && (
          <div className="border-t border-zinc-100 p-3 text-center dark:border-zinc-800">
            <Dialog
              open={stockExpanded}
              onOpenChange={setStockExpanded}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Maximize2 className="mr-2 h-3.5 w-3.5" />
                  Ver todos ({filteredStock.length})
                </Button>
              </DialogTrigger>
              <DialogContent
                className="overflow-y-auto"
                style={{
                  width: "98vw",
                  maxWidth: "98vw",
                  height: "95vh",
                  maxHeight: "95vh",
                }}
              >
                <DialogHeader>
                  <DialogTitle>
                    Catálogo de Artigos ({filteredStock.length})
                  </DialogTitle>
                  <DialogDescription>
                    Lista completa, com a mesma pesquisa e
                    filtros aplicados.
                  </DialogDescription>
                </DialogHeader>
                <StockHeaderBar />
                {renderStockTable(filteredStock)}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </section>

      {/* Histórico de movimentos */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <MovementsHeaderBar />

        {renderMovementsTable(visibleMovements)}

        {filteredMovements.length > PREVIEW_LIMIT && (
          <div className="border-t border-zinc-100 p-3 text-center dark:border-zinc-800">
            <Dialog
              open={movementsExpanded}
              onOpenChange={setMovementsExpanded}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Maximize2 className="mr-2 h-3.5 w-3.5" />
                  Ver todos ({filteredMovements.length})
                </Button>
              </DialogTrigger>
              <DialogContent
                className="overflow-y-auto"
                style={{
                  width: "98vw",
                  maxWidth: "98vw",
                  height: "95vh",
                  maxHeight: "95vh",
                }}
              >
                <DialogHeader>
                  <DialogTitle>
                    Entregas e Devoluções (
                    {filteredMovements.length})
                  </DialogTitle>
                  <DialogDescription>
                    Lista completa, com a mesma pesquisa e
                    filtros aplicados.
                  </DialogDescription>
                </DialogHeader>
                <MovementsHeaderBar />
                {renderMovementsTable(filteredMovements)}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </section>

      {/* Modal de movimento */}
      <Dialog
        open={Boolean(movementItem)}
        onOpenChange={(open) => {
          if (!open) {
            resetMovementForm();
            setMovementItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar Movimento</DialogTitle>
            <DialogDescription>
              Desconta no stock ao levantar e soma ao devolver.
            </DialogDescription>
          </DialogHeader>
          {movementItem && (
            <form
              className="mt-3 space-y-4"
              onSubmit={handleAddMovement}
            >
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <p className="font-medium text-zinc-800 dark:text-zinc-100">
                  {movementItem.nome}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-400">
                  {movementItem.identificacao} · Disponível:{" "}
                  {movementItem.quantidade} unid.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={
                    movData.tipo === "devolucao"
                      ? "default"
                      : "outline"
                  }
                  className={
                    movData.tipo === "devolucao"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : ""
                  }
                  onClick={() =>
                    setMovData({
                      ...movData,
                      tipo: "devolucao",
                    })
                  }
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Devolução
                </Button>
                <Button
                  type="button"
                  variant={
                    movData.tipo === "levantamento"
                      ? "default"
                      : "outline"
                  }
                  className={
                    movData.tipo === "levantamento"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : ""
                  }
                  onClick={() =>
                    setMovData({
                      ...movData,
                      tipo: "levantamento",
                    })
                  }
                >
                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  Levantamento
                </Button>
              </div>
              {movData.tipo === "levantamento" && (
                <div className="space-y-2">
                  <Label>Atribuir a *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={
                        !movData.isManutencao
                          ? "default"
                          : "outline"
                      }
                      className={
                        !movData.isManutencao
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                      }
                      onClick={() =>
                        setMovData({
                          ...movData,
                          isManutencao: false,
                        })
                      }
                    >
                      Projeto
                    </Button>
                    <Button
                      type="button"
                      variant={
                        movData.isManutencao
                          ? "default"
                          : "outline"
                      }
                      className={
                        movData.isManutencao
                          ? "bg-zinc-800 hover:bg-zinc-900"
                          : ""
                      }
                      onClick={() =>
                        setMovData({
                          ...movData,
                          isManutencao: true,
                          jobId: "",
                        })
                      }
                    >
                      Manutenção
                    </Button>
                  </div>
                  {!movData.isManutencao && (
                    <select
                      required
                      value={movData.jobId}
                      onChange={(e) =>
                        setMovData({
                          ...movData,
                          jobId: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-700"
                    >
                      <option value="">
                        Selecionar projeto...
                      </option>
                      {jobs.map((j: any) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="mov-user">Quem *</Label>
                <select
                  id="mov-user"
                  required
                  className="w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-700"
                  value={movData.user_id}
                  onChange={(e) =>
                    setMovData({
                      ...movData,
                      user_id: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Selecione o utilizador...
                  </option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mov-qtd">Quantidade *</Label>
                  <Input
                    id="mov-qtd"
                    type="number"
                    min="1"
                    required
                    value={movData.quantidade}
                    onChange={(e) =>
                      setMovData({
                        ...movData,
                        quantidade: Math.max(
                          1,
                          parseInt(e.target.value) || 1,
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mov-data">Data *</Label>
                  <Input
                    id="mov-data"
                    type="date"
                    required
                    value={movData.data}
                    onChange={(e) =>
                      setMovData({
                        ...movData,
                        data: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetMovementForm();
                    setMovementItem(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className={
                    movData.tipo === "devolucao"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }
                >
                  Confirmar Registo
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}