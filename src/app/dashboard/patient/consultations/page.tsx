"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConsultationCard } from "@/components/consultations/consultation-card";
import { ConsultationTable } from "@/components/consultations/consultation-table";
import { ConsultationDetailsModal } from "@/components/consultations/consultation-details-modal";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Filter,
  Plus,
  LayoutGrid,
  List,
  Clock,
  CheckCircle2,
  History,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "grid" | "list";
type TabValue = "all" | "upcoming" | "past" | "cancelled";

interface Consultation {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  video_room_url?: string;
  doctor?: {
    full_name: string;
    specialty?: string;
    crm?: string;
    crm_state?: string;
    avatar_url?: string;
  };
  patient?: {
    full_name: string;
    birth_date?: string;
    avatar_url?: string;
  };
  documents?: Array<{
    id: string;
    file_name: string;
    category: string;
    file_size: number;
    file_path: string;
  }>;
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<
    Consultation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState<TabValue>("upcoming");
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [filters, setFilters] = useState({
    specialty: "all",
    dateFrom: "",
    dateTo: "",
    status: "all",
  });
  const [activeFilters, setActiveFilters] = useState(0);

  useEffect(() => {
    loadConsultations();
  }, []);

  useEffect(() => {
    filterConsultations();
  }, [consultations, activeTab, filters]);

  useEffect(() => {
    const count = Object.values(filters).filter(
      (v) => v !== "all" && v !== ""
    ).length;
    setActiveFilters(count);
  }, [filters]);

