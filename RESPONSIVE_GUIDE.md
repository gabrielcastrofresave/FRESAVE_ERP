# Guia de Responsividade - Intranet Electrominho

## ✅ Componentes Criados

### 1. **PageHeader** (`/src/app/components/PageHeader.tsx`)
Componente para headers de página responsivos.

```tsx
import { PageHeader } from "@/app/components/PageHeader";

<PageHeader 
  title="Gestão de Camiões"
  description="Gerir frota de camiões"
  action={
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Adicionar
    </Button>
  }
/>
```

### 2. **ResponsiveTable** (`/src/app/components/ResponsiveTable.tsx`)
Wrapper para tornar tabelas scrollable horizontalmente em mobile.

```tsx
import { ResponsiveTable } from "@/app/components/ResponsiveTable";

<ResponsiveTable>
  <Table>
    {/* conteúdo da tabela */}
  </Table>
</ResponsiveTable>
```

### 3. **ResponsiveFormGrid** (`/src/app/components/ResponsiveFormGrid.tsx`)
Grid responsivo para formulários (1 coluna mobile, 2 colunas desktop).

```tsx
import { ResponsiveFormGrid } from "@/app/components/ResponsiveFormGrid";

<ResponsiveFormGrid>
  <div className="space-y-2">
    <Label>Campo 1</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Campo 2</Label>
    <Input />
  </div>
</ResponsiveFormGrid>
```

## 📱 Classes Responsivas Tailwind

### Breakpoints
- `sm:` - 640px (mobile landscape / small tablet)
- `md:` - 768px (tablet)
- `lg:` - 1024px (desktop)
- `xl:` - 1280px (large desktop)

### Padrões de Uso

#### Spacing (espaçamento)
```tsx
<div className="space-y-4 md:space-y-6"> {/* mais espaço em desktop */}
<div className="p-3 sm:p-4 md:p-6"> {/* padding progressivo */}
<div className="gap-3 md:gap-4"> {/* gaps menores em mobile */}
```

#### Typography (tipografia)
```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl"> {/* títulos escaláveis */}
<p className="text-sm md:text-base"> {/* texto normal responsivo */}
<Label className="text-sm md:text-base"> {/* labels */}
```

#### Layout
```tsx
{/* Stack vertical em mobile, horizontal em desktop */}
<div className="flex flex-col sm:flex-row sm:justify-between gap-3">

{/* Grid responsivo */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

{/* Largura total em mobile, auto em desktop */}
<Button className="w-full sm:w-auto">
```

#### Visibilidade
```tsx
{/* Esconder em mobile, mostrar em desktop */}
<div className="hidden lg:block">

{/* Mostrar em mobile, esconder em desktop */}
<div className="block lg:hidden">
```

## 🎨 Padrões Específicos por Componente

### Cards de Estatísticas (Dashboard)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
  <Card>
    <CardContent className="p-4 md:p-6">
      {/* conteúdo */}
    </CardContent>
  </Card>
</div>
```

### Tabelas
```tsx
<Card>
  <CardHeader className="pb-3 md:pb-6">
    <CardTitle className="text-base md:text-lg">Título</CardTitle>
  </CardHeader>
  <CardContent className="pt-0">
    <ResponsiveTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm">Coluna</TableHead>
            {/* Esconder colunas menos importantes em mobile */}
            <TableHead className="hidden lg:table-cell">Extra Info</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="text-sm">
            <TableCell>Valor</TableCell>
            <TableCell className="hidden lg:table-cell">Detalhes</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </ResponsiveTable>
  </CardContent>
</Card>
```

### Modais / Dialogs
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto mx-2">
  <DialogHeader>
    <DialogTitle className="text-lg md:text-xl">Título</DialogTitle>
    <DialogDescription className="text-sm">Descrição</DialogDescription>
  </DialogHeader>
  
  <form className="space-y-4 md:space-y-6">
    <ResponsiveFormGrid>
      {/* campos do formulário */}
    </ResponsiveFormGrid>
    
    {/* Botões do formulário */}
    <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
      <Button variant="outline" className="w-full sm:w-auto">
        Cancelar
      </Button>
      <Button type="submit" className="w-full sm:w-auto">
        Salvar
      </Button>
    </div>
  </form>
</DialogContent>
```

