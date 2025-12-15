import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppointmentCard } from "@/components/dashboard/appointment-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  FileText,
  Clock,
  Heart,
  ArrowRight,
  ChevronRight,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function PatientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Autenticação já é verificada no layout, mas precisamos do user para queries
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Verificar role específica
  if (profile?.role !== "patient") {
    redirect("/dashboard");
  }

  // Buscar próximo agendamento
  const { data: nextAppointment } = await supabase
    .from("appointments")
    .select("*, doctors:doctor_id(*, profiles:id(*))")
    .eq("patient_id", user.id)
    .eq("status", "confirmed")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Buscar histórico de consultas
  const { data: recentAppointments } = await supabase
    .from("appointments")
    .select("*, doctors:doctor_id(*, profiles:id(*))")
    .eq("patient_id", user.id)
    .order("scheduled_at", { ascending: false })
    .limit(5);

  // Buscar documentos recentes
  const { data: recentDocuments } = await supabase
    .from("documents")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // Estatísticas
  const { count: totalAppointments } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", user.id);

  const { count: totalDocuments } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", user.id);

  const nextAppointmentDate = nextAppointment?.scheduled_at
    ? new Date(nextAppointment.scheduled_at)
    : null;
  const nextAppointmentTime = nextAppointmentDate
    ? format(nextAppointmentDate, "HH:mm", { locale: ptBR })
    : null;
  const nextAppointmentDateFormatted = nextAppointmentDate
    ? formatDistance(nextAppointmentDate, new Date(), {
        locale: ptBR,
        addSuffix: true,
      })
    : "Nenhuma";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          Olá, {profile?.full_name || "Usuário"}! 👋
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Bem-vindo de volta. Aqui está um resumo da sua saúde.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Próxima Consulta"
          value={
            nextAppointmentDate ? nextAppointmentTime || "Hoje" : "Nenhuma"
          }
          trend={nextAppointmentDateFormatted}
          color="blue"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Documentos"
          value={totalDocuments?.toString() || "0"}
          trend="+3 este mês"
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Consultas Realizadas"
          value={totalAppointments?.toString() || "0"}
          trend="+2 este mês"
          color="purple"
        />
        <StatCard
          icon={<Heart className="w-5 h-5" />}
          label="Saúde Geral"
          value="Boa"
          trend="Sem alertas"
          color="red"
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Próximas Consultas</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/patient/consultations">
                  Ver todas
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            {recentAppointments && recentAppointments.length > 0 ? (
              <div className="space-y-4">
                {recentAppointments.slice(0, 2).map((appointment: any) => {
                  const appointmentDate = new Date(appointment.scheduled_at);
                  const doctorName =
                    appointment.doctors?.profiles?.full_name || "Médico";
                  const isUpcoming =
                    appointmentDate > new Date() &&
                    appointment.status === "confirmed";

                  return (
                    <AppointmentCard
                      key={appointment.id}
                      doctor={doctorName}
                      specialty="Especialidade"
                      date={format(appointmentDate, "dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                      time={format(appointmentDate, "HH:mm", {
                        locale: ptBR,
                      })}
                      status={
                        appointment.status === "completed"
                          ? "completed"
                          : isUpcoming
                          ? "confirmed"
                          : "pending"
                      }
                      appointmentId={appointment.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <EmptyState
                  iconName="calendar"
                  title="Nenhuma consulta agendada"
                  description="Agende sua primeira consulta com um de nossos especialistas."
                  actionLabel="Agendar Consulta"
                  actionHref="/dashboard/patient/schedule"
                />
              </div>
            )}
          </div>

          {/* Recent Documents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Documentos Recentes</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/patient/documents">Ver todos</Link>
              </Button>
            </div>

            {recentDocuments && recentDocuments.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 divide-y">
                {recentDocuments.map((doc: any) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/${doc.id}`}
                    className="block w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        {doc.category || "Documento"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {formatDistance(new Date(doc.created_at), new Date(), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <EmptyState
                  iconName="file"
                  title="Nenhum documento"
                  description="Seus documentos médicos aparecerão aqui."
                  actionLabel="Ver Documentos"
                  actionHref="/dashboard/patient/documents"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">
          {/* Calendar Widget */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Calendário</h3>
            <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-sm text-gray-500">Calendário</p>
            </div>
          </div>

          {/* Health Tips */}
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl border border-primary-100 p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Dica de Saúde</h3>
                <p className="text-sm text-gray-600">
                  Beba pelo menos 2 litros de água por dia para manter-se
                  hidratado.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Support */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">Precisa de ajuda?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Nossa equipe está pronta para ajudar
            </p>
            <Button variant="outline" className="w-full" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Iniciar Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
