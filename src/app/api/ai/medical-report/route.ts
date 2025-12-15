import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é médico
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Apenas médicos podem gerar laudos' },
        { status: 403 }
      )
    }

    const { appointmentId, patientId, examType, examData, preliminaryFindings } =
      await request.json()

    if (!examType || !examData) {
      return NextResponse.json(
        { error: 'Tipo de exame e dados do exame são obrigatórios' },
        { status: 400 }
      )
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI não configurado' },
        { status: 500 }
      )
    }

    const systemPrompt = `Você é um médico radiologista/patologista especializado. Gere um laudo médico formal baseado nos dados fornecidos.

IMPORTANTE: Sua resposta deve ser APENAS um objeto JSON válido, sem markdown, sem texto adicional. Formato:

{
  "tecnica": "Descrição da técnica utilizada",
  "achados": "Descrição detalhada dos achados",
  "comparacao": "Comparação com exames anteriores (se aplicável)",
  "conclusao": "Conclusão diagnóstica",
  "recomendacoes": "Recomendações de seguimento ou exames adicionais"
}

Mantenha linguagem técnica médica apropriada e profissional.`

    const userPrompt = `Gere um laudo médico para o seguinte exame:

TIPO DE EXAME: ${examType}

DADOS DO EXAME:
${examData}

ACHADOS PRELIMINARES:
${preliminaryFindings || 'Não informado'}

Gere um laudo completo, profissional e técnico.`

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const reportContent = JSON.parse(
      completion.choices[0].message.content || '{}'
    )

    // Salvar laudo no banco
    const { data: report, error: reportError } = await supabase
      .from('medical_reports')
      .insert({
        appointment_id: appointmentId || null,
        patient_id: patientId,
        doctor_id: user.id,
        exam_type: examType,
        report_content: reportContent,
        ai_generated: true,
        ai_model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        reviewed_by_doctor: false,
        signed: false,
      })
      .select()
      .single()

    if (reportError) {
      console.error('Erro ao salvar laudo:', reportError)
      throw reportError
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      content: reportContent,
    })
  } catch (error: any) {
    console.error('Erro ao gerar laudo:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar laudo médico' },
      { status: 500 }
    )
  }
}
