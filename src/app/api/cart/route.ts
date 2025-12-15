import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Buscar itens do carrinho
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: items, error } = await supabase
      .from("cart_items")
      .select(`
        *,
        product:products(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Erro ao buscar carrinho:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar carrinho" },
      { status: 500 }
    );
  }
}

// POST - Adicionar item ao carrinho
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { product_id, quantity = 1 } = await request.json();

    if (!product_id) {
      return NextResponse.json(
        { error: "ID do produto é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se produto existe e está ativo
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .eq("active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já existe no carrinho
    const { data: existing } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .single();

    if (existing) {
      // Atualizar quantidade
      const { data: updated, error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id)
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ item: updated });
    } else {
      // Criar novo item
      const { data: newItem, error: insertError } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id,
          quantity,
        })
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (insertError) throw insertError;
      return NextResponse.json({ item: newItem }, { status: 201 });
    }
  } catch (error: any) {
    console.error("Erro ao adicionar ao carrinho:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao adicionar ao carrinho" },
      { status: 500 }
    );
  }
}

// DELETE - Remover item do carrinho
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("item_id");

    if (!itemId) {
      return NextResponse.json(
        { error: "ID do item é obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao remover do carrinho:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao remover do carrinho" },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar quantidade
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { item_id, quantity } = await request.json();

    if (!item_id || quantity < 1) {
      return NextResponse.json(
        { error: "ID do item e quantidade válida são obrigatórios" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", item_id)
      .eq("user_id", user.id)
      .select(`
        *,
        product:products(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar carrinho:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar carrinho" },
      { status: 500 }
    );
  }
}

