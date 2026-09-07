// src/app/pages/MaintenancePage.tsx - COMPLETO COM PAGINAÇÃO

import { useState, useMemo } from "react";
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
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ==================== SCROLL PARA TEXTOS LONGOS ====================
const ConditionalScroll = ({ text }: { text: string }) => {
  if (!text || text.length <= 30) {
    return <span className="truncate">{text || "-"}</span>;
  }

  return (
    <>
      <style>{`
        @keyframes scroll-continuous {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scrolling-text-continuous {
          display: inline-block;
          animation: scroll-continuous 8s linear infinite;
          white-space: nowrap;
        }
        .scrolling-container-continuous {
          overflow: hidden;
          width: 100%;
          max-width: 200px;
        }
      `}</style>
      <div className="scrolling-container-continuous">
        <div className="scrolling-text-continuous">
          {text}
          <span className="px-2">||</span>
          {text}
        </div>
      </div>
    </>
  );
};

export function MaintenancePage() {
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
    refreshData,
  } = useApp();

  const [activeTab, setActiveTab] = useState("camiao");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const [editType, setEditType] = useState<
    "km" | "horas" | "data"
  >("data");
  const [isLoading, setIsLoading] = useState(false);

  // ==================== PAGINAÇÃO ====================
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

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
          .filter((t) => t.proximaManutencaoKm)
          .map((t) => ({
            id: t.id,
            tipo: "camiao",
            nome: `${t.marca} ${t.modelo} (${t.matricula})`,
            manutencaoTipo: "km" as const,
            proximaManutencaoKm: t.proximaManutencaoKm || 0,
            proximaManutencaoHoras: 0,
            dataProximaManutencao: "",
          }));
      case "viatura":
        return vehicles
          .filter((v) => v.proximaManutencaoKm)
          .map((v) => ({
            id: v.id,
            tipo: "viatura",
            nome: `${v.marca} ${v.modelo} (${v.matricula})`,
            manutencaoTipo: "km" as const,
            proximaManutencaoKm: v.proximaManutencaoKm || 0,
            proximaManutencaoHoras: 0,
            dataProximaManutencao: "",
          }));
      case "maquina":
        return machines
          .filter(
            (m) =>
              m.proximaManutencaoKm ||
              m.proximaManutencaoHoras ||
              m.dataProximaManutencao,
          )
          .map((m) => {
            let tipo: "km" | "horas" | "data" = "data";
            if (m.proximaManutencaoKm) tipo = "km";
            else if (m.proximaManutencaoHoras) tipo = "horas";

            return {
              id: m.id,
              tipo: "maquina",
              nome: m.nome,
              manutencaoTipo: tipo,
              proximaManutencaoKm: m.proximaManutencaoKm || 0,
              proximaManutencaoHoras:
                m.proximaManutencaoHoras || 0,
              dataProximaManutencao:
                m.dataProximaManutencao || "",
            };
          });
      case "equipamento":
        return equipment
          .filter((e: any) => e.proximaManutencao)
          .map((e: any) => ({
            id: e.id,
            tipo: "equipamento",
            nome: e.nome,
            identificacao: e.identificacao || "",
            manutencaoTipo: "data" as const,
            proximaManutencaoKm: 0,
            proximaManutencaoHoras: 0,
            dataProximaManutencao: e.proximaManutencao || "",
          }));
      default:
        return [];
    }
  };

  const handleSave = async (itemId: string, item: any) => {
    if (!editValue) {
      alert("Introduza um valor");
      return;
    }

    setIsLoading(true);

    try {
      const updateData =
        item.manutencaoTipo === "km"
          ? { proximaManutencaoKm: parseInt(editValue) }
          : item.manutencaoTipo === "horas"
            ? {
                proximaManutencaoHoras: parseInt(editValue),
              }
            : { dataProximaManutencao: editValue };

      switch (item.tipo) {
        case "camiao":
          await updateTruck(itemId, updateData);
          break;
        case "viatura":
          await updateVehicle(itemId, updateData);
          break;
        case "maquina":
          await updateMachine(itemId, updateData);
          break;
        case "equipamento":
          await updateEquipment(itemId, updateData);
          break;
      }
      setEditingId(null);
      setEditValue("");
      await refreshData();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar manutenção");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (item: any) => {
    if (item.manutencaoTipo === "km") {
      const valor = item.proximaManutencaoKm;
      if (valor === 0)
        return <Badge className="bg-gray-600">Sem data</Badge>;
      return (
        <Badge className="bg-green-600">
          {valor.toLocaleString()} km
        </Badge>
      );
    } else if (item.manutencaoTipo === "horas") {
      const valor = item.proximaManutencaoHoras;
      if (valor === 0)
        return <Badge className="bg-gray-600">Sem data</Badge>;
      return (
        <Badge className="bg-green-600">
          {valor.toLocaleString()} h
        </Badge>
      );
    } else if (item.manutencaoTipo === "data") {
      if (!item.dataProximaManutencao)
        return <Badge className="bg-gray-600">Sem data</Badge>;

      const today = new Date();
      const manutencaoDate = new Date(
        item.dataProximaManutencao,
      );

      if (manutencaoDate < today) {
        return <Badge className="bg-red-600">Vencida</Badge>;
      } else if (
        manutencaoDate.getTime() - today.getTime() <
        30 * 24 * 60 * 60 * 1000
      ) {
        return (
          <Badge className="bg-orange-600">
            Próxima em breve
          </Badge>
        );
      } else {
        return <Badge className="bg-green-600">Válida</Badge>;
      }
    }
  };

  // ==================== FILTRAR ====================
  const allItems = getItemsForTab();

  const filteredItems = useMemo(() => {
    return allItems.filter(
      (item) =>
        item.nome
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        ((item as any).identificacao &&
          (item as any).identificacao
            .toLowerCase()
            .includes(searchTerm.toLowerCase())),
    );
  }, [allItems, searchTerm]);

  // ==================== PAGINAÇÃO ====================
  const totalPages = Math.ceil(
    filteredItems.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const getTabCount = (tabType: string) => {
    let items: any[] = [];
    switch (tabType) {
      case "camiao":
        items = trucks;
        break;
      case "viatura":
        items = vehicles;
        break;
      case "maquina":
        items = machines;
        break;
      case "equipamento":
        items = equipment;
        break;
    }
    return items.filter(
      (i: any) =>
        i.proximaManutencaoKm ||
        i.proximaManutencaoHoras ||
        i.dataProximaManutencao ||
        i.proximaManutencao,
    ).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Gestão de Manutenções
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acompanhar manutenções
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manutenções</CardTitle>
          {/* ==================== BARRA DE PESQUISA ====================  */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Pesquisar por nome, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
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
              setCurrentPage(1);
            }}
          >
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="camiao">
                Camiões ({getTabCount("camiao")})
              </TabsTrigger>
              <TabsTrigger value="viatura">
                Viaturas ({getTabCount("viatura")})
              </TabsTrigger>
              <TabsTrigger value="maquina">
                Máquinas ({getTabCount("maquina")})
              </TabsTrigger>
              <TabsTrigger value="equipamento">
                Equipamentos ({getTabCount("equipamento")})
              </TabsTrigger>
            </TabsList>

            {[
              "camiao",
              "viatura",
              "maquina",
              "equipamento",
            ].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>
                          Próxima Manutenção
                        </TableHead>
                        <TableHead>Estado</TableHead>
                        {canEdit && (
                          <TableHead>Ações</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={canEdit ? 4 : 3}
                            className="text-center text-gray-500 py-8"
                          >
                            Nenhum item encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <ConditionalScroll
                                  text={item.nome}
                                />
                                {(item as any)
                                  .identificacao && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ID:{" "}
                                    {
                                      (item as any)
                                        .identificacao
                                    }
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {editingId === item.id ? (
                                item.manutencaoTipo ===
                                "data" ? (
                                  <Input
                                    type="date"
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(
                                        e.target.value,
                                      )
                                    }
                                    className="w-40"
                                  />
                                ) : (
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(
                                        e.target.value,
                                      )
                                    }
                                    className="w-40"
                                  />
                                )
                              ) : item.manutencaoTipo ===
                                "km" ? (
                                `${item.proximaManutencaoKm.toLocaleString()} km`
                              ) : item.manutencaoTipo ===
                                "horas" ? (
                                `${item.proximaManutencaoHoras.toLocaleString()} h`
                              ) : (
                                new Date(
                                  item.dataProximaManutencao,
                                ).toLocaleDateString("pt-PT")
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(item)}
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                {editingId === item.id ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleSave(
                                          item.id,
                                          item,
                                        )
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
                                      setEditValue(
                                        item.manutencaoTipo ===
                                          "km"
                                          ? item.proximaManutencaoKm.toString()
                                          : item.manutencaoTipo ===
                                              "horas"
                                            ? item.proximaManutencaoHoras.toString()
                                            : item.dataProximaManutencao,
                                      );
                                      setEditType(
                                        item.manutencaoTipo,
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

                {/* ==================== CONTROLES DE PAGINAÇÃO ====================  */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Página {currentPage} de {totalPages} | A
                      mostrar {paginatedItems.length} de{" "}
                      {filteredItems.length} items
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2"
                      >
                        Próxima
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}