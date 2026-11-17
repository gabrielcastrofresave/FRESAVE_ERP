// src/app/pages/UsersPage.tsx
import { useState } from "react";
import { useApp } from "../AppContext";
import { User, UserRole } from "../types";
import { authAPI } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
} from "lucide-react";
import { ExportModal } from "./ExportModal";

export function UsersPage() {
  const { users, updateUser, deleteUser, currentUser } =
    useApp();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    numero: "",
    role: "camionista" as UserRole,
    ativo: true,
  });

  const canCreate = currentUser?.role === "administrador";
  const canEdit = currentUser?.role === "administrador";

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      senha: "",
      numero: "",
      role: "camionista",
      ativo: true,
    });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        await authAPI.updateUser(editingUser.id, {
          nome: formData.nome,
          numero: formData.numero,
          role: formData.role,
          ativo: formData.ativo,
        });
        updateUser(editingUser.id, {
          nome: formData.nome,
          numero: formData.numero,
          role: formData.role,
          ativo: formData.ativo,
        });
        alert("✅ Utilizador atualizado com sucesso!");
      } else {
        if (!formData.senha) {
          alert("⚠️ Defina uma senha");
          setIsLoading(false);
          return;
        }
        await authAPI.signup({
          email: formData.email,
          senha: formData.senha,
          nome: formData.nome,
          numero: formData.numero,
          role: formData.role,
        });
        alert(`✅ Utilizador ${formData.nome} criado!`);
      }

      resetForm();
      window.location.reload();
    } catch (error: any) {
      alert(
        "❌ Erro: " + (error.message || "Erro desconhecido"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: "",
      numero: user.numero || "",
      role: user.role,
      ativo: user.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert("Não pode eliminar o seu próprio utilizador!");
      return;
    }
    if (
      confirm(
        "Tem certeza que deseja eliminar este utilizador?",
      )
    ) {
      deleteUser(id);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.nome
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, string> = {
      administrador: "bg-red-500",
      escritorio: "bg-red-500",
      projeto: "bg-purple-500",
      chefe_producao: "bg-orange-500",
      producao: "bg-green-500",
    };
    const labels: Record<UserRole, string> = {
      administrador: "Administrador",
      escritorio: "Escritório",
      projeto: "Projeto",
      chefe_producao: "Chefe de Produção",
      producao: "Produção",
    };
    return (
      <Badge className={variants[role]}>{labels[role]}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Gestão de Utilizadores</h1>
          <p className="text-gray-600">
            Gerir utilizadores do sistema
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsExportOpen(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>

              <Dialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Utilizador
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingUser
                        ? "Editar Utilizador"
                        : "Adicionar Utilizador"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUser
                        ? "Atualize os detalhes do utilizador"
                        : "Adicione um novo utilizador"}
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nome: e.target.value,
                          })
                        }
                        placeholder="Nome completo"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                        placeholder="email@exemplo.com"
                        disabled={isLoading || !!editingUser}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero">
                        Nº Funcionário
                      </Label>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            numero: e.target.value,
                          })
                        }
                        placeholder="Número de funcionário"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha *</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={formData.senha}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            senha: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        required={!editingUser}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Perfil *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            role: value as UserRole,
                          })
                        }
                      >
                        <SelectTrigger disabled={isLoading}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administrador">
                            Administrador
                          </SelectItem>
                          <SelectItem value="escritorio">
                            Escritório
                          </SelectItem>
                          <SelectItem value="projeto">
                            Projeto
                          </SelectItem>
                          <SelectItem value="chefe_producao">
                            Chefe de Produção
                          </SelectItem>
                          <SelectItem value="producao">
                            Produção
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ativo">Ativo</Label>
                      <Switch
                        id="ativo"
                        checked={formData.ativo}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            ativo: checked,
                          })
                        }
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading
                          ? "Processando..."
                          : editingUser
                            ? "Atualizar"
                            : "Adicionar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Utilizadores</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nº Funcionário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.nome}</TableCell>
                  <TableCell>{user.email || "-"}</TableCell>
                  <TableCell>{user.numero || "-"}</TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.ativo
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }
                    >
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          disabled={isLoading}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(user.id)}
                          disabled={
                            user.id === currentUser?.id ||
                            isLoading
                          }
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="text-center text-gray-500"
                  >
                    Nenhum utilizador encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExportModal
        isOpen={isExportOpen}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}