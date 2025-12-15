"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  User,
  UserCheck,
  Mail,
  Phone,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  full_name: string;
  email: string | null; // Email pode não estar disponível se não estiver na tabela profiles
  phone: string | null;
  role: string;
  created_at: string;
  doctor?: {
    crm: string;
    specialty: string;
    is_approved: boolean;
  } | null;
}

export default function AdminUsersPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    role: "patient" as "patient" | "doctor" | "admin" | "attendant",
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      // Buscar perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Erro ao buscar perfis:", profilesError);
        throw profilesError;
      }

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        return;
      }

      // Filtrar por role se necessário
      let filtered = profilesData || [];
      if (roleFilter !== "all") {
        filtered = filtered.filter((u) => u.role === roleFilter);
      }

      // Buscar dados de médicos para usuários que são médicos
      const doctorIds = filtered
        .filter((u) => u.role === "doctor")
        .map((u) => u.id);
      let doctorsMap = new Map();

      if (doctorIds.length > 0) {
        const { data: doctorsData, error: doctorsError } = await supabase
          .from("doctors")
          .select("id, crm, specialty, is_approved")
          .in("id", doctorIds);

        if (doctorsError) {
          console.error("Erro ao buscar médicos:", doctorsError);
          // Continuar mesmo se houver erro ao buscar médicos
        } else {
          doctorsMap = new Map(
            (doctorsData || []).map((d) => [
              d.id,
              {
                crm: d.crm,
                specialty: d.specialty,
                is_approved: d.is_approved,
              },
            ])
          );
        }
      }

      // Combinar dados
      const usersWithDoctors = filtered.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: null, // Email não está na tabela profiles
        phone: profile.phone,
        role: profile.role,
        created_at: profile.created_at,
        doctor: doctorsMap.get(profile.id) || null,
      }));

      setUsers(usersWithDoctors);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      // Mostrar erro mais detalhado
      if (error.message) {
        console.error("Mensagem de erro:", error.message);
      }
      if (error.details) {
        console.error("Detalhes:", error.details);
      }
      if (error.hint) {
        console.error("Dica:", error.hint);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveDoctor(userId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("doctors")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Médico aprovado com sucesso",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao aprovar médico:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar médico",
        variant: "destructive",
      });
    }
  }

  function handleEditUser(user: User) {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.role as "patient" | "doctor" | "admin" | "attendant",
    });
    setIsEditDialogOpen(true);
  }

  async function handleUpdateUser() {
    if (!editingUser) {
      // Criar novo usuário
      if (!editForm.full_name || !editForm.role) {
        toast({
          title: "Erro",
          description: "Nome e role são obrigatórios",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `temp-${Date.now()}@example.com`, // Email temporário
            password: "TempPassword123!", // Senha temporária
            full_name: editForm.full_name,
            phone: editForm.phone || null,
            role: editForm.role,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erro ao criar usuário");
        }

        toast({
          title: "Sucesso",
          description:
            "Usuário criado com sucesso. O usuário precisará definir email e senha.",
        });

        setIsEditDialogOpen(false);
        setEditForm({ full_name: "", phone: "", role: "patient" });
        fetchUsers();
      } catch (error: any) {
        console.error("Erro ao criar usuário:", error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar usuário",
          variant: "destructive",
        });
      }
      return;
    }

    // Atualizar usuário existente
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone || null,
          role: editForm.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    }
  }

  function handleDeleteClick(user: User) {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;

    try {
      // Deletar o usuário do auth (isso também deleta o profile devido ao CASCADE)
      const { error: authError } = await supabase.auth.admin.deleteUser(
        userToDelete.id
      );

      if (authError) {
        // Se não conseguir deletar do auth, tentar deletar apenas o profile
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userToDelete.id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Sucesso",
        description: "Usuário deletado com sucesso",
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      toast({
        title: "Erro",
        description:
          error.message ||
          "Erro ao deletar usuário. Você pode não ter permissão para deletar usuários do auth.",
        variant: "destructive",
      });
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const roleLabels = {
    patient: "Paciente",
    doctor: "Médico",
    admin: "Administrador",
    attendant: "Atendente",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          Gestão de Usuários
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Visualize e gerencie todos os usuários da plataforma
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
            >
              <option value="all">Todas as roles</option>
              <option value="patient">Pacientes</option>
              <option value="doctor">Médicos</option>
              <option value="admin">Administradores</option>
              <option value="attendant">Atendentes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Botão Criar Usuário */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingUser(null);
            setEditForm({
              full_name: "",
              phone: "",
              role: "patient",
            });
            setIsEditDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Usuário
        </Button>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{user.full_name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      {user.email && (
                        <>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      {user.phone && (
                        <>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        Cadastrado em{" "}
                        {format(new Date(user.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {user.doctor && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline">
                          CRM: {user.doctor.crm} - {user.doctor.specialty}
                        </Badge>
                        {!user.doctor.is_approved && (
                          <Badge variant="destructive">
                            Pendente Aprovação
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Badge className="text-xs sm:text-sm">
                      {roleLabels[user.role as keyof typeof roleLabels] ||
                        user.role}
                    </Badge>
                    {user.doctor && !user.doctor.is_approved && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveDoctor(user.id)}
                        className="text-xs sm:text-sm"
                      >
                        <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Aprovar</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="flex-1 sm:flex-initial"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="sm:hidden">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(user)}
                      className="flex-1 sm:flex-initial"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="sm:hidden">Deletar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Criar Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize as informações do usuário"
                : "Crie um novo usuário na plataforma"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm({
                    ...editForm,
                    role: value as "patient" | "doctor" | "admin" | "attendant",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Paciente</SelectItem>
                  <SelectItem value="doctor">Médico</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="attendant">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>
              {editingUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o usuário{" "}
              <strong>{userToDelete?.full_name}</strong>? Esta ação não pode ser
              desfeita e também deletará todas as informações relacionadas ao
              usuário.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
