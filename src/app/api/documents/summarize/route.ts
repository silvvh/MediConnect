import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Gerar resumo de documento após upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { document_id, document_text } = await request.json();

    if (!document_id || !document_text) {
      return NextResponse.json(
        { error: "ID do documento e texto são obrigatórios" },
        { status: 400 }
      );
    }

    // Gerar resumo usando IA
    const summaryResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/document-summary`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText: document_text }),
      }
    );

    if (!summaryResponse.ok) {
      throw new Error("Erro ao gerar resumo");
    }

    const { summary } = await summaryResponse.json();

    // Atualizar documento com resumo
    const { error: updateError } = await supabase
      .from("documents")
      .update({ ai_summary: JSON.stringify(summary) })
      .eq("id", document_id)
      .eq("uploaded_by", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Erro ao processar resumo:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar resumo" },
      { status: 500 }
    );
  }
}

