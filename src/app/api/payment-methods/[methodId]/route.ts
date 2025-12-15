import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> }
) {
  try {
    const { methodId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o método pertence ao usuário
    const { data: method, error: methodError } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', methodId)
      .eq('user_id', user.id)
      .single()

    if (methodError || !method) {
      return NextResponse.json(
        { error: 'Método de pagamento não encontrado' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', methodId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao remover método de pagamento' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> }
) {
  try {
    const { methodId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { isDefault } = await request.json()

    const { data: method, error: methodError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', methodId)
      .eq('user_id', user.id)
      .single()

    if (methodError || !method) {
      return NextResponse.json(
        { error: 'Método de pagamento não encontrado' },
        { status: 404 }
      )
    }

    if (isDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', methodId)
    }
    const { data: updatedMethod, error: updateError } = await supabase
      .from('payment_methods')
      .update({ is_default: isDefault })
      .eq('id', methodId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ paymentMethod: updatedMethod })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar método de pagamento' },
      { status: 500 }
    )
  }
}

