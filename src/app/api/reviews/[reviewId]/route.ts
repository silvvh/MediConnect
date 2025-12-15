import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH - Atualizar avaliação
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { rating, comment } = await request.json()

    // Verificar se a avaliação existe e pertence ao usuário
    const { data: review, error: reviewError } = await supabase
      .from('consultation_reviews')
      .select('reviewer_id')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    if (review.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para editar esta avaliação' },
        { status: 403 }
      )
    }

    // Atualizar avaliação
    const updateData: any = {}
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Avaliação deve ser entre 1 e 5' },
          { status: 400 }
        )
      }
      updateData.rating = rating
    }
    if (comment !== undefined) {
      updateData.comment = comment
    }
    updateData.updated_at = new Date().toISOString()

    const { data: updatedReview, error: updateError } = await supabase
      .from('consultation_reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ review: updatedReview })
  } catch (error: any) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar avaliação' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar avaliação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se a avaliação existe e pertence ao usuário
    const { data: review, error: reviewError } = await supabase
      .from('consultation_reviews')
      .select('reviewer_id')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    if (review.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para deletar esta avaliação' },
        { status: 403 }
      )
    }

    // Deletar avaliação
    const { error: deleteError } = await supabase
      .from('consultation_reviews')
      .delete()
      .eq('id', reviewId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar avaliação' },
      { status: 500 }
    )
  }
}

