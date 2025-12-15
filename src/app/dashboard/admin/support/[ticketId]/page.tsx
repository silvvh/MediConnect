"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
  };
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

export default function AdminSupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getCurrentUser() {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }

    // Validar ticketId antes de buscar
    const ticketId = Array.isArray(params.ticketId)
      ? params.ticketId[0]
      : params.ticketId;

    if (ticketId && ticketId.trim() !== "") {
      getCurrentUser();
      fetchTicket();
    } else {
      toast({
        title: "Erro",
        description: "ID do ticket inválido",
        variant: "destructive",
      });
      router.push("/dashboard/admin/support");
    }
  }, [params.ticketId]);

  async function fetchTicket() {
    // Obter ticketId (pode ser string ou array)
    const ticketId = Array.isArray(params.ticketId)
      ? params.ticketId[0]
      : params.ticketId;

    // Validar ticketId
    if (!ticketId || ticketId.trim() === "") {
      toast({
        title: "Erro",
        description: "ID do ticket inválido",
        variant: "destructive",
      });
      router.push("/dashboard/admin/support");
      return;
    }

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await response.json();
      if (response.ok) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Ticket não encontrado",
          variant: "destructive",
        });
        router.push("/dashboard/admin/support");
      }
    } catch (error) {
      console.error("Erro ao buscar ticket:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;

    // Obter ticketId (pode ser string ou array)
    const ticketId = Array.isArray(params.ticketId)
      ? params.ticketId[0]
      : params.ticketId;

    // Validar ticketId
    if (!ticketId || ticketId.trim() === "") {
      toast({
        title: "Erro",
        description: "ID do ticket inválido",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticketId,
          message: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
        fetchTicket(); // Atualizar status do ticket
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar mensagem");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    // Obter ticketId (pode ser string ou array)
    const ticketId = Array.isArray(params.ticketId)
      ? params.ticketId[0]
      : params.ticketId;

    // Validar ticketId
    if (!ticketId || ticketId.trim() === "") {
      toast({
        title: "Erro",
        description: "ID do ticket inválido",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
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
        fetchTicket();
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
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link href="/dashboard/admin/support">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 break-words">
            {ticket.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              {ticket.user.full_name}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
            <span className="hidden sm:inline">•</span>
            <Badge className="text-xs">{ticket.status}</Badge>
            <Badge variant="outline" className="text-xs">
              {ticket.priority}
            </Badge>
          </div>
        </div>
        <Select
          value={ticket.status}
          onValueChange={handleUpdateStatus}
          disabled={updating}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {messages.map((message) => {
              const isOwnMessage = message.sender.id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      isOwnMessage
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {message.sender.full_name}
                    </div>
                    <div className="whitespace-pre-wrap">{message.message}</div>
                    <div
                      className={`text-xs mt-2 ${
                        isOwnMessage ? "text-purple-100" : "text-gray-500"
                      }`}
                    >
                      {format(
                        new Date(message.created_at),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {ticket.status !== "closed" && (
            <div className="flex gap-2 pt-4 border-t">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                size="lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
