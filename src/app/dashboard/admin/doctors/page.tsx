"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserCheck, X, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Doctor {
  id: string;
  crm: string;
  crm_state: string;
  specialty: string;
  bio: string | null;
  consultation_price: number | null;
  is_approved: boolean;
  approved_at: string | null;
  profile: {
    full_name: string;
    phone: string | null;
  };
}

export default function AdminDoctorsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved"
  >("all");

  useEffect(() => {
    fetchDoctors();
  }, [filterStatus]);

  async function fetchDoctors() {
    setLoading(true);
    try {
      // Buscar médicos
      let query = supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus === "pending") {
        query = query.eq("is_approved", false);
      } else if (filterStatus === "approved") {
        query = query.eq("is_approved", true);
      }

      const { data: doctorsData, error: doctorsError } = await query;

      if (doctorsError) throw doctorsError;

      if (!doctorsData || doctorsData.length === 0) {
        setDoctors([]);
        return;
      }

      // Buscar perfis dos médicos
      const doctorIds = doctorsData.map((d) => d.id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", doctorIds);

      if (profilesError) throw profilesError;

      // Combinar dados
      const doctorsWithProfiles = doctorsData.map((doctor) => {
        const profile = profilesData?.find((p) => p.id === doctor.id);
        return {
          ...doctor,
          profile: profile || {
            full_name: "Nome não disponível",
            phone: null,
          },
        };
      });

      setDoctors(doctorsWithProfiles);
    } catch (error: any) {
      console.error("Erro ao buscar médicos:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar médicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(doctorId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("doctors")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", doctorId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Médico aprovado com sucesso",
      });
      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar médico",
        variant: "destructive",
      });
    }
  }

  async function handleReject(doctorId: string) {
    if (!confirm("Tem certeza que deseja rejeitar este médico?")) return;

    try {
      const { error } = await supabase
        .from("doctors")
        .update({
          is_approved: false,
          approved_at: null,
          approved_by: null,
        })
        .eq("id", doctorId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Médico rejeitado",
      });
      fetchDoctors();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar médico",
        variant: "destructive",
      });
    }
  }

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.profile.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      doctor.crm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando médicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          Aprovação de Médicos
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Revise e aprove médicos cadastrados na plataforma
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, CRM ou especialidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as "all" | "pending" | "approved"
                )
              }
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Médicos */}
      <Card>
        <CardHeader>
          <CardTitle>Médicos ({filteredDoctors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum médico encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">
                      {doctor.profile.full_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>
                        CRM: {doctor.crm}/{doctor.crm_state}
                      </span>
                      <span>•</span>
                      <span>{doctor.specialty}</span>
                      {doctor.consultation_price && (
                        <>
                          <span>•</span>
                          <span>
                            R${" "}
                            {parseFloat(
                              doctor.consultation_price.toString()
                            ).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                    {doctor.bio && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {doctor.bio}
                      </p>
                    )}
                    {doctor.approved_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Aprovado em{" "}
                        {format(new Date(doctor.approved_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {doctor.is_approved ? (
                      <>
                        <Badge className="bg-green-100 text-green-700 text-xs sm:text-sm">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Aprovado
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(doctor.id)}
                          className="flex-1 sm:flex-initial text-xs sm:text-sm"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="sm:inline">Rejeitar</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge
                          variant="destructive"
                          className="text-xs sm:text-sm"
                        >
                          Pendente
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(doctor.id)}
                          className="flex-1 sm:flex-initial text-xs sm:text-sm"
                        >
                          <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="sm:inline">Aprovar</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
