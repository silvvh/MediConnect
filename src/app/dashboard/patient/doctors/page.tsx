"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Stethoscope,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DoctorCard from "@/app/dashboard/doctors/components/doctor-card";
import DoctorListItem from "@/app/dashboard/doctors/components/doctor-list-item";
import DoctorFilters from "@/app/dashboard/doctors/components/doctor-filters";

type ViewMode = "grid" | "list";
type SortBy = "name" | "rating" | "consultations" | "price";

const ITEMS_PER_PAGE = 12; // 12 itens por página (3x4 no grid)

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPatient, setIsPatient] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  // Verificar role ao carregar
  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "patient") {
          // Redirecionar médicos e outros roles
          if (profile?.role === "doctor") {
            router.push("/dashboard/doctor");
          } else {
            router.push("/dashboard");
          }
          return;
        }

        setIsPatient(true);
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        router.push("/dashboard");
      } finally {
        setCheckingRole(false);
      }
    }

    checkRole();
  }, [supabase, router]);

  // Fetch doctors - MOVER ANTES DOS RETURNS CONDICIONAIS
  useEffect(() => {
    // Só buscar médicos se for paciente
    if (!isPatient || checkingRole) return;
    async function fetchDoctors() {
      setLoading(true);
      try {
        // Primeiro, verificar se o usuário está autenticado
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.error("User not authenticated");
          return;
        }

        // Buscar médicos aprovados
        // A ordenação será feita no cliente baseada na seleção do usuário
        const { data: doctorsData, error: doctorsError } = await supabase
          .from("doctors")
          .select("*")
          .eq("is_approved", true);

        if (doctorsError) {
          console.error("Error fetching doctors:", doctorsError);
          throw doctorsError;
        }

        console.log("Doctors fetched:", doctorsData?.length || 0);

        // Se não houver médicos, definir arrays vazios
        if (!doctorsData || doctorsData.length === 0) {
          setDoctors([]);
          setFilteredDoctors([]);
          return;
        }

        // Buscar profiles separadamente
        const doctorIds = doctorsData.map((d) => d.id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, phone")
          .in("id", doctorIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          // Continuar mesmo se houver erro nos profiles
        }

        // Combinar dados
        const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));
        const data = doctorsData.map((doctor) => ({
          ...doctor,
          profile: profilesMap.get(doctor.id) || {
            full_name: "Médico",
            avatar_url: null,
            phone: null,
          },
        }));

        setDoctors(data);
        setFilteredDoctors(data);
      } catch (error: any) {
        console.error("Error fetching doctors:", error);
        console.error("Error details:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });
        // Definir arrays vazios em caso de erro
        setDoctors([]);
        setFilteredDoctors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatient, checkingRole]);

  // Filter and sort - MOVER ANTES DOS RETURNS CONDICIONAIS
  useEffect(() => {
    // Só filtrar se for paciente e não estiver verificando role
    if (!isPatient || checkingRole) return;
    let result = [...doctors];

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (doctor) =>
          doctor.profile?.full_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          doctor.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Specialty filter
    if (specialtyFilter !== "all") {
      result = result.filter((doctor) => doctor.specialty === specialtyFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.profile?.full_name || "").localeCompare(
            b.profile?.full_name || ""
          );
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "consultations":
          return (b.total_consultations || 0) - (a.total_consultations || 0);
        case "price":
          return (
            parseFloat(a.consultation_price || 0) -
            parseFloat(b.consultation_price || 0)
          );
        default:
          return 0;
      }
    });

    setFilteredDoctors(result);
    // Resetar para primeira página quando filtros mudarem
    setCurrentPage(1);
  }, [doctors, searchQuery, specialtyFilter, sortBy]);

  // Mostrar loading enquanto verifica role
  if (checkingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não for paciente, não renderizar (já redirecionou)
  if (!isPatient) {
    return null;
  }

  // Calcular paginação
  const totalPages = Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex);

  // Função para gerar números de página
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Mostrar todas as páginas se houver poucas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostrar primeira página
      pages.push(1);

      if (currentPage <= 3) {
        // Perto do início
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Perto do fim
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // No meio
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Get unique specialties
  const specialties = Array.from(
    new Set(doctors.map((d) => d.specialty).filter(Boolean))
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      <PageHeader
        icon={Stethoscope}
        title="Médicos"
        description="Encontre os melhores especialistas"
        stats={
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">
                {filteredDoctors.length}
              </span>{" "}
              médicos encontrados
              {filteredDoctors.length > ITEMS_PER_PAGE && (
                <span className="text-gray-500">
                  {" "}
                  ({totalPages} {totalPages === 1 ? "página" : "páginas"})
                </span>
              )}
            </span>
            {specialtyFilter !== "all" && (
              <span className="text-gray-600">
                • Especialidade:{" "}
                <span className="font-semibold text-primary-600">
                  {specialtyFilter}
                </span>
              </span>
            )}
          </div>
        }
      />

      {/* Filters and Controls */}
      <div className="shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou especialidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Specialty Filter */}
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue placeholder="Todas as especialidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as especialidades</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(value: SortBy) => setSortBy(value)}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome (A-Z)</SelectItem>
                <SelectItem value="rating">Melhor avaliado</SelectItem>
                <SelectItem value="consultations">Mais consultas</SelectItem>
                <SelectItem value="price">Menor preço</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
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

            {/* Advanced Filters */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary-50 border-primary-300" : ""}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 animate-slide-down">
              <DoctorFilters
                onFilterChange={(filters) => console.log(filters)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <LoadingSkeleton viewMode={viewMode} />
        ) : filteredDoctors.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <>
            {/* Container com Scroll */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {viewMode === "grid" ? (
                  <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedDoctors.map((doctor) => (
                      <DoctorCard key={doctor.id} doctor={doctor} />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {paginatedDoctors.map((doctor) => (
                      <DoctorListItem key={doctor.id} doctor={doctor} />
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a{" "}
                    {Math.min(endIndex, filteredDoctors.length)} de{" "}
                    {filteredDoctors.length} médicos
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => p - 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>

                    {/* Números de página */}
                    <div className="hidden sm:flex items-center gap-1">
                      {getPageNumbers().map((page, index) => {
                        if (page === "ellipsis") {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-2 text-gray-400"
                            >
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page as number);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                              currentPage === page
                                ? "bg-primary-600 text-white shadow-sm"
                                : "bg-white border border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => p + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
        <Stethoscope className="w-16 h-16 text-gray-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        Nenhum médico encontrado
      </h3>
      <p className="text-gray-600 text-center max-w-md">
        {searchQuery
          ? `Não encontramos médicos com "${searchQuery}". Tente buscar por outra especialidade ou nome.`
          : "Não há médicos cadastrados no momento."}
      </p>
    </div>
  );
}
