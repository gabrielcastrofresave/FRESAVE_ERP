import { useState } from "react";
import { useApp } from "../AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Download, FileText } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type TableName =
  | "users"
  | "trucks"
  | "vehicles"
  | "machines"
  | "equipment"
  | "maintenances"
  | "tickets"
  | "avarias";

export function ExportModal({
  isOpen,
  onOpenChange,
}: ExportModalProps) {
  const {
    users,
    trucks,
    vehicles,
    machines,
    equipment,
    maintenances,
    tickets,
    avarias,
  } = useApp();

  const [selectedTable, setSelectedTable] =
    useState<TableName>("users");
  const [isExporting, setIsExporting] = useState(false);

  const tableOptions = [
    { value: "users", label: "Utilizadores" },
    { value: "trucks", label: "Camiões" },
    { value: "vehicles", label: "Viaturas" },
    { value: "machines", label: "Máquinas" },
    { value: "equipment", label: "Equipamentos" },
    { value: "maintenances", label: "Manutenções" },
    { value: "tickets", label: "Tickets" },
    { value: "avarias", label: "Avarias" },
  ];

  const getTableData = (table: TableName) => {
    switch (table) {
      case "users":
        return users;
      case "trucks":
        return trucks;
      case "vehicles":
        return vehicles;
      case "machines":
        return machines;
      case "equipment":
        return equipment;
      case "maintenances":
        return maintenances;
      case "tickets":
        return tickets;
      case "avarias":
        return avarias;
      default:
        return [];
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = getTableData(selectedTable);

      if (data.length === 0) {
        alert("Nenhum dado para exportar");
        setIsExporting(false);
        return;
      }

      // Criar CSV com BOM para UTF-8
      const BOM = "\uFEFF";
      const headers = Object.keys(data[0]);
      
      // Headers com separação clara
      let csv = BOM + headers.map((h) => `"${h}"`).join(";") + "\n";

      // Dados
      data.forEach((row: any) => {
        const values = headers.map((header) => {
          let value = row[header];

          // Formatar datas
          if (
            value instanceof Date ||
            (typeof value === "string" &&
              value.match(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
              ))
          ) {
            value = new Date(value).toLocaleDateString(
              "pt-PT"
            );
          }
          // Formatar booleanos
          else if (typeof value === "boolean") {
            value = value ? "Sim" : "Não";
          }
          // Escapar aspas
          else if (typeof value === "string") {
            value = value.replace(/"/g, '""');
          }

          return `"${value || ""}"`;
        });

        csv += values.join(";") + "\n";
      });

      // Download
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const tableLabel =
        tableOptions.find((t) => t.value === selectedTable)
          ?.label || selectedTable;
      const fileName = `${tableLabel}_${new Date()
        .toISOString()
        .split("T")[0]}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      alert("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };

  const dataCount = getTableData(selectedTable).length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Dados</DialogTitle>
          <DialogDescription>
            Escolha a tabela para exportar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tabela a Exportar
            </label>
            <Select
              value={selectedTable}
              onValueChange={(value) =>
                setSelectedTable(value as TableName)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tableOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-900 dark:text-blue-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>
                📥 {dataCount} registos prontos para exportar
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || dataCount === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}