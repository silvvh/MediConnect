"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  DollarSign,
  Star,
  Video,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { format, isToday, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface DoctorStats {
  todayAppointments: number;
  monthAppointments: number;
  monthRevenue: number;
  averageRating: number;
  pendingDocuments: number;
}

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

export default function DoctorDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      // Buscar consultas de hoje
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: todayAppts, error: todayError } = await supabase
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
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString())
        .order("scheduled_at");

      if (todayError) {
        console.error("Error fetching today appointments:", todayError);
      }

      setTodayAppointments(todayAppts || []);

      // Buscar próximas consultas (não hoje)
      const { data: upcomingAppts } = await supabase
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
        .gt(
          "scheduled_at",
          new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        )
        .order("scheduled_at")
        .limit(5);

      setUpcomingAppointments(upcomingAppts || []);

      // Buscar estatísticas do mês
      const { data: monthAppts } = await supabase
        .from("appointments")
        .select("id")
        .eq("doctor_id", user.id)
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString())
        .eq("status", "completed");

      // Buscar dados do médico para calcular receita
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("consultation_price")
        .eq("id", user.id)
        .single();

      const monthRevenue =
        (monthAppts?.length || 0) *
        ((doctorData?.consultation_price || 0) / 100);

      setStats({
        todayAppointments: todayAppts?.length || 0,
        monthAppointments: monthAppts?.length || 0,
        monthRevenue,
        averageRating: 4.8, // TODO: implementar sistema de avaliações
        pendingDocuments: 0, // TODO: implementar documentos pendentes
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
        <Skeleton className="h-8 sm:h-10 lg:h-12 w-48 sm:w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Dashboard Médico</h1>
        <p className="text-sm sm:text-base text-gray-500">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Consultas Hoje */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs sm:text-sm">
                Hoje
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Consultas de Hoje</p>
            <p className="text-2xl sm:text-3xl font-bold">
              {stats?.todayAppointments || 0}
            </p>
          </CardContent>
        </Card>

        {/* Consultas do Mês */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Consultas este Mês</p>
            <p className="text-3xl font-bold">
              {stats?.monthAppointments || 0}
            </p>
          </CardContent>
        </Card>

        {/* Receita do Mês */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Receita este Mês</p>
            <p className="text-3xl font-bold">
              R$ {(stats?.monthRevenue || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Avaliação */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Avaliação Média</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{stats?.averageRating || 0}</p>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-yellow-500 fill-yellow-500"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Consultas de Hoje */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultas de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Nenhuma consulta agendada para hoje
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={
                              appointment.patient.profiles.avatar_url ||
                              undefined
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
                              : "secondary"
                          }
                        >
                          {appointment.status === "confirmed"
                            ? "Confirmado"
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

          {/* Próximas Consultas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Próximas Consultas</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/doctor/schedule">Ver Agenda</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma consulta agendada
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={
                              appointment.patient.profiles.avatar_url ||
                              undefined
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
                              "dd/MM 'às' HH:mm"
                            )}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/doctor/schedule">
                  <Calendar className="w-4 h-4 mr-2" />
                  Minha Agenda
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/doctor/medical-records">
                  <FileText className="w-4 h-4 mr-2" />
                  Prontuários
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/doctor/patients">
                  <Users className="w-4 h-4 mr-2" />
                  Meus Pacientes
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Horário</span>
                  <span className="font-medium">08:00 - 18:00</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Editar Disponibilidade
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Dica do Dia</h3>
                  <p className="text-sm text-gray-600">
                    Complete todos os prontuários logo após as consultas para
                    manter o histórico organizado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
