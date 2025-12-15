import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Buscar disponibilidade do médico
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

    // Verificar se é médico
    if (profile?.role !== "doctor") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas médicos." },
        { status: 403 }
      );
    }

    // Buscar disponibilidade semanal
    const { data: availability, error: availabilityError } = await supabase
      .from("doctor_availability")
      .select("*")
      .eq("doctor_id", user.id)
      .order("day_of_week", { ascending: true });

    if (availabilityError) throw availabilityError;

    // Buscar datas bloqueadas
    const { data: blockedDates, error: blockedError } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("doctor_id", user.id)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (blockedError) throw blockedError;

    return NextResponse.json({
      availability: availability || [],
      blockedDates: blockedDates || [],
    });
  } catch (error: any) {
    console.error("Erro ao buscar disponibilidade:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar disponibilidade" },
      { status: 500 }
    );
  }
}

// POST/PUT - Salvar disponibilidade do médico
export async function POST(request: NextRequest) {
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

    if (profile?.role !== "doctor") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas médicos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { availability, blockedDates } = body;

    // Validar dados
    if (!availability || !Array.isArray(availability)) {
      return NextResponse.json(
        { error: "Dados de disponibilidade inválidos" },
        { status: 400 }
      );
    }

    // Deletar disponibilidade existente
    await supabase
      .from("doctor_availability")
      .delete()
      .eq("doctor_id", user.id);

    // Inserir nova disponibilidade
    const availabilityToInsert = availability.map((avail: any) => ({
      doctor_id: user.id,
      day_of_week: avail.day_of_week,
      start_time: avail.start_time,
      end_time: avail.end_time,
      is_available: avail.is_available !== false,
    }));

    const { error: insertError } = await supabase
      .from("doctor_availability")
      .insert(availabilityToInsert);

    if (insertError) throw insertError;

    // Se houver datas bloqueadas, processá-las
    if (blockedDates && Array.isArray(blockedDates)) {
      // Deletar datas bloqueadas existentes
      await supabase
        .from("blocked_dates")
        .delete()
        .eq("doctor_id", user.id);

      // Inserir novas datas bloqueadas
      if (blockedDates.length > 0) {
        const blockedToInsert = blockedDates.map((blocked: any) => ({
          doctor_id: user.id,
          date: blocked.date,
          reason: blocked.reason || null,
        }));

        const { error: blockedError } = await supabase
          .from("blocked_dates")
          .insert(blockedToInsert);

        if (blockedError) throw blockedError;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Disponibilidade salva com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao salvar disponibilidade:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao salvar disponibilidade" },
      { status: 500 }
    );
  }
}


