"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, User, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_provider: string | null;
  payment_id: string | null;
  items: OrderItem[];
  created_at: string;
  patient: {
    profiles: {
      full_name: string;
    };
  };
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [params.orderId]);

  async function fetchOrder() {
    try {
      const { data: orderData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.orderId)
        .single();

      if (error) throw error;

      // Buscar perfil do paciente
      const { data: patientData } = await supabase
        .from("patients")
        .select("id")
        .eq("id", orderData.patient_id)
        .single();

      let fullName = "Paciente não encontrado";
      if (patientData) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", patientData.id)
          .single();
        if (profileData) {
          fullName = profileData.full_name;
        }
      }

      const processedOrder = {
        ...orderData,
        patient: {
          profiles: {
            full_name: fullName,
          },
        },
      };

      setOrder(processedOrder);
    } catch (error: any) {
      console.error("Erro ao buscar pedido:", error);
    } finally {
      setLoading(false);
    }
  }

  const statusConfig = {
    pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
    paid: { label: "Pago", color: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
    refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-700" },
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Pedido não encontrado</p>
          <Link href="/dashboard/admin/orders">
            <Button className="mt-4">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link href="/dashboard/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 break-words">
            Pedido {order.order_number}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Badge
              className={
                statusConfig[order.status as keyof typeof statusConfig]
                  ?.color || "bg-gray-100 text-gray-700"
              }
            >
              {statusConfig[order.status as keyof typeof statusConfig]?.label ||
                order.status}
            </Badge>
            <span>•</span>
            <span>
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Informações do Pedido */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Itens do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items &&
                Array.isArray(order.items) &&
                order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{item.product_name}</p>
                        <p className="text-sm text-gray-500">
                          Quantidade: {item.quantity} ×{" "}
                          {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum item encontrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>{order.patient.profiles.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>
                  {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>
                  {formatCurrency(parseFloat(order.total_amount.toString()))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxa</span>
                <span>R$ 0,00</span>
              </div>
              <div className="border-t pt-4 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(parseFloat(order.total_amount.toString()))}
                </span>
              </div>
              {order.payment_provider && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">
                    Método de Pagamento
                  </p>
                  <p className="font-medium capitalize">
                    {order.payment_provider}
                  </p>
                </div>
              )}
              {order.payment_id && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">ID do Pagamento</p>
                  <p className="font-mono text-xs">{order.payment_id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
