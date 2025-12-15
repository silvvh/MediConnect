import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        { error: 'Apenas médicos podem criar receitas' },
        { status: 403 }
      )
    }

    const {
      appointmentId,
      patientId,
      medications,
      instructions,
      validUntil,
    } = await request.json()

    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { error: 'Paciente e medicações são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar receita
    const { data: prescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert({
        appointment_id: appointmentId || null,
        patient_id: patientId,
        doctor_id: user.id,
        medications,
        instructions: instructions || null,
        valid_until: validUntil || null,
        signed: false,
      })
      .select()
      .single()

    if (prescriptionError) {
      console.error('Erro ao criar receita:', prescriptionError)
      throw prescriptionError
    }

    return NextResponse.json({
      success: true,
      prescription,
    })
  } catch (error: any) {
    console.error('Erro ao criar receita:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar receita' },
      { status: 500 }
    )
  }
}

