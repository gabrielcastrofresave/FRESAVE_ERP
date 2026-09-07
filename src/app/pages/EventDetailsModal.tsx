import { useState } from 'react';
import { useApp } from '../AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Trash2 } from 'lucide-react';
import { User } from '../types';

interface EventDetailsModalProps {
  event: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUser: User | null;
}

export function EventDetailsModal({
  event,
  isOpen,
  onOpenChange,
  onSuccess,
  currentUser
}: EventDetailsModalProps) {
  const { updateCalendarEvent, deleteCalendarEvent, refreshData } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    utilizador: event?.utilizador || '',
    local: event?.local || '',
    hora: event?.hora || '09:00',
  });

  //******************************************PERMISSÕES******************************************

  const canCreate =
    currentUser?.role === "administrador" ||     
    currentUser?.role === "gestor";

  const canEdit =
    currentUser?.role === "administrador" ||
    currentUser?.role === "gestor" ||
    currentUser?.role === "paineis" ||
    currentUser?.role === "mecanico";

  //***********************************************************************************************

  const handleUpdate = async () => {
    if (!formData.utilizador || !formData.local) {
      alert('Preencha todos os campos!');
      return;
    }

    setLoading(true);
    try {
      await updateCalendarEvent(event.id, {
        ...event,
        utilizador: formData.utilizador,
        local: formData.local,
        hora: formData.hora,
      });
      await refreshData();
      setIsEditing(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem a certeza que quer eliminar este evento?')) return;

    setLoading(true);
    try {
      await deleteCalendarEvent(event.id);
      await refreshData();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao eliminar:', error);
      alert('Erro ao eliminar evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Evento' : event?.titulo}
          </DialogTitle>
          <DialogDescription>
            {new Date(event?.data).toLocaleDateString('pt-PT')} às {event?.hora}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="utilizador">Utilizador</Label>
                <Input
                  id="utilizador"
                  value={formData.utilizador}
                  onChange={(e) => setFormData({ ...formData, utilizador: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Utilizador</Label>
                <p className="text-sm">{event?.utilizador}</p>
              </div>

              <div className="space-y-2">
                <Label>Local</Label>
                <p className="text-sm">{event?.local}</p>
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                <p className="text-sm">{event?.hora}</p>
              </div>
            </>
          )}

          {/* Botões apenas para quem pode criar */}
          {canCreate && (
            <div className="flex gap-2 pt-4">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleUpdate}
                    disabled={loading}
                  >
                    {loading ? 'A guardar...' : 'Guardar'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(true)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Mensagem para quem só pode editar */}
          {canEdit && !canCreate && (
            <p className="text-sm text-gray-500 text-center pt-4">
              Apenas administradores e gestores podem editar eventos
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}