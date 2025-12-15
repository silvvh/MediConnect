"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminFinancialPage() {
  const supabase = createClient();
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    fetchFinancialData();
  }, [period]);

  async function fetchFinancialData() {
    setLoading(true);
    try {
      // Calcular período
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case "week":
          startDate = subDays(endDate, 7);
          break;
        case "month":
          startDate = startOfMonth(endDate);
          break;
        case "quarter":
          startDate = subDays(endDate, 90);
          break;
        case "year":
          startDate = subDays(endDate, 365);
          break;
        default:
          startDate = startOfMonth(endDate);
      }

      // Buscar pedidos pagos
      const { data: paidOrders, error: paidError } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("status", "paid")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (paidError) throw paidError;

      // Buscar pedidos pendentes
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Calcular estatísticas
      const totalRevenue =
        paidOrders?.reduce(
          (sum, order) => sum + parseFloat(order.total_amount.toString()),
          0
        ) || 0;

      const monthlyOrders =
        paidOrders?.filter((order) => {
          const orderDate = new Date(order.created_at);
          return (
            orderDate >= startOfMonth(endDate) &&
            orderDate <= endOfMonth(endDate)
          );
        }) || [];

      const monthlyRevenue =
        monthlyOrders.reduce(
          (sum, order) => sum + parseFloat(order.total_amount.toString()),
          0
        ) || 0;

      const totalOrders = paidOrders?.length || 0;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        monthlyRevenue,
        pendingPayments: pendingCount || 0,
        totalOrders,
        averageOrderValue,
      });
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
            Financeiro
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Visão geral financeira da plataforma
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mês</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="year">Último Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Receita do Mês</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.monthlyRevenue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Pagamentos Pendentes
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendingPayments}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Receita (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-gray-500">
              Gráfico de receita será implementado em breve
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumo de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Total de Pedidos</p>
                <p className="text-sm text-gray-500">No período selecionado</p>
              </div>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </div>
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Receita Total</p>
                <p className="text-sm text-gray-500">No período selecionado</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Ticket Médio</p>
                <p className="text-sm text-gray-500">Valor médio por pedido</p>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.averageOrderValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
