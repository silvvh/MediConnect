import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Buscar avaliações
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const appointmentId = searchParams.get('appointmentId')

    let query = supabase
      .from('consultation_reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(full_name, avatar_url),
        appointment:appointments(id, scheduled_at)
      `)
      .order('created_at', { ascending: false })

    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId)
    }

    const { data: reviews, error } = await query

    if (error) throw error

    return NextResponse.json({ reviews })
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar avaliações' },
      { status: 500 }
    )
  }
}

// POST - Criar avaliação
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { appointmentId, rating, comment } = await request.json()

    if (!appointmentId || !rating) {
      return NextResponse.json(
        { error: 'ID do agendamento e avaliação são obrigatórios' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Avaliação deve ser entre 1 e 5' },
        { status: 400 }
      )
    }

    // Verificar se o agendamento existe e foi completado
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id, status')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    if (appointment.patient_id !== user.id) {
      return NextResponse.json(
        { error: 'Apenas o paciente pode avaliar a consulta' },
        { status: 403 }
      )
    }

    if (appointment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Apenas consultas completadas podem ser avaliadas' },
        { status: 400 }
      )
    }

    // Verificar se já existe avaliação
    const { data: existingReview } = await supabase
      .from('consultation_reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('reviewer_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Você já avaliou esta consulta' },
        { status: 400 }
      )
    }

    // Criar avaliação
    const { data: review, error: reviewError } = await supabase
      .from('consultation_reviews')
      .insert({
        appointment_id: appointmentId,
        reviewer_id: user.id,
        doctor_id: appointment.doctor_id,
        rating,
        comment: comment || null
      })
      .select()
      .single()

    if (reviewError) throw reviewError

    return NextResponse.json({ review }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar avaliação' },
      { status: 500 }
    )
  }
}

