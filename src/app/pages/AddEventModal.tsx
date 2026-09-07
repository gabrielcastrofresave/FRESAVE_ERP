import { useState } from 'react';
import { useApp } from '../AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus, AlertTriangle } from 'lucide-react';
import { canScheduleForDate, getBlockReason } from '../utils/validations';

interface AddEventModalProps {
  item: any;
  day: Date;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEventModal({ 
  item, 
  day, 
  isOpen, 
  onOpenChange,
  onSuccess 
}: AddEventModalProps) {
  const { 
    users, 
    currentUser,
    addCalendarEvent, 
    addTruckSchedule,
    addVehicleSchedule,
    addMachineSchedule,
    refreshData 
  } = useApp();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({ local: '', hora: '09:00' });
  const [loading, setLoading] = useState(false);

  // Verifica se pode agendar para esta data
  const dateString = day.toISOString().split('T')[0];
  const canSchedule = canScheduleForDate(item, dateString);
  const blockReason = getBlockReason(item);

  // ✅ DETECTAR TIPO DO ITEM
  const getItemType = () => {
    // Se tem "truck-" no ID, é camião
    if (item.id && item.id.toString().startsWith('truck-')) {
      return 'truck';
    }
    // Se tem "vehicle-" no ID, é veículo
    if (item.id && item.id.toString().startsWith('vehicle-')) {
      return 'vehicle';
    }
    // Se tem "machine-" no ID, é máquina
    if (item.id && item.id.toString().startsWith('machine-')) {
      return 'machine';
    }
    // Fallback: verifica se tem nome ou matricula
    if (item.matricula && item.tipo) {
      return 'truck'; // Camiões têm matricula e tipo
    }
    return 'machine'; // Default
  };

  const handleSubmit = async () => {
    if (!canSchedule) {
      alert('Não é possível agendar para esta data. ' + (blockReason || ''));
      return;
    }

    if (!selectedUser || !formData.local) {
      alert('Preencha todos os campos!');
      return;
    }

    setLoading(true);
    try {
      const itemType = getItemType();
      const scheduleData = {
        data: dateString,
        utilizador: selectedUser.nome,
        local: formData.local,
        descricao: `${formData.local} - ${formData.hora}`,
        userId: currentUser?.id || selectedUser.id,
      };

      // ✅ USAR A API CORRETA BASEADO NO TIPO
      if (itemType === 'truck') {
        await addTruckSchedule({
          ...scheduleData,
          truckId: item.id,
        });
      } else if (itemType === 'vehicle') {
        await addVehicleSchedule({
          ...scheduleData,
          vehicleId: item.id,
        });
      } else if (itemType === 'machine') {
        await addMachineSchedule({
          ...scheduleData,
          machineId: item.id,
        });
      }
      
      // Recarrega os dados
      await refreshData();
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao adicionar agendamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs w-full">
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Agendamento</DialogTitle>
          <DialogDescription>
            Preencha os dados do agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!canSchedule && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100 text-sm">
                    Agendamento Bloqueado
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {blockReason || 'Não é possível agendar para esta data'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-600">
              {day.toLocaleDateString('pt-PT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Utilizador / Condutor *</Label>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <p className="font-semibold">{user.nome}</p>
                  <p className="text-xs opacity-75">{user.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora">Hora *</Label>
            <Input
              id="hora"
              type="time"
              value={formData.hora}
              onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local *</Label>
            <Input
              id="local"
              placeholder="ex: Lisboa, Porto, Braga..."
              value={formData.local}
              onChange={(e) => setFormData({ ...formData, local: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}