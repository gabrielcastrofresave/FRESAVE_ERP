// src/app/pages/InspectionPage.tsx
import { useState } from "react";
import { useApp } from "../AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Download, Pencil, Search } from "lucide-react";

export function InspectionPage() {
  const {
    trucks,
    vehicles,
    machines,
    equipment,
    updateTruck,
    updateVehicle,
    updateMachine,
    updateEquipment,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState("camiao");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para o modal de exportação
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<"all" | "months">("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  //******************************************PERMISSÕES******************************************

  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "gestor";

  const canEdit =
    currentUser?.role === "administrador" ||
    currentUser?.role === "gestor" ||
    currentUser?.role === "mecanico";

  //***********************************************************************************************

  const getItemsForTab = () => {
    switch (activeTab) {
      case "camiao":
        return trucks
          .filter((t) => t.dataInspecao)
          .map((t) => ({
            id: t.id,
            tipo: "camiao",
            nome: `${t.marca} ${t.modelo} (${t.matricula})`,
            dataInspecao: t.dataInspecao || "",
          }));
      case "viatura":
        return vehicles
          .filter((v) => v.dataInspecao)
          .map((v) => ({
            id: v.id,
            tipo: "viatura",
            nome: `${v.marca} ${v.modelo} (${v.matricula})`,
            dataInspecao: v.dataInspecao || "",
          }));
      case "maquina":
        return machines
          .filter((m) => m.dataInspecao)
          .map((m) => ({
            id: m.id,
            tipo: "maquina",
            nome: m.nome,
            dataInspecao: m.dataInspecao || "",
          }));
      case "equipamento":
        return equipment
          .filter((e) => e.dataInspecao)
          .map((e) => ({
            id: e.id,
            tipo: "equipamento",
            nome: e.nome,
            dataInspecao: e.dataInspecao || "",
          }));
      default:
        return [];
    }
  };

  const handleSave = async (itemId: string) => {
    if (!editDate) {
      alert("Selecione uma data");
      return;
    }

    setIsLoading(true);

    try {
      switch (activeTab) {
        case "camiao":
          await updateTruck(itemId, {
            dataInspecao: editDate,
          });
          break;
        case "viatura":
          await updateVehicle(itemId, {
            dataInspecao: editDate,
          });
          break;
        case "maquina":
          await updateMachine(itemId, {
            dataInspecao: editDate,
          });
          break;
        case "equipamento":
          await updateEquipment(itemId, {
            dataInspecao: editDate,
          });
          break;
      }
      setEditingId(null);
      setEditDate("");
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar inspeção");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (dataInspecao: string) => {
    if (!dataInspecao) {
      return <Badge className="bg-gray-600">Sem data</Badge>;
    }

    const today = new Date();
    const inspDate = new Date(dataInspecao);

    if (inspDate < today) {
      return <Badge className="bg-red-600">Vencida</Badge>;
    } else if (
      inspDate.getTime() - today.getTime() <
      30 * 24 * 60 * 60 * 1000
    ) {
      return <Badge className="bg-orange-600">Próxima em breve</Badge>;
    } else {
      return <Badge className="bg-green-600">Válida</Badge>;
    }
  };

  const getStatus = (dataInspecao: string): string => {
    if (!dataInspecao) return "Sem data";

    const today = new Date();
    const inspDate = new Date(dataInspecao);

    if (inspDate < today) {
      return "Vencida";
    } else if (
      inspDate.getTime() - today.getTime() <
      30 * 24 * 60 * 60 * 1000
    ) {
      return "Próxima em breve";
    } else {
      return "Válida";
    }
  };

  const getAllItems = () => {
    return [
      ...trucks
        .filter((t) => t.dataInspecao)
        .map((t) => ({
          id: t.id,
          tipo: "Camião",
          nome: `${t.marca} ${t.modelo} (${t.matricula})`,
          dataInspecao: t.dataInspecao || "",
        })),
      ...vehicles
        .filter((v) => v.dataInspecao)
        .map((v) => ({
          id: v.id,
          tipo: "Viatura",
          nome: `${v.marca} ${v.modelo} (${v.matricula})`,
          dataInspecao: v.dataInspecao || "",
        })),
      ...machines
        .filter((m) => m.dataInspecao)
        .map((m) => ({
          id: m.id,
          tipo: "Máquina",
          nome: m.nome,
          dataInspecao: m.dataInspecao || "",
        })),
      ...equipment
        .filter((e) => e.dataInspecao)
        .map((e) => ({
          id: e.id,
          tipo: "Equipamento",
          nome: e.nome,
          dataInspecao: e.dataInspecao || "",
        })),
    ];
  };

  const filterItemsByMonth = (items: any[]) => {
    if (exportType === "all") return items;

    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);

    return items.filter((item) => {
      const date = new Date(item.dataInspecao);
      return (
        date.getMonth() + 1 === month && date.getFullYear() === year
      );
    });
  };

  const handleExport = () => {
    if (exportType === "months" && !selectedMonth) {
      alert("Por favor, selecione um mês");
      return;
    }

    const allItems = getAllItems();
    const itemsToExport = filterItemsByMonth(allItems);

    if (itemsToExport.length === 0) {
      alert("Não há dados para exportar com os filtros selecionados");
      return;
    }

    // Criar CSV
    const headers = ["Tipo", "Nome", "Data de Inspeção", "Estado"];
    const csvContent = [
      headers.join(","),
      ...itemsToExport.map((item) =>
        [
          item.tipo,
          `"${item.nome}"`,
          new Date(item.dataInspecao).toLocaleDateString("pt-PT"),
          getStatus(item.dataInspecao),
        ].join(",")
      ),
    ].join("\n");

    // Download do arquivo
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const fileName =
      exportType === "all"
        ? "inspecoes_todas.csv"
        : `inspecoes_${selectedYear}_${selectedMonth.padStart(2, "0")}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportDialog(false);
    setExportType("all");
    setSelectedMonth("");
  };

  const filteredItems = getItemsForTab().filter((item) =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gerar anos (últimos 5 anos e próximos 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  // Meses em português
  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Inspeções</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Total: {getItemsForTab().length}
          </p>
        </div>
        <Button onClick={() => setShowExportDialog(true)}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspeções</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              setSearchTerm("");
            }}
          >
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="camiao">
                Camiões (
                {trucks.filter((t) => t.dataInspecao).length})
              </TabsTrigger>
              <TabsTrigger value="viatura">
                Viaturas (
                {vehicles.filter((v) => v.dataInspecao).length})
              </TabsTrigger>
              <TabsTrigger value="maquina">
                Máquinas (
                {machines.filter((m) => m.dataInspecao).length})
              </TabsTrigger>
              <TabsTrigger value="equipamento">
                Equipamentos (
                {equipment.filter((e) => e.dataInspecao).length})
              </TabsTrigger>
            </TabsList>
            {["camiao", "viatura", "maquina", "equipamento"].map(
              (tab) => (
                <TabsContent key={tab} value={tab}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Validade Inspeção</TableHead>
                          <TableHead>Estado</TableHead>
                          {canEdit && <TableHead>Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={canEdit ? 4 : 3}
                              className="text-center text-gray-500 py-8"
                            >
                              Nenhum item encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.nome}</TableCell>
                              <TableCell>
                                {editingId === item.id ? (
                                  <Input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) =>
                                      setEditDate(e.target.value)
                                    }
                                    className="w-40"
                                  />
                                ) : item.dataInspecao ? (
                                  new Date(
                                    item.dataInspecao
                                  ).toLocaleDateString("pt-PT")
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(item.dataInspecao)}
                              </TableCell>
                              {canEdit && (
                                <TableCell>
                                  {editingId === item.id ? (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSave(item.id)
                                        }
                                        disabled={isLoading}
                                      >
                                        Guardar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          setEditingId(null)
                                        }
                                        disabled={isLoading}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingId(item.id);
                                        setEditDate(
                                          item.dataInspecao || ""
                                        );
                                      }}
                                      disabled={isLoading}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              )
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Exportação */}
      <Dialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Inspeções</DialogTitle>
            <DialogDescription>
              Escolha o período que deseja exportar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Exportação</Label>
              <Select
                value={exportType}
                onValueChange={(value: "all" | "months") =>
                  setExportType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dados</SelectItem>
                  <SelectItem value="months">Por mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportType === "months" && (
              <>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select
                    value={selectedYear}
                    onValueChange={setSelectedYear}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem
                          key={year}
                          value={year.toString()}
                        >
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem
                          key={month.value}
                          value={month.value}
                        >
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}