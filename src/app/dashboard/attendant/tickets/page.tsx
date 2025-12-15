"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
  };
  assigned_to_profile?: {
    full_name: string;
  } | null;
}

export default function AttendantTicketsPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const response = await fetch("/api/support/tickets");
      const data = await response.json();
      if (response.ok) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Erro ao buscar tickets:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Status atualizado",
        });
        fetchTickets();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao atualizar status");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusConfig = {
    open: { label: "Aberto", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
    in_progress: {
      label: "Em Andamento",
      color: "bg-yellow-100 text-yellow-700",
      icon: Clock,
    },
    resolved: {
      label: "Resolvido",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    },
    closed: {
      label: "Fechado",
      color: "bg-gray-100 text-gray-700",
      icon: XCircle,
    },
  };

  const priorityConfig = {
    low: { label: "Baixa", color: "bg-gray-100 text-gray-700" },
    medium: { label: "Média", color: "bg-blue-100 text-blue-700" },
    high: { label: "Alta", color: "bg-orange-100 text-orange-700" },
    urgent: { label: "Urgente", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciar Tickets</h1>
        <p className="text-gray-500">
          Visualize e gerencie todos os tickets de suporte
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por assunto ou usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Carregando tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status as keyof typeof statusConfig]?.icon || AlertCircle;
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition"
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/attendant/tickets/${ticket.id}`}>
                        <h3 className="font-semibold truncate hover:text-orange-600 cursor-pointer">
                          {ticket.subject}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span>{ticket.user.full_name}</span>
                        <span>•</span>
                        <span>
                          {format(
                            new Date(ticket.created_at),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                        {ticket.assigned_to_profile && (
                          <>
                            <span>•</span>
                            <span>
                              Atribuído a: {ticket.assigned_to_profile.full_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          priorityConfig[ticket.priority as keyof typeof priorityConfig]?.color ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {priorityConfig[ticket.priority as keyof typeof priorityConfig]?.label || ticket.priority}
                      </Badge>
                      <Badge
                        className={
                          statusConfig[ticket.status as keyof typeof statusConfig]?.color ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
                      </Badge>
                      <Link href={`/dashboard/attendant/tickets/${ticket.id}`}>
                        <Button variant="outline" size="sm">
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

