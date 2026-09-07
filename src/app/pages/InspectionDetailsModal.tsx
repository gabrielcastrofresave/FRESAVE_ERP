// src/app/components/modals/InspectionDetailsModal.tsx
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { CheckCircle, X, Calendar, AlertTriangle, Check } from "lucide-react";

// Interface genérica para aceitar dados da InspectionPage (Camiões, Viaturas, Máquinas, etc.)
export interface InspectionData {
  id: string;
  nome: string;           // Unificado (antes era truckName)
  tipo?: string;          // 'camiao', 'viatura', 'maquina', 'equipamento'
  dataInspecao: string;   // A data de validade (proximaInspecao)
  
  // Campos opcionais (podem vir do histórico de inspeções detalhado)
  dataRealizacao?: string;
  resultado?: "aprovado" | "reprovado" | "condicional";
  observacoes?: string;
  tipoInspecao?: string;
}

interface InspectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InspectionData | null; // Renomeado de 'inspection' para 'data'
  onComplete?: (data: InspectionData) => void;
}

export function InspectionDetailsModal({
  isOpen,
  onClose,
  data,
  onComplete,
}: InspectionDetailsModalProps) {
  if (!data) return null;

  // Lógica de Status (Baseada na data de validade)
  const today = new Date();
  // Se não houver data, assume data futura longínqua para não dar erro
  const nextDate = data.dataInspecao ? new Date(data.dataInspecao) : new Date(8640000000000000); 
  
  let status = "Válida";
  let statusClass = "bg-green-600 hover:bg-green-700";
  let statusIcon = <Check className="w-3 h-3 mr-1" />;

  if (!data.dataInspecao) {
    status = "Sem Data";
    statusClass = "bg-gray-500 hover:bg-gray-600";
    statusIcon = <AlertTriangle className="w-3 h-3 mr-1" />;
  } else if (nextDate < today) {
    status = "Vencida";
    statusClass = "bg-red-600 hover:bg-red-700";
    statusIcon = <X className="w-3 h-3 mr-1" />;
  } else if (
    nextDate.getTime() - today.getTime() <
    30 * 24 * 60 * 60 * 1000
  ) {
    status = "Expira em Breve";
    statusClass = "bg-orange-600 hover:bg-orange-700";
    statusIcon = <AlertTriangle className="w-3 h-3 mr-1" />;
  }

  // Configuração de Badges de Resultado (se existirem)
  const resultadoVariants: { [key: string]: string } = {
    aprovado: "bg-green-600",
    reprovado: "bg-red-600",
    condicional: "bg-yellow-600",
  };

  const resultadoLabels: { [key: string]: string } = {
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    condicional: "Condicional",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Inspeção
            {data.tipo && (
              <Badge variant="outline" className="uppercase text-xs">
                {data.tipo}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Estado atual e informações de validade para {data.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SECÇÃO PRINCIPAL: INFO E ESTADO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Item / Veículo</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.nome}</p>
              </div>
              
              {/* Só mostra tipo de inspeção se existir (ex: IPO B, Periódica) */}
              {data.tipoInspecao && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Inspeção</p>
                  <p className="text-base">{data.tipoInspecao}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Validade / Próxima Inspeção</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-lg font-mono">
                    {data.dataInspecao 
                      ? new Date(data.dataInspecao).toLocaleDateString("pt-PT")
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Estado da Validade</p>
                <Badge className={`${statusClass} flex w-fit items-center`}>
                  {statusIcon} {status}
                </Badge>
              </div>
            </div>
          </div>

          {/* SECÇÃO SECUNDÁRIA: RESULTADOS (Só renderiza se houver dados detalhados) */}
          {(data.resultado || data.dataRealizacao) && (
            <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-4">
              {data.dataRealizacao && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Realizada em</p>
                  <p className="text-base">
                    {new Date(data.dataRealizacao).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              )}
              
              {data.resultado && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resultado Última Inspeção</p>
                  <Badge className={resultadoVariants[data.resultado] || "bg-gray-500"}>
                    {resultadoLabels[data.resultado] || data.resultado}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* OBSERVAÇÕES */}
          {data.observacoes && (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Observações</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                "{data.observacoes}"
              </p>
            </div>
          )}
        </div>

        {/* RODAPÉ: AÇÕES */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Fechar
          </Button>
          
          {onComplete && (
            <Button
              onClick={() => onComplete(data)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Agendar / Renovar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}