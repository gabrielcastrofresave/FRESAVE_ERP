import { useState } from 'react';
import { Maintenance } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface CompleteMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance: Maintenance | null;
  onSubmit: (nextValue: number | string) => void;
}

export function CompleteMaintenanceModal({
  isOpen,
  onClose,
  maintenance,
  onSubmit,
}: CompleteMaintenanceModalProps) {
  const [nextValue, setNextValue] = useState('');

  if (!maintenance) return null;

  const isTruck = maintenance.tipo === 'camiao';
  const isDate = !isTruck;

  const handleSubmit = () => {
    if (!nextValue.trim()) {
      alert('Por favor preencha o campo');
      return;
    }
    onSubmit(nextValue);
    setNextValue('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Concluir Manutenção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {maintenance.itemNome}
            </p>
            <p className="text-sm font-semibold mb-4">
              Manutenção do {isTruck ? 'Camião' : 'Equipamento'} concluída!
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextValue">
              {isTruck 
                ? 'Próximos KM para Manutenção *' 
                : 'Próxima Data de Revisão *'}
            </Label>
            <Input
              id="nextValue"
              type={isTruck ? 'number' : 'date'}
              value={nextValue}
              onChange={(e) => setNextValue(e.target.value)}
              placeholder={isTruck ? 'ex: 50000' : ''}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}