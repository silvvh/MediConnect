import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Buscar ticket específico com mensagens
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } | Promise<{ ticketId: string }> }
) {
  try {
    // Resolver params se for Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const ticketId = resolvedParams.ticketId;

    // Validar ticketId ANTES de usar
    if (!ticketId || typeof ticketId !== 'string' || ticketId.trim() === '' || ticketId === 'undefined') {
      return NextResponse.json(
        { error: "ID do ticket inválido" },
        { status: 400 }
      );
    }

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

    // Buscar ticket
    let ticketQuery = supabase
      .from("support_tickets")
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey (
          id,
          full_name
        ),
        assigned_to_profile:profiles!support_tickets_assigned_to_fkey (
          id,
          full_name
        )
      `)
      .eq("id", ticketId)
      .single();

    // Se não for atendente/admin, só pode ver seus próprios tickets
    if (profile?.role !== "attendant" && profile?.role !== "admin") {
      ticketQuery = ticketQuery.eq("user_id", user.id);
    }

    const { data: ticket, error: ticketError } = await ticketQuery;

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    // Buscar mensagens
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(`
        *,
        sender:profiles!support_messages_sender_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({ ticket, messages });
  } catch (error: any) {
    console.error("Erro ao buscar ticket:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar ticket" },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar ticket (status, atribuição, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ticketId: string } | Promise<{ ticketId: string }> }
) {
  try {
    // Resolver params se for Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const ticketId = resolvedParams.ticketId;

    // Validar ticketId ANTES de usar
    if (!ticketId || typeof ticketId !== 'string' || ticketId.trim() === '' || ticketId === 'undefined') {
      return NextResponse.json(
        { error: "ID do ticket inválido" },
        { status: 400 }
      );
    }

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

    // Apenas atendentes e admins podem atualizar tickets
    if (profile?.role !== "attendant" && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, assigned_to, priority } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    // Tratar assigned_to corretamente: null, string vazia ou undefined devem ser null
    if (assigned_to !== undefined) {
      // Se for string "undefined", null, ou vazio, definir como null
      if (assigned_to === null || assigned_to === "" || assigned_to === "undefined" || assigned_to === undefined) {
        updateData.assigned_to = null;
      } else {
        // Validar se é um UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(assigned_to)) {
          updateData.assigned_to = assigned_to;
        } else {
          return NextResponse.json(
            { error: "assigned_to deve ser um UUID válido ou null" },
            { status: 400 }
          );
        }
      }
    }
    if (priority) updateData.priority = priority;

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", ticketId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error("Erro ao atualizar ticket:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar ticket" },
      { status: 500 }
    );
  }
}

