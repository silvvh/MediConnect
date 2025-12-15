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

    const { reason } = await request.json()

    // Buscar agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*, patient_id, doctor_id, status, scheduled_at')
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
        { error: 'Sem permissão para cancelar este agendamento' },
        { status: 403 }
      )
    }

    // Verificar se pode ser cancelado
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Este agendamento não pode ser cancelado' },
        { status: 400 }
      )
    }

    // Verificar política de cancelamento (24h antes)
    const appointmentDate = new Date(appointment.scheduled_at)
    const now = new Date()
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilAppointment < 24 && appointment.patient_id === user.id) {
      return NextResponse.json(
        { error: 'Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência' },
        { status: 400 }
      )
    }

    // Atualizar agendamento
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelado: ${reason}` : appointment.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateError) {
      throw updateError
    }

    // Processar reembolso se necessário (implementar lógica de reembolso)
    // Por enquanto, apenas marcar como cancelado

    // Enviar notificação
    try {
      await sendAppointmentNotification({
        appointmentId,
        type: 'cancelled'
      })
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar consulta' },
      { status: 500 }
    )
  }
}

