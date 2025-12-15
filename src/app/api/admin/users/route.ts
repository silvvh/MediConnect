import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Criar novo usuário (apenas admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem criar usuários" },
        { status: 403 }
      );
    }

    const { email, password, full_name, phone, role } = await request.json();

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Email, senha, nome e role são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar usuário via Supabase Auth
    // Nota: Isso requer service role key ou usar admin API
    // Por enquanto, vamos criar via signUp normal e depois atualizar o role
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
        },
      },
    });

    if (signUpError) throw signUpError;

    if (!newUser.user) {
      return NextResponse.json(
        { error: "Erro ao criar usuário" },
        { status: 500 }
      );
    }

    // Atualizar perfil com phone e role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name,
        phone: phone || null,
        role,
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError);
      // Continuar mesmo se houver erro
    }

    return NextResponse.json(
      {
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          phone,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}


