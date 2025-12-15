import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { appointmentId } = await request.json()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar detalhes do agendamento
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor:doctors!inner (
          consultation_price,
          profiles!inner (
            full_name
          )
        )
      `)
      .eq('id', appointmentId)
      .eq('patient_id', user.id)
      .single()

    if (error || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const price = appointment.doctor.consultation_price || 15000 // R$ 150.00 default (em centavos)
    
    // profiles é um array mesmo em relação 1:1, acessar primeiro elemento
    const doctorProfile = Array.isArray(appointment.doctor.profiles) 
      ? appointment.doctor.profiles[0] 
      : appointment.doctor.profiles;

    // Criar Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Consulta com ${doctorProfile?.full_name || 'Médico'}`,
              description: 'Teleconsulta médica',
            },
            unit_amount: Math.round(price * 100), // Converter para centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments/${appointmentId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments/${appointmentId}?payment=cancelled`,
      metadata: {
        appointmentId,
        userId: user.id,
      },
    })

    // Criar registro de pagamento
    await supabase
      .from('orders')
      .insert({
        patient_id: user.id,
        total_amount: price,
        status: 'pending',
        payment_provider: 'stripe',
        payment_id: session.id,
        items: [
          {
            type: 'consultation',
            appointmentId,
            price
          }
        ]
      })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