  const loadConsultations = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "patient") {
        // Redirecionar se não for paciente
        return;
      }

      setRole("patient");

      // Buscar appointments do paciente
      const appointmentsQuery = supabase
        .from("appointments")
        .select(
          `*,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialty,
            crm,
            crm_state
          ),
          patient:patients!appointments_patient_id_fkey(
            id,
            birth_date
          )`
        )
        .eq("patient_id", user.id);

      const { data: appointmentsData, error: appointmentsError } =
        await appointmentsQuery.order("scheduled_at", {
          ascending: false,
        });

      if (appointmentsError) throw appointmentsError;

      // Buscar profiles separadamente para evitar problemas com foreign keys aninhadas
      const doctorIds = [
        ...new Set(
          (appointmentsData || [])
            .map((apt: any) => apt.doctor?.id)
            .filter(Boolean)
        ),
      ];
      const patientIds = [
        ...new Set(
          (appointmentsData || [])
            .map((apt: any) => apt.patient?.id)
            .filter(Boolean)
        ),
      ];

      // Buscar profiles apenas se houver IDs
      const [doctorProfilesResult, patientProfilesResult] = await Promise.all([
        doctorIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", doctorIds)
          : Promise.resolve({ data: [], error: null }),
        patientIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", patientIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const doctorProfiles = doctorProfilesResult.data || [];
      const patientProfiles = patientProfilesResult.data || [];

      // Criar mapas para acesso rápido
      const doctorProfilesMap = new Map(
        (doctorProfiles || []).map((p) => [p.id, p])
      );
      const patientProfilesMap = new Map(
        (patientProfiles || []).map((p) => [p.id, p])
      );

      // Normalizar dados - combinar appointments com profiles
      const normalized = (appointmentsData || []).map((apt: any) => {
        const doctorProfile = apt.doctor
          ? doctorProfilesMap.get(apt.doctor.id)
          : null;
        const patientProfile = apt.patient
          ? patientProfilesMap.get(apt.patient.id)
          : null;

        const doctorData = apt.doctor
          ? {
              id: apt.doctor.id,
              full_name: doctorProfile?.full_name || "",
              specialty: apt.doctor.specialty || "",
              crm: apt.doctor.crm || "",
              crm_state: apt.doctor.crm_state || "",
              avatar_url: doctorProfile?.avatar_url,
            }
          : undefined;

        const patientData = apt.patient
          ? {
              id: apt.patient.id,
              full_name: patientProfile?.full_name || "",
              avatar_url: patientProfile?.avatar_url,
              birth_date: apt.patient.birth_date,
            }
          : undefined;

        return {
          ...apt,
          doctor: doctorData,
          patient: patientData,
        };
      });

      setConsultations(normalized);
      setFilteredConsultations(normalized);
    } catch (error) {
      console.error("Error loading consultations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterConsultations = () => {
    let filtered = [...consultations];

    // Filtrar por tab
    const now = new Date();
    switch (activeTab) {
      case "upcoming":
        filtered = filtered.filter(
          (c) => new Date(c.scheduled_at) > now && c.status !== "cancelled"
        );
        break;
      case "past":
        filtered = filtered.filter(
          (c) => new Date(c.scheduled_at) < now && c.status !== "cancelled"
        );
        break;
      case "cancelled":
        filtered = filtered.filter((c) => c.status === "cancelled");
        break;
      case "all":
      default:
        break;
    }

    // Aplicar filtros avançados
    if (filters.specialty !== "all") {
      filtered = filtered.filter(
        (c) => c.doctor?.specialty?.toLowerCase() === filters.specialty
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(
        (c) => new Date(c.scheduled_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(
        (c) => new Date(c.scheduled_at) <= new Date(filters.dateTo)
      );
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    setFilteredConsultations(filtered);
  };

  const clearFilters = () => {
    setFilters({
      specialty: "all",
      dateFrom: "",
      dateTo: "",
      status: "all",
    });
  };

  const applyFilters = () => {
    filterConsultations();
  };

  const handleViewDetails = (id: string) => {
    const consultation = consultations.find((c) => c.id === id);
    if (consultation) {
      setSelectedConsultation(consultation);
      setIsDetailsOpen(true);
    }
  };

  const stats = {
    total: consultations.length,
    upcoming: consultations.filter(
      (c) => new Date(c.scheduled_at) > new Date() && c.status !== "cancelled"
    ).length,
    completed: consultations.filter((c) => c.status === "completed").length,
  };

  const upcomingCount = consultations.filter(
    (c) => new Date(c.scheduled_at) > new Date() && c.status !== "cancelled"
  ).length;
  const pastCount = consultations.filter(
    (c) => new Date(c.scheduled_at) < new Date() && c.status !== "cancelled"
  ).length;
  const cancelledCount = consultations.filter(
    (c) => c.status === "cancelled"
  ).length;

  const emptyStateMessages: Record<TabValue, string> = {
    all: "Você ainda não possui consultas agendadas.",
    upcoming: "Você não possui consultas agendadas no momento.",
    past: "Você ainda não possui consultas realizadas.",
    cancelled: "Você não possui consultas canceladas.",
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-24 bg-gray-200 rounded-xl mb-4" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <PageHeader
        icon={Calendar}
        title="Minhas Consultas"
        actions={
          <>
            {/* Toggle Grid/Lista */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                className="w-9 h-9 p-0"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className="w-9 h-9 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Filtros */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {activeFilters > 0 && (
                    <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-primary-500 text-white text-xs">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-4">
                <div className="space-y-4">
                  {/* Especialidade */}
                  <div>
                    <Label className="text-sm font-medium">Especialidade</Label>
                    <Select
                      value={filters.specialty}
                      onValueChange={(value) =>
                        setFilters({ ...filters, specialty: value })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="cardiologia">Cardiologia</SelectItem>
                        <SelectItem value="dermatologia">
                          Dermatologia
                        </SelectItem>
                        <SelectItem value="ortopedia">Ortopedia</SelectItem>
                        <SelectItem value="pediatria">Pediatria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Intervalo de Datas */}
                  <div>
                    <Label className="text-sm font-medium">Período</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) =>
                          setFilters({ ...filters, dateFrom: e.target.value })
                        }
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) =>
                          setFilters({ ...filters, dateTo: e.target.value })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Limpar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary-600 hover:bg-primary-700"
                      onClick={applyFilters}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CTA Principal */}
            <Button
              size="default"
              className="bg-secondary-500 hover:bg-secondary-600"
              asChild
            >
              <Link href="/dashboard/patient/schedule">
                <Plus className="w-4 h-4 mr-2" />
                Nova Consulta
              </Link>
            </Button>
          </>
        }
        stats={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {stats.upcoming}
                </span>{" "}
                próximas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {stats.completed}
                </span>{" "}
                concluídas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {stats.total}
                </span>{" "}
                total
              </span>
            </div>
          </div>
        }
      />

      {/* Conteúdo Principal */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <Tabs
          defaultValue="upcoming"
          className="w-full"
          onValueChange={(value) => setActiveTab(value as TabValue)}
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex bg-white border border-gray-200 rounded-lg p-1">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              <span className="mr-2">Todas</span>
              <Badge variant="secondary" className="ml-auto">
                {consultations.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              <Clock className="w-4 h-4 mr-2" />
              <span className="mr-2">Próximas</span>
              <Badge variant="secondary" className="ml-auto">
                {upcomingCount}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="past"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              <History className="w-4 h-4 mr-2" />
              <span className="mr-2">Passadas</span>
              <Badge variant="secondary" className="ml-auto">
                {pastCount}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="cancelled"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              <XCircle className="w-4 h-4 mr-2" />
              <span className="mr-2">Canceladas</span>
              <Badge variant="secondary" className="ml-auto">
                {cancelledCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="all" className="mt-8">
            {filteredConsultations.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredConsultations.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      role={role}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <ConsultationTable
                  consultations={filteredConsultations}
                  role={role}
                  onViewDetails={handleViewDetails}
                />
              )
            ) : (
              <EmptyState
                iconName="calendar"
                title={`Nenhuma consulta ${
                  activeTab === "all" ? "" : activeTab
                }`}
                description={emptyStateMessages[activeTab]}
                actionLabel={
                  activeTab === "upcoming" ? "Agendar Nova Consulta" : undefined
                }
                actionHref={
                  activeTab === "upcoming" ? "/dashboard/patient/schedule" : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-8">
            {filteredConsultations.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredConsultations.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      role={role}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <ConsultationTable
                  consultations={filteredConsultations}
                  role={role}
                  onViewDetails={handleViewDetails}
                />
              )
            ) : (
              <EmptyState
                iconName="calendar"
                title="Nenhuma consulta agendada"
                description={emptyStateMessages.upcoming}
                actionLabel="Agendar Nova Consulta"
                actionHref="/dashboard/patient/schedule"
              />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-8">
            {filteredConsultations.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredConsultations.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      role={role}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <ConsultationTable
                  consultations={filteredConsultations}
                  role={role}
                  onViewDetails={handleViewDetails}
                />
              )
            ) : (
              <EmptyState
                iconName="calendar"
                title="Nenhuma consulta passada"
                description={emptyStateMessages.past}
              />
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-8">
            {filteredConsultations.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredConsultations.map((consultation) => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      role={role}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <ConsultationTable
                  consultations={filteredConsultations}
                  role={role}
                  onViewDetails={handleViewDetails}
                />
              )
            ) : (
              <EmptyState
                iconName="calendar"
                title="Nenhuma consulta cancelada"
                description={emptyStateMessages.cancelled}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Detalhes */}
      <ConsultationDetailsModal
        consultation={selectedConsultation}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        role={role}
      />
    </div>
  );
}
