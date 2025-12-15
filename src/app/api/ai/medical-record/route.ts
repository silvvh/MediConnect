import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se é médico
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "doctor") {
      return NextResponse.json(
        { error: "Apenas médicos podem gerar prontuários" },
        { status: 403 }
      );
    }

    const { appointmentId, notes, chiefComplaint, symptoms } = await request.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID do agendamento é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar dados do agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        doctor_id,
        patient_id
      `)
      .eq("id", appointmentId)
      .eq("doctor_id", user.id)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    // Buscar dados do paciente
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(`
        id,
        profiles!inner (
          full_name,
          birth_date
        )
      `)
      .eq("id", appointment.patient_id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: "OpenAI não configurado" },
        { status: 500 }
      );
    }

    // Preparar prompt para IA
    const systemPrompt = `Você é um assistente médico especializado em elaborar prontuários eletrônicos seguindo o formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).

IMPORTANTE: Sua resposta deve ser APENAS um objeto JSON válido, sem markdown, sem texto adicional, sem explicações. Formato:

{
  "subjective": {
    "chief_complaint": "string",
    "history_present_illness": "string",
    "review_systems": "string"
  },
  "objective": {
    "vital_signs": {
      "blood_pressure": "string",
      "heart_rate": "string",
      "temperature": "string",
      "respiratory_rate": "string"
    },
    "physical_exam": "string"
  },
  "assessment": {
    "primary_diagnosis": "string",
    "differential_diagnoses": ["string"],
    "severity": "leve|moderado|grave"
  },
  "plan": {
    "treatment": "string",
    "medications": [
      {
        "name": "string",
        "dosage": "string",
        "frequency": "string",
        "duration": "string"
      }
    ],
    "exams_requested": ["string"],
    "follow_up": "string",
    "recommendations": ["string"]
  }
}`;

    const patientAge = patient.profiles.birth_date
      ? calculateAge(new Date(patient.profiles.birth_date))
      : "Não informada";

    const userPrompt = `Gere um prontuário médico baseado nas seguintes informações:

PACIENTE: ${patient.profiles.full_name}
IDADE: ${patientAge}

QUEIXA PRINCIPAL: ${chiefComplaint || "Não informado"}

SINTOMAS/OBSERVAÇÕES DA CONSULTA:
${symptoms || "Não informado"}

ANOTAÇÕES DO MÉDICO:
${notes || "Não informado"}

Gere um prontuário completo e profissional no formato SOAP. Use linguagem médica apropriada e seja específico nas recomendações.`;

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Mais determinístico para contexto médico
      response_format: { type: "json_object" },
    });

    const soapContent = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Salvar prontuário no banco
    const { data: record, error: recordError } = await supabase
      .from("medical_records")
      .insert({
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        doctor_id: user.id,
        soap_content: soapContent,
        content: soapContent, // Manter compatibilidade
        ai_generated: true,
        ai_model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        reviewed_by_doctor: false,
        record_type: "consultation",
      })
      .select()
      .single();

    if (recordError) {
      console.error("Erro ao salvar prontuário:", recordError);
      throw recordError;
    }

    return NextResponse.json({
      success: true,
      recordId: record.id,
      content: soapContent,
    });
  } catch (error: any) {
    console.error("Erro ao processar prontuário:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar prontuário" },
      { status: 500 }
    );
  }
}

