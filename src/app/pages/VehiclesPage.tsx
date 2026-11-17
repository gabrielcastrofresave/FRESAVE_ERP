// src/app/pages/VehiclesPage.tsx

import { useState, useMemo, useEffect, useRef } from "react";
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
  FileText,
  UploadCloud,
  ExternalLink,
} from "lucide-react";
import { vehicleFilesAPI } from "../api";

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

const TIPOS_FICHEIRO_UI = [
  { value: "livrete", label: "Livrete" },
  { value: "seguro", label: "Seguro" },
  { value: "inspecao", label: "Inspeção" },
  { value: "folha_manutencao", label: "Folha de manutenção" },
  { value: "outro", label: "Outro" },
];

const labelTipo = (v: string) =>
  TIPOS_FICHEIRO_UI.find((t) => t.value === v)?.label ?? v;

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
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600 dark:text-red-400">
            FROTA
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Gestão de Viaturas
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
      <section className="overflow-hidden erp-surface">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                  <p className="text-xs font-medium text-muted-foreground">
                    Matrícula
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.matricula}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Marca
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.marca}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Modelo
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.modelo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Ano
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.ano}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Seguradora
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedVehicleForView.seguradora || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
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
                  <p className="text-xs font-medium text-muted-foreground">
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
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedVehicleForView)}
                  </div>
                </div>
              </div>

              {selectedVehicleForView.especificacoes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Especificações
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedVehicleForView.especificacoes}
                  </p>
                </div>
              )}

              <VehicleFilesSection
                vehicleId={selectedVehicleForView.id}
                canManage={canCreate}
              />

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
    <div className="erp-surface px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          warning && value > 0
            ? "text-red-600"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ===== Ficheiros da viatura =====

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];

const fileExt = (name?: string) =>
  (name?.split(".").pop() || "").toLowerCase();

const isImageFile = (f: any) =>
  (f.mime_type || "").startsWith("image/") ||
  IMAGE_EXT.includes(fileExt(f.nome_original));

const isPdfFile = (f: any) =>
  f.mime_type === "application/pdf" ||
  fileExt(f.nome_original) === "pdf";

const formatBytes = (n?: number | null) => {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

function VehicleFilesSection({
  vehicleId,
  canManage,
}: {
  vehicleId: string;
  canManage: boolean;
}) {
  const [files, setFiles] = useState<any[]>([]);
  const [tipo, setTipo] = useState("livrete");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewFile =
    files.find((f) => f.id === previewId) ?? null;

  const load = async () => {
    try {
      setError(null);
      setFiles(await vehicleFilesAPI.list(vehicleId));
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    setFiles([]);
    setPreviewId(null);
    load();
  }, [vehicleId]);

  // PDFs: carregados como blob para o browser os poder mostrar na pré-visualização
  useEffect(() => {
    setPdfBlobUrl(null);
    if (!previewFile || !isPdfFile(previewFile) || !previewFile.url)
      return;

    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(previewFile.url)
      .then((r) => r.blob())
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(
          new Blob([b], { type: "application/pdf" }),
        );
        setPdfBlobUrl(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewId, previewFile?.url]);

  const uploadFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of arr) {
        await vehicleFilesAPI.upload(vehicleId, file, tipo);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      await load();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!canManage || uploading) return;
    uploadFiles(e.dataTransfer.files);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Eliminar este ficheiro?")) return;
    try {
      await vehicleFilesAPI.remove(vehicleId, fileId);
      if (previewId === fileId) setPreviewId(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Abrir a pré-visualização e renovar os links (que expiram ao fim de 5 min)
  const openPreview = (fileId: string) => {
    setPreviewId(fileId);
    load();
  };

  return (
    <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Ficheiros
        </p>
        <span className="text-xs text-muted-foreground">
          {files.length}{" "}
          {files.length === 1 ? "ficheiro" : "ficheiros"}
        </span>
      </div>

      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-lg border border-dashed p-3 transition-colors ${
            dragging
              ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
              : "border-zinc-300 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-800/40"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {TIPOS_FICHEIRO_UI.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading
                ? "A carregar…"
                : "Escolher ou largar ficheiros aqui"}
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files && uploadFiles(e.target.files)
              }
            />
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <p className="rounded-lg border border-zinc-100 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
          Sem ficheiros anexados.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f) => (
            <li
              key={f.id}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => openPreview(f.id)}
                className="relative block h-28 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                title="Pré-visualizar"
              >
                {isImageFile(f) && f.url ? (
                  <img
                    src={f.url}
                    alt={f.nome_original}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
                    <FileText className="h-8 w-8" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      {fileExt(f.nome_original) || "ficheiro"}
                    </span>
                  </div>
                )}
              </button>

              <div className="space-y-1.5 p-2.5">
                <p
                  className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100"
                  title={f.nome_original}
                >
                  {f.nome_original}
                </p>

                <div className="flex items-center justify-between gap-1">
                  <Badge className="border-zinc-200 bg-zinc-50 px-1.5 py-0 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {labelTipo(f.tipo)}
                  </Badge>

                  <div className="flex items-center">
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir noutro separador"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteFile(f.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400">
                  {new Date(f.data_upload).toLocaleDateString(
                    "pt-PT",
                  )}
                  {f.tamanho_bytes
                    ? ` · ${formatBytes(f.tamanho_bytes)}`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Pré-visualização grande */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">
              {previewFile?.nome_original}
            </DialogTitle>
            <DialogDescription>
              {previewFile
                ? `${labelTipo(previewFile.tipo)} · ${new Date(
                    previewFile.data_upload,
                  ).toLocaleDateString("pt-PT")}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {previewFile && isImageFile(previewFile) && previewFile.url && (
            <img
              src={previewFile.url}
              alt={previewFile.nome_original}
              className="max-h-[65vh] w-full rounded-md bg-zinc-100 object-contain dark:bg-zinc-800"
            />
          )}

          {previewFile && isPdfFile(previewFile) && (
            <>
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title={previewFile.nome_original}
                  className="h-[65vh] w-full rounded-md border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
                  A carregar pré-visualização…
                </div>
              )}
            </>
          )}

          {previewFile &&
            !isImageFile(previewFile) &&
            !isPdfFile(previewFile) && (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-800">
                <FileText className="h-8 w-8 text-zinc-300" />
                Sem pré-visualização para este tipo de ficheiro.
              </div>
            )}

          <div className="flex justify-end gap-2">
            {previewFile?.url && (
              <a
                href={previewFile.url}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" type="button">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir noutro separador
                </Button>
              </a>
            )}
            <Button
              type="button"
              onClick={() => setPreviewId(null)}
              className="bg-red-600 hover:bg-red-700"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}