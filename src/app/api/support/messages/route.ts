import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Enviar mensagem em um ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { ticket_id, message } = await request.json();

    if (!ticket_id || !message) {
      return NextResponse.json(
        { error: "ID do ticket e mensagem são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso ao ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Verificar permissão: usuário do ticket ou atendente/admin
    if (
      ticket.user_id !== user.id &&
      profile?.role !== "attendant" &&
      profile?.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    // Criar mensagem
    const { data: newMessage, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id,
        sender_id: user.id,
        message,
      })
      .select(`
        *,
        sender:profiles!support_messages_sender_id_fkey (
          id,
          full_name
        )
      `)
      .single();

    if (messageError) throw messageError;

    // Atualizar status do ticket para "in_progress" se estava "open"
    if (ticket.status === "open") {
      await supabase
        .from("support_tickets")
        .update({ status: "in_progress" })
        .eq("id", ticket_id);
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}

