# 📋 Snippets Prontos - Responsividade

Copie e cole estes snippets para tornar páginas responsivas rapidamente.

## 🎨 Layout de Página Completo

```tsx
import { PageHeader } from "@/app/components/PageHeader";
import { ResponsiveTable } from "@/app/components/ResponsiveTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Search, Plus } from "lucide-react";

export function MyResponsivePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            Título da Página
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Descrição da página
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* SEARCH */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">
            Lista de Items ({items.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Pesquisar..."
              className="pl-8 md:pl-10 text-sm md:text-base"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveTable>
            <Table>
              {/* Conteúdo da tabela */}
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 📊 Grid de Cards de Estatísticas

```tsx
// Cards responsivos 1-2-3-4 colunas
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
  {stats.map((stat, index) => {
    const Icon = stat.icon;
    return (
      <Card key={index}>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                {stat.title}
              </p>
              <p className="text-2xl md:text-3xl mt-1 md:mt-2 font-semibold">
                {stat.value}
              </p>
            </div>
            <div className={`${stat.color} w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ml-2`}>
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  })}
</div>
```

## 📋 Tabela Responsiva Completa

```tsx
import { ResponsiveTable } from "@/app/components/ResponsiveTable";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/app/components/ui/table";

<ResponsiveTable>
  <Table>
    <TableHeader>
      <TableRow>
        {/* Colunas sempre visíveis */}
        <TableHead className="text-xs md:text-sm">Nome</TableHead>
        <TableHead className="text-xs md:text-sm">Status</TableHead>
        
        {/* Colunas escondidas em mobile */}
        <TableHead className="hidden lg:table-cell text-xs md:text-sm">
          Data Criação
        </TableHead>
        <TableHead className="hidden lg:table-cell text-xs md:text-sm">
          Responsável
        </TableHead>
        
        {/* Ações */}
        <TableHead className="text-xs md:text-sm text-right">
          Ações
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item.id} className="text-sm">
          <TableCell className="font-medium">{item.name}</TableCell>
          <TableCell>
            <Badge className="text-xs">{item.status}</Badge>
          </TableCell>
          <TableCell className="hidden lg:table-cell text-xs md:text-sm">
            {new Date(item.createdAt).toLocaleDateString('pt-PT')}
          </TableCell>
          <TableCell className="hidden lg:table-cell text-xs md:text-sm">
            {item.owner}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex gap-1 md:gap-2 justify-end flex-wrap">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline ml-1 text-xs">Editar</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline ml-1 text-xs">Eliminar</span>
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</ResponsiveTable>
```

## 📝 Modal/Dialog Responsivo

```tsx
import { ResponsiveFormGrid } from "@/app/components/ResponsiveFormGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto mx-2">
    <DialogHeader>
      <DialogTitle className="text-lg md:text-xl">
        {editing ? "Editar Item" : "Criar Item"}
      </DialogTitle>
      <DialogDescription className="text-sm">
        Preencha os dados do formulário
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {/* SECÇÃO 1 */}
      <div>
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
          Informações Básicas
        </h3>
        <ResponsiveFormGrid>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm md:text-base">
              Nome *
            </Label>
            <Input
              id="name"
              placeholder="Digite o nome"
              className="text-sm md:text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm md:text-base">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              className="text-sm md:text-base"
              required
            />
          </div>
        </ResponsiveFormGrid>
      </div>

      {/* SECÇÃO 2 */}
      <div>
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
          Detalhes Adicionais
        </h3>
        <ResponsiveFormGrid>
          {/* Mais campos */}
        </ResponsiveFormGrid>
      </div>

      {/* BOTÕES */}
      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto text-sm md:text-base"
          onClick={() => setIsOpen(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto bg-blue-600 text-sm md:text-base"
        >
          {editing ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

## 🔍 Search Bar Responsivo

```tsx
<div className="relative w-full">
  <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
  <Input
    placeholder="Pesquisar por nome, email ou ID..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-8 md:pl-10 text-sm md:text-base w-full"
  />
</div>
```

## 🎯 Filtros Múltiplos Responsivos

```tsx
<div className="flex flex-col sm:flex-row gap-2 md:gap-3 flex-wrap">
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
    <Input
      placeholder="Pesquisar..."
      className="pl-8 md:pl-10 text-sm md:text-base"
    />
  </div>
  
  <Select>
    <SelectTrigger className="w-full sm:w-[180px] text-sm md:text-base">
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="active">Activos</SelectItem>
      <SelectItem value="inactive">Inativos</SelectItem>
    </SelectContent>
  </Select>

  <Select>
    <SelectTrigger className="w-full sm:w-[180px] text-sm md:text-base">
      <SelectValue placeholder="Tipo" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="type1">Tipo 1</SelectItem>
      <SelectItem value="type2">Tipo 2</SelectItem>
    </SelectContent>
  </Select>

  <Button variant="outline" className="w-full sm:w-auto text-sm md:text-base">
    <X className="w-4 h-4 mr-2" />
    Limpar Filtros
  </Button>
</div>
```

## 📊 Gráfico Responsivo

```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<Card>
  <CardHeader>
    <CardTitle className="text-base md:text-lg">
      Gráfico de Dados
    </CardTitle>
  </CardHeader>
  <CardContent className="pt-0">
    <div className="w-full h-[200px] md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11 }} 
            className="text-xs md:text-sm"
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            className="text-xs md:text-sm"
          />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
```

## 🏷️ Badges e Status Responsivos

```tsx
// Badge simples
<Badge className="text-xs whitespace-nowrap">
  Status
</Badge>

// Badge com ícone
<Badge className="text-xs whitespace-nowrap flex items-center gap-1">
  <AlertTriangle className="w-3 h-3" />
  <span className="hidden sm:inline">Atenção Necessária</span>
  <span className="sm:hidden">Atenção</span>
</Badge>

// Status com cores
const getStatusBadge = (status: string) => {
  const config = {
    active: { color: 'bg-green-500', label: 'Ativo' },
    inactive: { color: 'bg-gray-500', label: 'Inativo' },
    pending: { color: 'bg-yellow-500', label: 'Pendente' },
    error: { color: 'bg-red-500', label: 'Erro' },
  };
  
  const { color, label } = config[status] || config.inactive;
  
  return (
    <Badge className={`${color} text-white text-xs whitespace-nowrap`}>
      {label}
    </Badge>
  );
};
```

## 🎬 Ações em Linha (Botões de Ação)

```tsx
// Ações compactas em tabela
<div className="flex gap-1 md:gap-2 justify-end">
  <Button 
    variant="ghost" 
    size="sm" 
    className="h-8 px-2 text-xs md:text-sm"
  >
    <Pencil className="w-3 h-3 md:w-4 md:h-4" />
    <span className="hidden md:inline ml-1">Editar</span>
  </Button>
  <Button 
    variant="ghost" 
    size="sm" 
    className="h-8 px-2 text-xs md:text-sm text-red-600"
  >
    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
    <span className="hidden md:inline ml-1">Eliminar</span>
  </Button>
</div>

// Ações com dropdown para mobile
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm" className="h-8 px-2">
      <MoreVertical className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>
      <Pencil className="w-4 h-4 mr-2" />
      Editar
    </DropdownMenuItem>
    <DropdownMenuItem className="text-red-600">
      <Trash2 className="w-4 h-4 mr-2" />
      Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## 📅 Data e Hora Responsivos

```tsx
// Data completa em desktop, abreviada em mobile
<div>
  <span className="hidden md:inline">
    {new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}
  </span>
  <span className="md:hidden text-xs">
    {new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })}
  </span>
</div>

// Timestamp relativo
<p className="text-xs md:text-sm text-gray-500">
  Há {getRelativeTime(date)}
</p>
```

## 🎨 Seções Colapsáveis (Mobile)

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const [isExpanded, setIsExpanded] = useState(false);

<div className="md:block">
  <button
    onClick={() => setIsExpanded(!isExpanded)}
    className="flex items-center gap-2 w-full md:hidden mb-2"
  >
    {isExpanded ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronRight className="w-4 h-4" />
    )}
    <span className="text-sm font-semibold">Detalhes Adicionais</span>
  </button>
  
  <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>
    {/* Conteúdo que fica colapsado em mobile */}
  </div>
</div>
```

## 💡 Dicas de Uso

1. **Copy-paste direto**: Estes snippets são prontos para usar
2. **Ajuste conforme necessário**: Adapte cores, tamanhos e espaçamentos
3. **Combine snippets**: Use múltiplos snippets na mesma página
4. **Teste sempre**: Verifique em diferentes tamanhos de tela
5. **Mantenha consistência**: Use os mesmos padrões em toda aplicação

## 📚 Referências Rápidas

- Ver `/RESPONSIVE_GUIDE.md` para guia completo
- Ver `/RESPONSIVE_SUMMARY.md` para resumo executivo
- Componentes: `/src/app/components/PageHeader.tsx`, `ResponsiveTable.tsx`, `ResponsiveFormGrid.tsx`
- Estilos globais: `/src/styles/responsive.css`
