// src/app/pages/ManutencaoModal.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { useState } from "react";
import { Wrench } from "lucide-react";

interface ManutencaoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: { matricula?: string; marca?: string; modelo?: string };
  tipo: "viatura";
  onConfirm: (motivoManutencao: string) => void;
}

export function ManutencaoModal({
  isOpen,
  onOpenChange,
  item,
  onConfirm,
}: ManutencaoModalProps) {
  const [motivo, setMotivo] = useState("");

  const handleConfirm = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo.trim());
    setMotivo("");
  };

  const handleClose = () => {
    setMotivo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <Wrench className="w-5 h-5" />
            Colocar em Manutenção
          </DialogTitle>
          <DialogDescription>
            {item.marca} {item.modelo} —{" "}
            <span className="font-semibold">{item.matricula}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="motivoManutencao">
              Motivo / Descrição da Manutenção *
            </Label>
            <Input
              id="motivoManutencao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Substituição de óleo e filtros"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!motivo.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Confirmar Manutenção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}