### Search / Filtros
```tsx
<div className="relative">
  <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
  <Input
    placeholder="Pesquisar..."
    className="pl-8 md:pl-10 text-sm md:text-base"
  />
</div>
```

### Badges
```tsx
<Badge className="text-xs whitespace-nowrap">Status</Badge>
```

### Ações / Botões em Tabelas
```tsx
<div className="flex gap-1 md:gap-2 flex-wrap">
  <Button variant="ghost" size="sm" className="text-xs md:text-sm">
    <Pencil className="w-3 h-3 md:w-4 md:h-4" />
    <span className="hidden sm:inline ml-1">Editar</span>
  </Button>
</div>
```

## 📋 Checklist para Tornar uma Página Responsiva

### Header da Página
- [ ] Usar `PageHeader` component ou aplicar classes flex responsivas
- [ ] Títulos com tamanhos escaláveis (`text-2xl sm:text-3xl lg:text-4xl`)
- [ ] Botões de ação com `w-full sm:w-auto`
- [ ] Espaçamento `gap-3 md:gap-4`

### Cards e Listas
- [ ] Grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- [ ] Padding responsivo (`p-4 md:p-6`)
- [ ] CardTitle com tamanho responsivo (`text-base md:text-lg`)

### Tabelas
- [ ] Envolver em `<ResponsiveTable>`
- [ ] Texto menor (`text-sm`)
- [ ] Esconder colunas secundárias em mobile (`hidden lg:table-cell`)
- [ ] Ações compactas com ícones

### Formulários/Modais
- [ ] DialogContent com largura responsiva
- [ ] Usar `ResponsiveFormGrid` para campos
- [ ] Labels com texto responsivo
- [ ] Botões stack vertical em mobile, horizontal em desktop
- [ ] Espaçamento entre seções (`space-y-4 md:space-y-6`)

### Gráficos
- [ ] ResponsiveContainer height adaptável
- [ ] Labels com fontSize reduzido em mobile
- [ ] Gráficos em grid responsivo

## 🚀 Exemplo Completo: Página de Gestão

```tsx
import { PageHeader } from "@/app/components/PageHeader";
import { ResponsiveTable } from "@/app/components/ResponsiveTable";
import { ResponsiveFormGrid } from "@/app/components/ResponsiveFormGrid";

export function ExamplePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <PageHeader 
        title="Gestão de Items"
        description="Gerir items do sistema"
        action={
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        }
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Cards de stats */}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">Lista</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Pesquisar..." 
              className="pl-10 text-sm md:text-base"
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

      {/* Modal */}
      <Dialog>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto mx-2">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Formulário</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 md:space-y-6">
            <ResponsiveFormGrid>
              {/* Campos */}
            </ResponsiveFormGrid>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
              <Button variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## 🎯 Prioridades de Implementação

1. **Alta Prioridade**
   - DashboardPage (já implementado ✅)
   - Layout principal (já implementado ✅)
   - TrucksPage
   - VehiclesPage
   - EquipmentPage
   - MachinesPage

2. **Média Prioridade**
   - CalendarPage
   - TicketsPage
   - UsersPage
   - MaintenancePage
   - InsurancePage
   - InspectionPage

3. **Baixa Prioridade**
   - Modais específicos
   - Páginas de detalhes
   - Páginas administrativas secundárias

## 📝 Notas Importantes

- **Sempre testar** em diferentes tamanhos de tela durante o desenvolvimento
- **Priorizar conteúdo**: Esconder informações secundárias em mobile
- **Touch targets**: Botões devem ter pelo menos 44x44px em mobile
- **Evitar hover-only**: Em mobile, interações hover não funcionam
- **Performance**: Imagens e gráficos devem ser otimizados para mobile
