import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Search,
  AlertTriangle,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type SortField =
  | 'itemNome'
  | 'tipo'
  | 'motivoAvaria'
  | 'status'
  | 'dataRegisto'
  | 'dataResolucao';
type SortDirection = 'asc' | 'desc';

const TIPO_LABELS: Record<string, string> = {
  camiao: 'Camião',
  viatura: 'Viatura',
  maquina: 'Máquina',
  equipamento: 'Equipamento',
};

const TIPO_COLORS: Record<string, string> = {
  camiao: 'bg-blue-500',
  viatura: 'bg-teal-500',
  maquina: 'bg-indigo-500',
  equipamento: 'bg-purple-500',
};

export function AvariaHistoryPage() {
  const {
    avarias,
    resolveAvaria,
    updateTruck,
    updateVehicle,
    updateMachine,
    updateEquipment,
    currentUser,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'todas' | 'aberta' | 'resolvida'
  >('todas');
  const [typeFilter, setTypeFilter] = useState<
    'todas' | 'camiao' | 'viatura' | 'maquina' | 'equipamento'
  >('todas');
  const [sortField, setSortField] = useState<SortField>('dataRegisto');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailAvaria, setDetailAvaria] = useState<any>(null);

  //******************************************PERMISSÕES******************************************
  const canEdit =
    currentUser?.role === 'administrador' ||
    currentUser?.role === 'gestor' ||
    currentUser?.role === 'mecanico';
  //***********************************************************************************************

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline" />
    );
  };

  const SortableHead = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {children}
      {getSortIcon(field)}
    </TableHead>
  );

  const filteredAndSortedAvarias = useMemo(() => {
    return avarias
      .filter((avaria) => {
        const matchesSearch =
          avaria.itemNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          avaria.motivoAvaria?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === 'todas' || avaria.status === statusFilter;
        const matchesType =
          typeFilter === 'todas' || avaria.tipo === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'itemNome':
            comparison = (a.itemNome ?? '').localeCompare(b.itemNome ?? '');
            break;
          case 'tipo':
            comparison = (TIPO_LABELS[a.tipo] ?? '').localeCompare(
              TIPO_LABELS[b.tipo] ?? '',
            );
            break;
          case 'motivoAvaria':
            comparison = (a.motivoAvaria ?? '').localeCompare(
              b.motivoAvaria ?? '',
            );
            break;
          case 'status':
            comparison = (a.status ?? '').localeCompare(b.status ?? '');
            break;
          case 'dataRegisto':
            comparison =
              new Date(a.dataRegisto).getTime() -
              new Date(b.dataRegisto).getTime();
            break;
          case 'dataResolucao':
            comparison =
              new Date(a.dataResolucao ?? 0).getTime() -
              new Date(b.dataResolucao ?? 0).getTime();
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [avarias, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

  // ✅ RESOLUÇÃO DIRETA SEM CAIXA DE TEXTO
  const handleResolveDirectly = async (avaria: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // 1. Resolve a avaria no histórico imediatamente com texto por defeito
      await resolveAvaria(avaria.id, "Resolvida diretamente");
      
      // 2. Atualiza o veículo/equipamento associado para "disponível"
      const updateData = { status: 'disponivel', em_avaria: false, motivo_avaria: '' } as any;
      
      switch (avaria.tipo) {
        case 'camiao':
          await updateTruck(avaria.itemId, updateData);
          break;
        case 'viatura':
          await updateVehicle(avaria.itemId, updateData);
          break;
        case 'maquina':
          await updateMachine(avaria.itemId, updateData);
          break;
        case 'equipamento':
          await updateEquipment(avaria.itemId, updateData);
          break;
      }
    } catch (error) {
      console.error('Erro ao resolver avaria:', error);
      alert('Erro ao resolver avaria');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return <Badge className="bg-red-500">Aberta</Badge>;
      case 'resolvida':
        return <Badge className="bg-green-500">Resolvida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => (
    <Badge className={TIPO_COLORS[type] || 'bg-gray-500'}>
      {TIPO_LABELS[type] || type}
    </Badge>
  );

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Avarias</h1>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">
              Não tem permissão para aceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Avarias</h1>
        <p className="text-gray-600">
          Visualize todas as avarias registadas no sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Pesquisar por item ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as 'todas' | 'aberta' | 'resolvida')
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os Status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="resolvida">Resolvida</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(
              value as
                | 'todas'
                | 'camiao'
                | 'viatura'
                | 'maquina'
                | 'equipamento',
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os Tipos</SelectItem>
            <SelectItem value="camiao">Camiões</SelectItem>
            <SelectItem value="viatura">Viaturas</SelectItem>
            <SelectItem value="maquina">Máquinas</SelectItem>
            <SelectItem value="equipamento">Equipamentos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Total de Avarias: {filteredAndSortedAvarias.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedAvarias.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma avaria encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="itemNome">Item</SortableHead>
                    <SortableHead field="tipo">Tipo</SortableHead>
                    <SortableHead field="motivoAvaria">Motivo</SortableHead>
                    <SortableHead field="status">Status</SortableHead>
                    <SortableHead field="dataRegisto">
                      Data Registo
                    </SortableHead>
                    <SortableHead field="dataResolucao">
                      Data Resolução
                    </SortableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAvarias.map((avaria) => (
                    <TableRow
                      key={avaria.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setDetailAvaria(avaria);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        {avaria.itemNome}
                      </TableCell>
                      <TableCell>{getTypeBadge(avaria.tipo)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {avaria.motivoAvaria}
                      </TableCell>
                      <TableCell>{getStatusBadge(avaria.status)}</TableCell>
                      <TableCell>
                        {new Date(avaria.dataRegisto).toLocaleDateString(
                          'pt-PT',
                        )}
                      </TableCell>
                      <TableCell>
                        {avaria.dataResolucao
                          ? new Date(avaria.dataResolucao).toLocaleDateString(
                              'pt-PT',
                            )
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {avaria.status === 'aberta' ? (
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => handleResolveDirectly(avaria, e)}
                          >
                            <Check className="w-4 h-4" />
                            Resolver
                          </Button>
                        ) : (
                          <span className="text-xs text-green-600 font-semibold">
                            ✓ Resolvida
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes da Avaria */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              Detalhes da Avaria - {detailAvaria?.itemNome}
            </DialogTitle>
            <DialogDescription>
              Informações completas da avaria
            </DialogDescription>
          </DialogHeader>
          {detailAvaria && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Item</p>
                  <p className="font-semibold mt-1">{detailAvaria.itemNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-semibold mt-1">
                    {getTypeBadge(detailAvaria.tipo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold mt-1">
                    {getStatusBadge(detailAvaria.status)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Data de Registo
                  </p>
                  <p className="font-semibold mt-1">
                    {new Date(detailAvaria.dataRegisto).toLocaleDateString(
                      'pt-PT',
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Data de Resolução
                  </p>
                  <p className="font-semibold mt-1">
                    {detailAvaria.dataResolucao
                      ? new Date(detailAvaria.dataResolucao).toLocaleDateString(
                          'pt-PT',
                        )
                      : '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Motivo da Avaria
                  </p>
                  <p className="font-semibold mt-1 whitespace-pre-wrap">
                    {detailAvaria.motivoAvaria || '-'}
                  </p>
                </div>
                {detailAvaria.resolucao && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Resolução</p>
                    <p className="font-semibold mt-1 whitespace-pre-wrap">
                      {detailAvaria.resolucao}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={() => setIsDetailDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}