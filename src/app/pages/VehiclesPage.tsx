// src/app/pages/VehiclesPage.tsx

import { useState, useMemo } from "react";
import { useApp } from "../AppContext";
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
  Plus,
  Pencil,
  Trash2,
  Search,
  Car,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  disponivel:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  em_uso:
    "border-zinc-800 bg-zinc-900 text-zinc-100 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50",
  manutencao:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400",
  avaria:
    "border-red-600 bg-red-600 text-white dark:border-red-600 dark:bg-red-600 dark:text-white",
};

const STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em Uso",
  manutencao: "Em Manutenção",
  avaria: "Em Avaria",
};

export function VehiclesPage() {
  const {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    currentUser,
    refreshData,
  } = useApp();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<
    any | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicleForView, setSelectedVehicleForView] =
    useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    matricula: "",
    marca: "",
    modelo: "",
    ano: new Date().getFullYear(),
    seguradora: "",
    dataSeguro: "",
    dataInspecao: "",
    especificacoes: "",
  });

  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio";
  const canEdit =
    currentUser?.role === "administrador" ||
    currentUser?.role === "escritorio";

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(
      (v: any) =>
        v.matricula
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        v.marca
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        v.modelo
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [vehicles, searchTerm]);

  const disponiveis = vehicles.filter(
    (v: any) => v.status === "disponivel",
  ).length;
  const emAvaria = vehicles.filter(
    (v: any) => v.status === "avaria",
  ).length;

  const handleViewDetails = (vehicle: any) => {
    setSelectedVehicleForView(vehicle);
    setViewModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      matricula: "",
      marca: "",
      modelo: "",
      ano: new Date().getFullYear(),
      seguradora: "",
      dataSeguro: "",
      dataInspecao: "",
      especificacoes: "",
    });
    setEditingVehicle(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        matricula: formData.matricula,
        marca: formData.marca,
        modelo: formData.modelo,
        ano: Number(formData.ano),
        seguradora: formData.seguradora,
        dataSeguro: formData.dataSeguro || null,
        dataInspecao: formData.dataInspecao || null,
        especificacoes: formData.especificacoes,
      };

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
      } else {
        await addVehicle(payload as any);
      }

      await refreshData();
      resetForm();
    } catch (error) {
      console.error("Erro ao guardar:", error);
      alert("Erro ao guardar. Verifique a consola.");
    }
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      matricula: vehicle.matricula || "",
      marca: vehicle.marca || "",
      modelo: vehicle.modelo || "",
      ano: vehicle.ano || new Date().getFullYear(),
      seguradora: vehicle.seguradora || "",
      dataSeguro: vehicle.dataSeguro
        ? vehicle.dataSeguro.substring(0, 10)
        : "",
      dataInspecao: vehicle.dataInspecao
        ? vehicle.dataInspecao.substring(0, 10)
        : "",
      especificacoes: vehicle.especificacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      confirm("Tem certeza que deseja eliminar esta viatura?")
    ) {
      deleteVehicle(id);
    }
  };

  const getStatusBadge = (vehicle: any) => (
    <Badge
      className={
        STATUS_STYLES[vehicle.status] ||
        "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }
    >
      {STATUS_LABELS[vehicle.status] || vehicle.status}
    </Badge>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            FROTA
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gestão de Viaturas
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Consulte e mantenha atualizada a frota de viaturas
            (carros, carrinhas, etc.).
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
                className="h-10 bg-red-600 text-white hover:bg-red-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Viatura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle
                    ? "Editar Viatura"
                    : "Adicionar Viatura"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados essenciais da viatura
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="mt-3 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="matricula">
                      Matrícula *
                    </Label>
                    <Input
                      id="matricula"
                      value={formData.matricula}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          matricula: e.target.value,
                        })
                      }
                      placeholder="AA-11-BB"
                      required
                    />
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
                      placeholder="Toyota"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo *</Label>
                    <Input
                      id="modelo"
                      value={formData.modelo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          modelo: e.target.value,
                        })
                      }
                      placeholder="Hilux"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ano">Ano *</Label>
                    <Input
                      id="ano"
                      type="number"
                      value={formData.ano}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ano: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seguradora">
                      Seguradora
                    </Label>
                    <Input
                      id="seguradora"
                      value={formData.seguradora}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seguradora: e.target.value,
                        })
                      }
                      placeholder="Ex: Lusitânia"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataSeguro">
                      Validade Seguro
                    </Label>
                    <Input
                      id="dataSeguro"
                      type="date"
                      value={formData.dataSeguro}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataSeguro: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="dataInspecao">
                      Validade Inspeção *
                    </Label>
                    <Input
                      id="dataInspecao"
                      type="date"
                      value={formData.dataInspecao}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataInspecao: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="especificacoes">
                    Especificações Adicionais
                  </Label>
                  <Input
                    id="especificacoes"
                    value={formData.especificacoes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        especificacoes: e.target.value,
                      })
                    }
                    placeholder="Ex: Modelo, versão, etc."
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {editingVehicle
                      ? "Atualizar Viatura"
                      : "Adicionar Viatura"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Mini métricas */}
      <section className="grid gap-4 sm:grid-cols-3">
        <MiniMetric
          label="Total de Viaturas"
          value={vehicles.length}
        />
        <MiniMetric label="Disponíveis" value={disponiveis} />
        <MiniMetric
          label="Em Avaria"
          value={emAvaria}
          warning
        />
      </section>

      {/* Tabela */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Viaturas ({filteredVehicles.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Pesquisar por matrícula, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3">Matrícula</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-sm text-zinc-400"
                  >
                    <Car className="mx-auto mb-3 h-7 w-7 text-zinc-300" />
                    Nenhuma viatura encontrada.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle: any) => (
                  <tr
                    key={vehicle.id}
                    className="cursor-pointer hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50"
                    onClick={() => handleViewDetails(vehicle)}
                  >
                    <td className="px-5 py-3 font-mono text-sm text-zinc-800 dark:text-zinc-100">
                      {vehicle.matricula}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {vehicle.marca}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {vehicle.modelo}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {vehicle.ano}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(vehicle)}
                    </td>
                    <td
                      className="px-5 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            onClick={() => handleEdit(vehicle)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {canCreate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                              onClick={() =>
                                handleDelete(vehicle.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de detalhes */}
      {selectedVehicleForView && (
        <Dialog
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Viatura — {selectedVehicleForView.matricula}
              </DialogTitle>
              <DialogDescription>
                Informações essenciais da viatura
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Matrícula
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.matricula}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Marca
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.marca}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Modelo
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.modelo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Ano
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.ano}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Seguradora
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.seguradora || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Validade Seguro
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.dataSeguro
                      ? new Date(
                          selectedVehicleForView.dataSeguro,
                        ).toLocaleDateString("pt-PT")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Validade Inspeção
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.dataInspecao
                      ? new Date(
                          selectedVehicleForView.dataInspecao,
                        ).toLocaleDateString("pt-PT")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedVehicleForView)}
                  </div>
                </div>
              </div>

              {selectedVehicleForView.especificacoes && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Especificações
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedVehicleForView.especificacoes}
                  </p>
                </div>
              )}

              <div className="flex justify-end border-t pt-3">
                <Button
                  onClick={() => setViewModalOpen(false)}
                  className="bg-red-600 hover:bg-red-700"
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