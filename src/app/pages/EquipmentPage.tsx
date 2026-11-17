// src/app/pages/EquipmentPage.tsx

import { useState, useMemo } from "react";
import { useApp } from "../AppContext";
import { Equipment } from "../types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wrench,
} from "lucide-react";

export function EquipmentPage() {
  const {
    equipment,
    addEquipment,
    equipmentSchedules,
    updateEquipment,
    deleteEquipment,
    currentUser,
    refreshData,
  } = useApp();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] =
    useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [
    selectedEquipmentForView,
    setSelectedEquipmentForView,
  ] = useState<Equipment | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    identificacao: "",
    nome: "",
    categoria: "",
    tipo: "",
    marca: "",
    numeroSerie: "",
    observacoes: "",
  });

  // EquipmentPage.tsx
  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio" ||
    currentUser?.role === "projeto";
  const canEdit = canCreate; // mesmos cargos
  const categories = useMemo(() => {
    return [
      ...new Set(
        equipment.map((e) => e.categoria).filter(Boolean),
      ),
    ];
  }, [equipment]);

  const types = useMemo(() => {
    const source = categoryFilter
      ? equipment.filter((e) => e.categoria === categoryFilter)
      : equipment;
    return [
      ...new Set(source.map((e) => e.tipo).filter(Boolean)),
    ];
  }, [equipment, categoryFilter]);

  const filtered = useMemo(() => {
    return equipment.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.identificacao?.toLowerCase().includes(q) ||
        item.nome.toLowerCase().includes(q) ||
        item.tipo?.toLowerCase().includes(q) ||
        item.numeroSerie?.toLowerCase().includes(q) ||
        item.marca?.toLowerCase().includes(q);
      const matchesCategory =
        !categoryFilter || item.categoria === categoryFilter;
      const matchesType =
        !typeFilter || item.tipo === typeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [equipment, searchTerm, categoryFilter, typeFilter]);

  const formCategories = useMemo(() => {
    return [
      ...new Set(
        equipment.map((e) => e.categoria).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [equipment]);

  const formTypes = useMemo(() => {
    const base = formData.categoria
      ? equipment.filter(
          (e) => e.categoria === formData.categoria,
        )
      : equipment;
    return [
      ...new Set(base.map((e) => e.tipo).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
  }, [equipment, formData.categoria]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEquipment = filtered.slice(
    startIndex,
    endIndex,
  );

  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, typeFilter]);

  const handleViewDetails = (item: Equipment) => {
    setSelectedEquipmentForView(item);
    setViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      identificacao: "",
      nome: "",
      categoria: "",
      tipo: "",
      marca: "",
      numeroSerie: "",
      observacoes: "",
    });
    setEditingEquipment(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, formData);
      } else {
        await addEquipment(formData as any);
      }
      await refreshData();
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar equipamento.");
    }
  };

  const handleEdit = (equip: Equipment) => {
    setEditingEquipment(equip);
    setFormData({
      identificacao: equip.identificacao || "",
      nome: equip.nome,
      categoria: equip.categoria || "",
      tipo: equip.tipo || "",
      marca: equip.marca || "",
      numeroSerie: equip.numeroSerie || "",
      observacoes: equip.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Tem certeza que deseja eliminar este equipamento?",
      )
    ) {
      deleteEquipment(id);
    }
  };

  const isEquipmentInUseToday = (equip: Equipment): boolean => {
    const todayStr = new Date().toISOString().split("T")[0];
    const schedule = equipmentSchedules.find((s: any) => {
      if (s.equipment_id !== equip.id || s.status !== "ativo")
        return false;
      const startDate = new Date(s.data_inicio);
      const endDate = s.data_fim ? new Date(s.data_fim) : null;
      if (s.indefinido) return new Date(todayStr) >= startDate;
      if (endDate)
        return (
          new Date(todayStr) >= startDate &&
          new Date(todayStr) <= endDate
        );
      return false;
    });
    return !!schedule;
  };

  const getStatusBadge = (equip: Equipment) => {
    if (isEquipmentInUseToday(equip)) {
      return (
        <Badge className="border-zinc-800 bg-zinc-900 text-zinc-100 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50">
          Em Uso
        </Badge>
      );
    }
    const status = equip.status || "disponivel";
    if (status === "manutencao") {
      return (
        <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          Manutenção
        </Badge>
      );
    }
    return (
      <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        Disponível
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-amber-600 dark:text-amber-300">
            INVENTÁRIO
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Equipamentos
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Consulte, adicione e mantenha atualizado o
            inventário de equipamentos.
          </p>
        </div>
        {canCreate && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="h-10 bg-blue-700 text-white hover:bg-blue-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEquipment
                    ? "Editar Equipamento"
                    : "Adicionar Equipamento"}
                </DialogTitle>
                <DialogDescription>
                  {editingEquipment
                    ? "Edite os detalhes do equipamento."
                    : "Adicione um novo equipamento ao inventário."}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="mt-3 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="identificacao">
                      Identificação *
                    </Label>
                    <Input
                      id="identificacao"
                      value={formData.identificacao}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          identificacao: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nome: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">
                      Categoria *
                    </Label>
                    <Input
                      id="categoria"
                      list="categoria-options"
                      value={formData.categoria}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          categoria: e.target.value,
                          tipo: "",
                        })
                      }
                      placeholder="Escolher ou escrever categoria..."
                      required
                    />
                    <datalist id="categoria-options">
                      {formCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Input
                      id="tipo"
                      list="tipo-options"
                      value={formData.tipo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tipo: e.target.value,
                        })
                      }
                      placeholder={
                        formData.categoria
                          ? "Escolher ou escrever tipo..."
                          : "Escolha primeiro a categoria"
                      }
                      required
                    />
                    <datalist id="tipo-options">
                      {formTypes.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca *</Label>
                    <Input
                      id="marca"
                      value={formData.marca}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          marca: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroSerie">
                      Número de Série
                    </Label>
                    <Input
                      id="numeroSerie"
                      value={formData.numeroSerie}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numeroSerie: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacoes">
                    Observações
                  </Label>
                  <textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observacoes: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-700"
                    rows={3}
                  />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    {editingEquipment ? "Guardar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Filtros */}
      <section className="erp-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Pesquisar por nome, tipo, marca ou identificação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setTypeFilter("");
            }}
            className="h-9 rounded-md border border-zinc-200 bg-transparent px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {categoryFilter && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-transparent px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              <option value="">Todos os tipos</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          A mostrar {filtered.length} de {equipment.length}{" "}
          equipamentos
        </p>
      </section>

      {/* Tabela */}
      <section className="overflow-hidden erp-surface">
        <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-foreground">
            Lista de Equipamentos ({filtered.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3">Identificação</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Nº Série</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedEquipment.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm text-zinc-400"
                  >
                    <Wrench className="mx-auto mb-3 h-7 w-7 text-zinc-300" />
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              ) : (
                paginatedEquipment.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {item.identificacao || "-"}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100"
                      onClick={() => handleViewDetails(item)}
                    >
                      {item.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {item.numeroSerie || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.categoria || "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.tipo || "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {item.marca || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {canCreate && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                              onClick={() =>
                                handleDelete(item.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex flex-col gap-3 border-t border-zinc-100 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrar</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-md border border-zinc-200 bg-transparent px-2 text-sm dark:border-zinc-700"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {filtered.length === 0 ? 0 : startIndex + 1}-
              {Math.min(endIndex, filtered.length)} de{" "}
              {filtered.length}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                Primeira
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                Última
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Modal de detalhes */}
      {selectedEquipmentForView && (
        <Dialog
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedEquipmentForView.nome}
              </DialogTitle>
              <DialogDescription>
                Detalhes do equipamento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Identificação
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedEquipmentForView.identificacao ||
                      "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Tipo
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedEquipmentForView.tipo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Marca
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedEquipmentForView.marca || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Categoria
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedEquipmentForView.categoria}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedEquipmentForView)}
                  </div>
                </div>
              </div>
              {selectedEquipmentForView.observacoes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Observações
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedEquipmentForView.observacoes}
                  </p>
                </div>
              )}
              <div className="flex justify-end border-t pt-3">
                <Button
                  onClick={() => setViewModalOpen(false)}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}