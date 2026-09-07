import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface CompleteInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: any | null;
  onSubmit: (nextDate: string) => void;
}

export function CompleteInspectionModal({
  isOpen,
  onClose,
  inspection,
  onSubmit,
}: CompleteInspectionModalProps) {
  const [nextDate, setNextDate] = useState('');

  if (!inspection) return null;

  const handleSubmit = () => {
    if (!nextDate.trim()) {
      alert('Por favor preencha a data');
      return;
    }
    onSubmit(nextDate);
    setNextDate('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Próxima Inspeção</DialogTitle>
          <DialogDescription>
            Defina a data da próxima inspeção
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {inspection.truckName}
            </p>
            <p className="text-sm font-semibold mb-4">
              Inspeção {inspection.tipoInspecao}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextDate">
              Data da Próxima Inspeção *
            </Label>
            <Input
              id="nextDate"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
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