import { NextRequest, NextResponse } from "next/server";
import { dailyClient } from "@/lib/video/daily-client";
import { createClient } from "@/lib/supabase/server";

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

// POST: Criar sala de videochamada
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { appointmentId } = await request.json();

    // Verificar se usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Buscar dados do agendamento
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, scheduled_at, status, video_room_url")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verificar se usuário tem permissão (paciente ou médico da consulta)
    if (
      appointment.patient_id !== user.id &&
      appointment.doctor_id !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Se já existe sala, retornar
    if (appointment.video_room_url) {
      const roomName = appointment.video_room_url.split("/").pop() || "";
      return NextResponse.json({
        roomUrl: appointment.video_room_url,
        roomName,
      });
    }

    // Criar sala no Daily.co
    const roomName = `appointment-${appointmentId}`;
    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: "cloud", // Habilitar gravação na nuvem
          max_participants: 2,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60, // Expira em 4 horas
        },
      }),
    });

    if (!dailyResponse.ok) {
      const errorData = await dailyResponse.json();
      console.error("Daily.co error:", errorData);
      return NextResponse.json(
        { error: "Failed to create room" },
        { status: 500 }
      );
    }

    const roomData = await dailyResponse.json();

    // Atualizar appointment com URL da sala
    await supabase
      .from("appointments")
      .update({
        video_room_url: roomData.url,
        status: "in_progress",
      })
      .eq("id", appointmentId);

    return NextResponse.json({
      roomUrl: roomData.url,
      roomName: roomData.name,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Deletar sala após consulta
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get("roomName");

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name required" },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete room");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}

