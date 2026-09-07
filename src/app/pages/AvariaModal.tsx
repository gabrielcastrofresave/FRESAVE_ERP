import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface AvariaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  tipo: "camiao" | "equipamento";
  onConfirm: (motivoAvaria: string) => Promise<void>;
}

export function AvariaModal({
  isOpen,
  onOpenChange,
  item,
  tipo,
  onConfirm,
}: AvariaModalProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      alert("Por favor, descreva o motivo da avaria");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(motivo);
      setMotivo("");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao registrar avaria:", error);
      alert("Erro ao registrar avaria");
    } finally {
      setLoading(false);
    }
  };

  const itemNome =
    tipo === "camiao" ? item.matricula : item.nome;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle>
                Registrar Avaria / Manutenção Urgente
              </DialogTitle>
              <DialogDescription>
                {tipo === "camiao" ? "Camião" : "Equipamento"}:{" "}
                {itemNome}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Atenção:</strong> Ao registrar uma avaria,
              este{" "}
              {tipo === "camiao" ? "camião" : "equipamento"}
              ficará <strong>bloqueado</strong> e não será
              possível fazer novos agendamentos até a avaria ser
              resolvida.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo da Avaria / Manutenção *
            </Label>
            <Textarea
              id="motivo"
              placeholder="Descreva detalhadamente o problema encontrado..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setMotivo("");
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "A registrar..." : "Registrar Avaria"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}