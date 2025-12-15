import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Criar pedido a partir do carrinho
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se o usuário tem role de paciente
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "patient") {
      return NextResponse.json(
        { error: "Apenas pacientes podem criar pedidos" },
        { status: 403 }
      );
    }

    // Buscar paciente associado ao usuário
    // A tabela patients usa id que referencia profiles(id), não user_id
    let { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", user.id)
      .single();

    // Se não existir registro na tabela patients, criar um básico
    if (!patient) {
      const { data: newPatient, error: createError } = await supabase
        .from("patients")
        .insert({
          id: user.id,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Erro ao criar registro de paciente:", createError);
        return NextResponse.json(
          { error: "Erro ao criar perfil de paciente. Tente novamente." },
          { status: 500 }
        );
      }

      patient = newPatient;
    }

    // Buscar itens do carrinho
    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select(`
        *,
        product:products(*)
      `)
      .eq("user_id", user.id);

    if (cartError) throw cartError;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Carrinho vazio" },
        { status: 400 }
      );
    }

    // Calcular total
    const totalAmount = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.product.price);
      return sum + price * item.quantity;
    }, 0);

    // Preparar items do pedido
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.product.price),
      total: parseFloat(item.product.price) * item.quantity,
    }));

    // Gerar número do pedido
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        patient_id: patient.id,
        order_number: orderNumber,
        total_amount: totalAmount,
        status: "pending",
        items: orderItems,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Limpar carrinho
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar pedido:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}
