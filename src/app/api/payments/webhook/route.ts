import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { appointmentId, userId, orderId, orderNumber, type } = session.metadata || {}

      if (type === 'products' && orderId) {
        // Atualizar status do pedido de produtos
        if (session.payment_status === 'paid') {
          await supabase
            .from('orders')
            .update({ 
              status: 'paid',
              payment_id: session.id,
            })
            .eq('id', orderId)

          // Limpar carrinho
          if (userId) {
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', userId)
          }

          console.log('Product payment successful:', session.id, 'Order:', orderId)
        }
      } else if (appointmentId) {
        // Atualizar status do pagamento de consulta
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('payment_id', session.id)

        // Confirmar agendamento apenas se o pagamento foi bem-sucedido
        if (session.payment_status === 'paid') {
          await supabase
            .from('appointments')
            .update({ 
              status: 'confirmed',
            })
            .eq('id', appointmentId)
        }

        console.log('Appointment payment successful:', session.id)
      }
      break
    }

    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      const { appointmentId } = session.metadata || {}

      if (appointmentId) {
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('payment_id', session.id)

        await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', appointmentId)

        console.log('Async payment succeeded:', session.id)
      }
      break
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { appointmentId } = session.metadata || {}

      if (appointmentId) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('payment_id', session.id)

        console.log('Async payment failed:', session.id)
      }
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      const { appointmentId } = session.metadata || {}

      if (appointmentId) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('payment_id', session.id)

        console.log('Payment session expired:', session.id)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      
      // Buscar order pelo payment_intent_id
      const { data: order } = await supabase
        .from('orders')
        .select('id, payment_id')
        .eq('payment_id', paymentIntent.id)
        .single()

      if (order) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id)
      }

      console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)
      break
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      
      // Buscar order pelo payment_intent_id
      const { data: order } = await supabase
        .from('orders')
        .select('id, items')
        .eq('payment_id', paymentIntent.id)
        .single()

      if (order && order.items) {
        const items = order.items as any[]
        const appointmentId = items[0]?.appointmentId

        if (appointmentId) {
          await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', order.id)

          await supabase
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', appointmentId)
        }
      }

      console.log('Payment intent succeeded:', paymentIntent.id)
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      
      // Buscar order relacionada
      const { data: order } = await supabase
        .from('orders')
        .select('id, items')
        .eq('payment_id', charge.payment_intent as string)
        .single()

      if (order) {
        await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('id', order.id)

        const items = order.items as any[]
        const appointmentId = items[0]?.appointmentId

        if (appointmentId) {
          await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointmentId)
        }

        console.log('Charge refunded:', charge.id)
      }
      break
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute
      console.warn('Dispute created:', dispute.id, 'Charge:', dispute.charge)
      // Você pode querer notificar o admin ou atualizar o status do pedido
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

