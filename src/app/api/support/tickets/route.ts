import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Listar tickets
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let query = supabase
      .from("support_tickets")
      .select(
        `
        *,
        user:profiles!support_tickets_user_id_fkey (
          id,
          full_name
        ),
        assigned_to_profile:profiles!support_tickets_assigned_to_fkey (
          id,
          full_name
        )
      `
      )
      .order("created_at", { ascending: false });

    // Garantir que assigned_to seja null se não estiver definido

    // Se for atendente ou admin, pode ver todos
    // Se for paciente/médico, só vê os próprios
    if (profile?.role !== "attendant" && profile?.role !== "admin") {
      query = query.eq("user_id", user.id);
    }

    const { data: tickets, error } = await query;

    if (error) throw error;

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error("Erro ao buscar tickets:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar tickets" },
      { status: 500 }
    );
  }
}

// POST - Criar novo ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { subject, priority, message } = await request.json();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Assunto e mensagem são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        priority: priority || "medium",
        status: "open",
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Criar primeira mensagem
    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message,
      });

    if (messageError) throw messageError;

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar ticket:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar ticket" },
      { status: 500 }
    );
  }
}
