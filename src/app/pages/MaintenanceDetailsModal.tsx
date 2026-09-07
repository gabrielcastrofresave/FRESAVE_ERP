import { Maintenance } from '../types';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { CheckCircle, X } from 'lucide-react';

interface MaintenanceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance: Maintenance | null;
  onComplete?: (maintenance: Maintenance) => void;
}

export function MaintenanceDetailsModal({
  isOpen,
  onClose,
  maintenance,
  onComplete,
}: MaintenanceDetailsModalProps) {
  if (!maintenance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Manutenção</DialogTitle>
          <DialogDescription>
            {maintenance.itemNome}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Tipo</p>
              <p className="text-lg">
                {maintenance.tipo === 'camiao' ? 'Camião' : 'Equipamento'}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Item</p>
              <p className="text-lg">{maintenance.itemNome}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Data</p>
              <p className="text-lg">
                {new Date(maintenance.data).toLocaleDateString('pt-PT')}
              </p>
            </div>
            {maintenance.tipo === 'camiao' && (
              <div>
                <p className="text-sm font-semibold text-gray-600">KM</p>
                <p className="text-lg">
                  {maintenance.kmRealizacao?.toLocaleString()} km
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-600">Custo</p>
              <p className="text-lg">{maintenance.custo.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Mecânico</p>
              <p className="text-lg">{maintenance.mecanico || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Estado</p>
              <Badge
                className={
                  maintenance.realizado
                    ? 'bg-green-500'
                    : 'bg-orange-500'
                }
              >
                {maintenance.realizado ? 'Realizado' : 'Pendente'}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600">Descrição</p>
            <p className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded">
              {maintenance.descricao}
            </p>
          </div>

          <div className="flex gap-2 pt-4 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X size={16} />
              Fechar
            </Button>
            {onComplete && !maintenance.realizado && (
              <Button
                onClick={() => onComplete(maintenance)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} />
                Concluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}