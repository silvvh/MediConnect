"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Calendar,
  Clock,
  Video,
  User,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  patient: {
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export default function DoctorSchedulePage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [currentMonth]);

  async function fetchAppointments() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data: appts, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          scheduled_at,
          duration_minutes,
          status,
          patient:patients!inner (
            profiles!inner (
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq("doctor_id", user.id)
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString())
        .order("scheduled_at");

      if (error) {
        console.error("Error fetching appointments:", error);
        return;
      }

      setAppointments((appts || []) as any);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduled_at);
      return isSameDay(aptDate, date);
    });
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Adicionar dias do mês anterior para completar a primeira semana
  const firstDay = startOfMonth(currentMonth);
  const firstDayOfWeek = firstDay.getDay();
  const daysBefore = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Ajustar para segunda-feira = 0

  const previousMonthDays = [];
  for (let i = daysBefore - 1; i >= 0; i--) {
    const date = new Date(firstDay);
    date.setDate(date.getDate() - (i + 1));
    previousMonthDays.push(date);
  }

  const allDays = [...previousMonthDays, ...monthDays];

  // Adicionar dias do próximo mês para completar a última semana
  const lastDay = endOfMonth(currentMonth);
  const lastDayOfWeek = lastDay.getDay();
  const daysAfter = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

  const nextMonthDays = [];
  for (let i = 1; i <= daysAfter; i++) {
    const date = new Date(lastDay);
    date.setDate(date.getDate() + i);
    nextMonthDays.push(date);
  }

  const completeCalendar = [...allDays, ...nextMonthDays];

  const selectedDateAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate)
    : [];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={Calendar}
        title="Minha Agenda"
        description="Visualize e gerencie suas consultas agendadas"
      />

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Weekday Headers */}
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {completeCalendar.map((date, index) => {
              const dayAppointments = getAppointmentsForDate(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    min-h-[100px] p-2 border rounded-lg text-left transition-all
                    ${
                      !isCurrentMonth
                        ? "bg-gray-50 text-gray-400"
                        : "bg-white hover:border-primary-300"
                    }
                    ${isToday(date) ? "border-primary-500 border-2" : ""}
                    ${isSelected ? "bg-primary-50 border-primary-500" : ""}
                  `}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday(date) ? "text-primary-600" : ""
                    }`}
                  >
                    {format(date, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded truncate"
                      >
                        {format(new Date(apt.scheduled_at), "HH:mm")} -{" "}
                        {apt.patient.profiles.full_name.split(" ")[0]}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 2} mais
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Appointments */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Consultas em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Nenhuma consulta agendada para este dia
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={
                            appointment.patient.profiles.avatar_url || undefined
                          }
                        />
                        <AvatarFallback className="bg-primary-100 text-primary-700">
                          {appointment.patient.profiles.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {appointment.patient.profiles.full_name}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(
                              new Date(appointment.scheduled_at),
                              "HH:mm"
                            )}
                          </span>
                          <span>•</span>
                          <span>{appointment.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          appointment.status === "confirmed"
                            ? "default"
                            : appointment.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {appointment.status === "confirmed"
                          ? "Confirmado"
                          : appointment.status === "completed"
                          ? "Concluída"
                          : appointment.status === "cancelled"
                          ? "Cancelada"
                          : "Pendente"}
                      </Badge>
                      {appointment.status === "confirmed" && (
                        <Button size="sm" asChild>
                          <Link
                            href={`/dashboard/appointments/${appointment.id}/waiting-room`}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Entrar
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Appointments List (Collapsed View) */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Consultas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Nenhuma consulta agendada para este mês
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(appointment.scheduled_at), "dd")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(appointment.scheduled_at), "MMM", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={
                          appointment.patient.profiles.avatar_url || undefined
                        }
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                        {appointment.patient.profiles.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {appointment.patient.profiles.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(
                          new Date(appointment.scheduled_at),
                          "HH:mm"
                        )}{" "}
                        • {appointment.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

