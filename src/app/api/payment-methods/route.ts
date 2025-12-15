import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

      if (profile?.stripe_customer_id) {
        const stripeMethods = await stripe.paymentMethods.list({
          customer: profile.stripe_customer_id,
          type: 'card',
        })

        for (const method of stripeMethods.data) {
          const existing = paymentMethods?.find(
            (pm) => pm.stripe_payment_method_id === method.id
          )

          if (!existing && method.card) {
            await supabase.from('payment_methods').insert({
              user_id: user.id,
              stripe_payment_method_id: method.id,
              type: 'card',
              last4: method.card.last4,
              brand: method.card.brand,
              exp_month: method.card.exp_month,
              exp_year: method.card.exp_year,
            })
          }
        }
      }
    } catch (stripeError) {
      // Continuar mesmo se houver erro no Stripe
    }

    // Buscar novamente após sincronização
    const { data: updatedMethods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    return NextResponse.json({ paymentMethods: updatedMethods || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar métodos de pagamento' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { paymentMethodId, setAsDefault } = await request.json()

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'ID do método de pagamento é obrigatório' },
        { status: 400 }
      )
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    if (!paymentMethod.card) {
      return NextResponse.json(
        { error: 'Método de pagamento inválido' },
        { status: 400 }
      )
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })

    if (setAsDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    // Salvar no banco
    const { data: savedMethod, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_payment_method_id: paymentMethodId,
        type: 'card',
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
        is_default: setAsDefault || false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ paymentMethod: savedMethod }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar método de pagamento' },
      { status: 500 }
    )
  }
}

