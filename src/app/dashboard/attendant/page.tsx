"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

export default function AttendantDashboard() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const response = await fetch("/api/support/tickets");
      const data = await response.json();
      if (response.ok) {
        setTickets(data.tickets || []);
        
        // Calcular estatísticas
        const open = data.tickets?.filter((t: Ticket) => t.status === "open").length || 0;
        const inProgress = data.tickets?.filter((t: Ticket) => t.status === "in_progress").length || 0;
        const resolved = data.tickets?.filter((t: Ticket) => t.status === "resolved").length || 0;
        
        setStats({
          open,
          inProgress,
          resolved,
          total: data.tickets?.length || 0,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar tickets:", error);
    } finally {
      setLoading(false);
    }
  }

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
      icon: CheckCircle,
    },
  };

  const priorityConfig = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard de Atendimento</h1>
        <p className="text-gray-500">
          Gerencie tickets e forneça suporte aos usuários
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Tickets</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Abertos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Resolvidos</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Recentes */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Tickets Recentes</CardTitle>
          <Link href="/dashboard/attendant/tickets">
            <Button variant="outline" size="sm">
              Ver Todos
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.slice(0, 10).map((ticket) => {
                const StatusIcon = statusConfig[ticket.status as keyof typeof statusConfig]?.icon || AlertCircle;
                return (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/attendant/tickets/${ticket.id}`}
                  >
                    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition cursor-pointer">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {ticket.subject}
                        </h3>
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
                          <span>•</span>
                          <span>
                            Prioridade: {priorityConfig[ticket.priority as keyof typeof priorityConfig]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            statusConfig[ticket.status as keyof typeof statusConfig]?.color ||
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

