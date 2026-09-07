// src/app/pages/InsurancePage.tsx - COMPLETO

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

export function InsurancePage() {
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
  const [editDate, setEditDate] = useState("");
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
          .filter((t) => t.dataSeguro)
          .map((t) => ({
            id: t.id,
            tipo: "camiao",
            nome: `${t.marca} ${t.modelo} (${t.matricula})`,
            dataSeguro: t.dataSeguro || "",
          }));
      case "viatura":
        return vehicles
          .filter((v) => v.dataSeguro)
          .map((v) => ({
            id: v.id,
            tipo: "viatura",
            nome: `${v.marca} ${v.modelo} (${v.matricula})`,
            dataSeguro: v.dataSeguro || "",
          }));
      case "maquina":
        return machines
          .filter((m) => m.dataSeguro)
          .map((m) => ({
            id: m.id,
            tipo: "maquina",
            nome: m.nome,
            marca: m.marca || "-", // ✅ ADICIONADO
            dataSeguro: m.dataSeguro || "",
          }));
      case "equipamento":
        return equipment
          .filter((e) => e.dataSeguro)
          .map((e) => ({
            id: e.id,
            tipo: "equipamento",
            nome: e.nome,
            dataSeguro: e.dataSeguro || "",
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
      // ✅ CORREÇÃO: Usar o nome exato da coluna na Base de Dados
      const payload = { insurance_validity: editDate }; 

      console.log(`Atualizando ${activeTab} ${itemId} com:`, payload);

      switch (activeTab) {
        case "camiao":
          await updateTruck(itemId, payload as any);
          break;
        case "viatura":
          await updateVehicle(itemId, payload as any);
          break;
        case "maquina":
          await updateMachine(itemId, payload as any);
          break;
        case "equipamento":
          await updateEquipment(itemId, payload as any);
          break;
      }
      
      setEditingId(null);
      setEditDate("");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshData();
      
      alert("Seguro atualizado com sucesso!");

    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar. Verifique a consola.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (dataSeguro: string) => {
    if (!dataSeguro) {
      return <Badge className="bg-gray-600">Sem data</Badge>;
    }

    const today = new Date();
    const seguroDate = new Date(dataSeguro);
    const daysLeft = Math.floor(
      (seguroDate.getTime() - today.getTime()) /
        (1000 * 3600 * 24),
    );

    if (daysLeft < 0) {
      return (
        <Badge className="bg-red-600">
          Expirado ({Math.abs(daysLeft)} dias atrás)
        </Badge>
      );
    } else if (daysLeft < 30) {
      return (
        <Badge className="bg-orange-600">
          Expira em {daysLeft} dias
        </Badge>
      );
    } else {
      return <Badge className="bg-green-600">Válido</Badge>;
    }
  };

  // ==================== FILTRAR ====================
  const allItems = getItemsForTab();

  const filteredItems = allItems.filter((item) =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Gestão de Seguros
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acompanhar seguros dos camiões, viaturas, máquinas e
          equipamentos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seguros</CardTitle>
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
                Camiões (
                {trucks.filter((t) => t.dataSeguro).length})
              </TabsTrigger>
              <TabsTrigger value="viatura">
                Viaturas (
                {vehicles.filter((v) => v.dataSeguro).length})
              </TabsTrigger>
              <TabsTrigger value="maquina">
                Máquinas (
                {machines.filter((m) => m.dataSeguro).length})
              </TabsTrigger>
              <TabsTrigger value="equipamento">
                Equipamentos (
                {equipment.filter((e) => e.dataSeguro).length})
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
                        {tab === "maquina" && (
                          <TableHead>Marca</TableHead>
                        )}
                        <TableHead>Validade Seguro</TableHead>
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
                            colSpan={
                              canEdit
                                ? tab === "maquina"
                                  ? 5
                                  : 4
                                : tab === "maquina"
                                  ? 4
                                  : 3
                            }
                            className="text-center text-gray-500 py-8"
                          >
                            Nenhum item encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <ConditionalScroll
                                text={item.nome}
                              />
                            </TableCell>
                            {tab === "maquina" && (
                              <TableCell>
                                <ConditionalScroll
                                  text={item.marca}
                                />
                              </TableCell>
                            )}
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
                              ) : item.dataSeguro ? (
                                new Date(
                                  item.dataSeguro,
                                ).toLocaleDateString("pt-PT")
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(item.dataSeguro)}
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
                                        item.dataSeguro || "",
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