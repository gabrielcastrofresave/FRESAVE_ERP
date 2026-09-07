import { useState } from 'react';
import { UserRole } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';

const PAGES = [
  'Dashboard', 'Camiões', 'Viaturas', 'Máquinas', 'Equipamentos',
  'Calendário', 'Manutenções', 'Seguros', 'Inspeções', 'Tickets',
  'Avarias', 'Utilizadores'
];

const ROLES: UserRole[] = ['administrador', 'gestor', 'camionista', 'painéis', 'mecanico', 'colaborador'];

const PERMISSION_LEVELS = [
  { value: 'nada', label: 'Sem Acesso' },
  { value: 'ler', label: 'Ler' },
  { value: 'ler_editar', label: 'Ler e Editar' },
  { value: 'criar_ler', label: 'Criar e Ler' }
];

export function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('colaborador');
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  const handlePermissionChange = (page: string, value: string) => {
    setPermissions(prev => ({
      ...prev,
      [page]: value
    }));
  };

  const handleSave = () => {
    console.log(`Permissões para ${selectedRole}:`, permissions);
    alert('Permissões guardadas com sucesso!');
  };

  const isAdminSelected = selectedRole === 'administrador';

  return (
    <div className="space-y-6">
      <div>
        <h1>Gerir Permissões</h1>
        <p className="text-gray-600">Defina permissões para cada perfil</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <label className="text-sm font-medium">Selecionar Perfil</label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                      {role === 'administrador' && ' (Tudo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdminSelected && (
              <Badge className="bg-red-500 mt-6">Admin vê tudo</Badge>
            )}
          </div>
        </CardHeader>

        {!isAdminSelected && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página/Secção</TableHead>
                  <TableHead>Permissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PAGES.map((page) => (
                  <TableRow key={page}>
                    <TableCell className="font-medium">{page}</TableCell>
                    <TableCell>
                      <Select 
                        value={permissions[page] || 'nada'}
                        onValueChange={(value) => handlePermissionChange(page, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline">Cancelar</Button>
              <Button onClick={handleSave}>Guardar Permissões</Button>
            </div>
          </CardContent>
        )}

        {isAdminSelected && (
          <CardContent className="text-center py-8 text-gray-500">
            O perfil Administrador tem acesso total a todas as páginas e funcionalidades.
          </CardContent>
        )}
      </Card>
    </div>
  );
}