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

interface InsuranceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insurance: any | null;
  onComplete?: (insurance: any) => void;
}

export function InsuranceDetailsModal({
  isOpen,
  onClose,
  insurance,
  onComplete,
}: InsuranceDetailsModalProps) {
  if (!insurance) return null;

  const today = new Date();
  const endDate = new Date(insurance.dataFim);
  let status = 'Válido';
  let statusClass = 'bg-green-600';

  if (endDate < today) {
    status = 'Vencido';
    statusClass = 'bg-red-600';
  } else if (
    endDate.getTime() - today.getTime() <
    30 * 24 * 60 * 60 * 1000
  ) {
    status = 'Expira em breve';
    statusClass = 'bg-orange-600';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Seguro</DialogTitle>
          <DialogDescription>
            {insurance.truckName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Camião</p>
              <p className="text-lg">{insurance.truckName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Segurado</p>
              <p className="text-lg">{insurance.segurado}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Apólice</p>
              <p className="text-lg">{insurance.numeroApolice}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Preço</p>
              <p className="text-lg">{insurance.preco.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Data Início</p>
              <p className="text-lg">
                {new Date(insurance.dataInicio).toLocaleDateString('pt-PT')}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Data Fim</p>
              <p className="text-lg">
                {new Date(insurance.dataFim).toLocaleDateString('pt-PT')}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Estado</p>
              <Badge className={statusClass}>{status}</Badge>
            </div>
          </div>

          {insurance.descricao && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Descrição</p>
              <p className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                {insurance.descricao}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X size={16} />
              Fechar
            </Button>
            {onComplete && (
              <Button
                onClick={() => onComplete(insurance)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} />
                Renovar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}