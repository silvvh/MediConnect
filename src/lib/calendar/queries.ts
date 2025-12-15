import { createClient } from "@/lib/supabase/client";
import { format, getDay, startOfMonth, endOfMonth } from "date-fns";
import type { Availability, TimeSlot } from "./types";

export async function getDoctorAvailability(
  doctorId: string,
  date: Date
): Promise<{ slots: TimeSlot[]; isBlocked: boolean }> {
  const supabase = createClient();
  const dayOfWeek = getDay(date);
  const dateString = format(date, "yyyy-MM-dd");

  // Verificar se o dia está bloqueado
  const { data: blockedDates } = await supabase
    .from("doctor_blocked_dates")
    .select("*")
    .eq("doctor_id", doctorId)
    .lte("start_date", dateString)
    .gte("end_date", dateString);

  if (blockedDates && blockedDates.length > 0) {
    return { slots: [], isBlocked: true };
  }

  // Buscar disponibilidade padrão do dia da semana
  const { data: availability } = await supabase
    .from("doctor_availability")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  // Buscar slots específicos do dia (overrides)
  const { data: specificSlots } = await supabase
    .from("doctor_time_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("date", dateString);

  // Se houver slots específicos, usar eles; senão, gerar slots baseados na disponibilidade padrão
  if (specificSlots && specificSlots.length > 0) {
    const slots: TimeSlot[] = specificSlots
      .filter((slot) => slot.is_available)
      .map((slot) => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
      }));
    return { slots, isBlocked: false };
  }

  // Gerar slots baseados na disponibilidade padrão
  if (availability && availability.length > 0) {
    const slots: TimeSlot[] = [];
    availability.forEach((avail) => {
      const startHour = parseInt(avail.start_time.split(":")[0]);
      const endHour = parseInt(avail.end_time.split(":")[0]);
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push({
          id: `${dateString}-${hour}`,
          start_time: `${hour.toString().padStart(2, "0")}:00`,
          end_time: `${(hour + 1).toString().padStart(2, "0")}:00`,
          is_available: true,
        });
      }
    });
    return { slots, isBlocked: false };
  }

  return { slots: [], isBlocked: false };
}

export async function createAppointment(data: {
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  durationMinutes: number;
}) {
  const supabase = createClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  // Verificar role - apenas pacientes podem criar agendamentos
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "patient") {
    throw new Error("Apenas pacientes podem agendar consultas");
  }

  // Garantir que o patientId é o ID do usuário logado
  if (data.patientId !== user.id) {
    throw new Error("Você só pode agendar consultas para si mesmo");
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: data.patientId,
      doctor_id: data.doctorId,
      scheduled_at: data.scheduledAt.toISOString(),
      duration_minutes: data.durationMinutes,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) throw error;

  // Marcar slot como indisponível
  const dateString = format(data.scheduledAt, "yyyy-MM-dd");
  const timeString = format(data.scheduledAt, "HH:mm");

  await supabase
    .from("doctor_time_slots")
    .update({
      is_available: false,
      appointment_id: appointment.id,
    })
    .eq("doctor_id", data.doctorId)
    .eq("date", dateString)
    .eq("start_time", timeString);

  return appointment;
}

export async function getMonthAvailability(
  doctorId: string,
  month: Date
): Promise<Availability[]> {
  const supabase = createClient();
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  // Buscar todos os slots do mês
  const { data: slots } = await supabase
    .from("doctor_time_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .gte("date", format(start, "yyyy-MM-dd"))
    .lte("date", format(end, "yyyy-MM-dd"));

  // Agrupar por data e contar slots disponíveis
  const availabilityMap = new Map<
    string,
    { available: number; total: number }
  >();

  slots?.forEach((slot) => {
    const date = slot.date;
    if (!availabilityMap.has(date)) {
      availabilityMap.set(date, { available: 0, total: 0 });
    }
    const current = availabilityMap.get(date)!;
    current.total++;
    if (slot.is_available) {
      current.available++;
    }
    availabilityMap.set(date, current);
  });

  // Converter para array de Availability
  const availability: Availability[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    const stats = availabilityMap.get(dateStr) || { available: 0, total: 0 };
    availability.push({
      date: new Date(d),
      slots_available: stats.available,
      is_available: stats.available > 0,
    });
  }

  return availability;
}
