"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  pendingDoctors: number;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingDoctors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Total de usuários
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Total de médicos
      const { count: doctorsCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true });

      // Total de pacientes
      const { count: patientsCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      // Total de consultas
      const { count: appointmentsCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });

      // Receita total (de pedidos pagos)
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "paid");

      const revenue =
        orders?.reduce(
          (sum, order) => sum + parseFloat(order.total_amount.toString()),
          0
        ) || 0;

      // Médicos pendentes (apenas não aprovados)
      const { count: pendingCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false);

      setStats({
        totalUsers: usersCount || 0,
        totalDoctors: doctorsCount || 0,
        totalPatients: patientsCount || 0,
        totalAppointments: appointmentsCount || 0,
        totalRevenue: revenue,
        pendingDoctors: pendingCount || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: "Total de Usuários",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Médicos",
      value: stats.totalDoctors,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pacientes",
      value: stats.totalPatients,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Consultas",
      value: stats.totalAppointments,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Receita Total",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Médicos Pendentes",
      value: stats.pendingDoctors,
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Dashboard Administrativo
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Visão geral da plataforma e estatísticas
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div
                    className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link href="/dashboard/admin/users">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col w-full"
              >
                <Users className="w-6 h-6 mb-2" />
                <span>Gerenciar Usuários</span>
              </Button>
            </Link>
            <Link href="/dashboard/admin/doctors">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col w-full"
              >
                <UserCheck className="w-6 h-6 mb-2" />
                <span>Aprovar Médicos</span>
              </Button>
            </Link>
            <Link href="/dashboard/admin/reports">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col w-full"
              >
                <FileText className="w-6 h-6 mb-2" />
                <span>Relatórios</span>
              </Button>
            </Link>
            <Link href="/dashboard/admin/financial">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col w-full"
              >
                <DollarSign className="w-6 h-6 mb-2" />
                <span>Financeiro</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
