import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AppointmentNotificationParams {
  appointmentId: string
  type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'cancelled' | 'rescheduled'
}

export async function sendAppointmentNotification({
  appointmentId,
  type
}: AppointmentNotificationParams) {
  try {
    // Buscar dados do agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        status,
        patient:patients!inner (
          profiles!inner (
            full_name,
            email:auth.users!inner(email)
          )
        ),
        doctor:doctors!inner (
          profiles!inner (
            full_name,
            email:auth.users!inner(email)
          ),
          specialty
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }

    // profiles é um array mesmo em relação 1:1, acessar primeiro elemento
    const appointmentAny = appointment as any
    const patientProfilesArray = appointmentAny.patient?.profiles || []
    const doctorProfilesArray = appointmentAny.doctor?.profiles || []
    
    const patientProfiles = Array.isArray(patientProfilesArray) 
      ? patientProfilesArray[0] 
      : patientProfilesArray
    const doctorProfiles = Array.isArray(doctorProfilesArray) 
      ? doctorProfilesArray[0] 
      : doctorProfilesArray
    
    const patientEmail = patientProfiles?.email
    const doctorEmail = doctorProfiles?.email
    const scheduledDate = new Date(appointment.scheduled_at)
    const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    let subject = ''
    let html = ''

    switch (type) {
      case 'confirmation':
        subject = `Consulta confirmada - ${doctorProfiles?.full_name || 'Médico'}`
        html = `
          <h2>Consulta Confirmada</h2>
          <p>Olá ${patientProfiles?.full_name || 'Paciente'},</p>
          <p>Sua consulta com Dr(a). ${doctorProfiles?.full_name || 'Médico'} foi confirmada.</p>
          <p><strong>Data e Hora:</strong> ${formattedDate}</p>
          <p><strong>Especialidade:</strong> ${appointmentAny.doctor?.specialty || 'Não informada'}</p>
          <p>Você receberá um lembrete 24 horas antes da consulta.</p>
        `
        break

      case 'reminder_24h':
        subject = `Lembrete: Consulta em 24 horas`
        html = `
          <h2>Lembrete de Consulta</h2>
          <p>Olá ${patientProfiles?.full_name || 'Paciente'},</p>
          <p>Este é um lembrete de que sua consulta com Dr(a). ${doctorProfiles?.full_name || 'Médico'} está agendada para amanhã.</p>
          <p><strong>Data e Hora:</strong> ${formattedDate}</p>
          <p>Por favor, esteja disponível alguns minutos antes do horário agendado.</p>
        `
        break

      case 'reminder_1h':
        subject = `Lembrete: Consulta em 1 hora`
        html = `
          <h2>Lembrete de Consulta</h2>
          <p>Olá ${patientProfiles?.full_name || 'Paciente'},</p>
          <p>Sua consulta com Dr(a). ${doctorProfiles?.full_name || 'Médico'} está agendada para daqui a 1 hora.</p>
          <p><strong>Data e Hora:</strong> ${formattedDate}</p>
          <p>Por favor, acesse a plataforma alguns minutos antes para entrar na sala de espera.</p>
        `
        break

      case 'cancelled':
        subject = `Consulta Cancelada`
        html = `
          <h2>Consulta Cancelada</h2>
          <p>Olá ${patientProfiles?.full_name || 'Paciente'},</p>
          <p>Infelizmente, sua consulta com Dr(a). ${doctorProfiles?.full_name || 'Médico'} foi cancelada.</p>
          <p><strong>Data e Hora original:</strong> ${formattedDate}</p>
          <p>Você pode agendar uma nova consulta através da plataforma.</p>
        `
        break

      case 'rescheduled':
        subject = `Consulta Reagendada`
        html = `
          <h2>Consulta Reagendada</h2>
          <p>Olá ${patientProfiles?.full_name || 'Paciente'},</p>
          <p>Sua consulta com Dr(a). ${doctorProfiles?.full_name || 'Médico'} foi reagendada.</p>
          <p><strong>Nova Data e Hora:</strong> ${formattedDate}</p>
          <p>Por favor, confirme sua disponibilidade para o novo horário.</p>
        `
        break
    }

    // Enviar email para o paciente
    if (patientEmail) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: patientEmail,
          subject,
          html,
          type: 'appointment_notification'
        })
      })
    }

    // Enviar notificação para o médico também (exceto para confirmação)
    if (doctorEmail && type !== 'confirmation') {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: doctorEmail,
          subject: `Notificação: ${subject}`,
          html: html.replace(patientProfiles?.full_name || 'Paciente', 'Dr(a). ' + (doctorProfiles?.full_name || 'Médico')),
          type: 'appointment_notification'
        })
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending appointment notification:', error)
    throw error
  }
}
