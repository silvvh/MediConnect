'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'

interface CheckoutButtonProps {
  appointmentId: string
  amount: number
}

export function CheckoutButton({ appointmentId, amount }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    try {
      setLoading(true)

      // Criar Checkout Session
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // Redirecionar para Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL de checkout não disponível')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700"
      size="lg"
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          Processando...
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5 mr-2" />
          Pagar R$ {(amount / 100).toFixed(2)}
        </>
      )}
    </Button>
  )
}

