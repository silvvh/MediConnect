import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

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

    // Preparar line items para Stripe
    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: "brl",
        product_data: {
          name: item.product.name,
          description: item.product.description || undefined,
          images: item.product.image_url ? [item.product.image_url] : undefined,
        },
        unit_amount: Math.round(parseFloat(item.product.price.toString()) * 100), // Converter para centavos
      },
      quantity: item.quantity,
    }));

    // Calcular total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.product.price.toString()) * item.quantity;
    }, 0);

    // Gerar número do pedido
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Buscar paciente associado ao usuário
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
          { error: "Erro ao criar perfil de paciente" },
          { status: 500 }
        );
      }

      patient = newPatient;
    }

    // Preparar items do pedido
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.product.price.toString()),
      total: parseFloat(item.product.price.toString()) * item.quantity,
    }));

    // Criar pedido pendente
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        patient_id: patient.id,
        order_number: orderNumber,
        total_amount: totalAmount,
        status: "pending",
        items: orderItems,
        payment_provider: "stripe",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Criar Checkout Session no Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/patient/shop/orders/${order.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/patient/shop/cart?payment=cancelled`,
      metadata: {
        orderId: order.id,
        orderNumber: orderNumber,
        userId: user.id,
        type: "products",
      },
      customer_email: user.email || undefined,
    });

    // Atualizar pedido com payment_id
    await supabase
      .from("orders")
      .update({
        payment_id: session.id,
      })
      .eq("id", order.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error("Erro ao criar checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar checkout" },
      { status: 500 }
    );
  }
}

