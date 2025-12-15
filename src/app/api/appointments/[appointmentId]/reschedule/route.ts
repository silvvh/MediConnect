import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAppointmentNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { newScheduledAt } = await request.json()

    if (!newScheduledAt) {
      return NextResponse.json(
        { error: 'Nova data e hora são obrigatórias' },
        { status: 400 }
      )
    }

    // Buscar agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*, patient_id, doctor_id, status')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (paciente ou médico)
    if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para reagendar este agendamento' },
        { status: 403 }
      )
    }

    // Verificar se pode ser reagendado (não pode estar em andamento ou cancelado)
    if (appointment.status === 'in_progress' || appointment.status === 'completed' || appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Este agendamento não pode ser reagendado' },
        { status: 400 }
      )
    }

    // Verificar disponibilidade do médico no novo horário
    const { data: conflictingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', appointment.doctor_id)
      .eq('status', 'confirmed')
      .gte('scheduled_at', new Date(new Date(newScheduledAt).getTime() - 60 * 60 * 1000).toISOString())
      .lte('scheduled_at', new Date(new Date(newScheduledAt).getTime() + 60 * 60 * 1000).toISOString())
      .neq('id', appointmentId)
      .single()

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'O médico não está disponível neste horário' },
        { status: 400 }
      )
    }

    // Atualizar agendamento
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        scheduled_at: newScheduledAt,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateError) {
      throw updateError
    }

    // Enviar notificação
    try {
      await sendAppointmentNotification({
        appointmentId,
        type: 'rescheduled'
      })
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
      // Não falhar a operação se a notificação falhar
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rescheduling appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao reagendar consulta' },
      { status: 500 }
    )
  }
}

