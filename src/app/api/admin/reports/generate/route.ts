import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    const { reportType, period, startDate, endDate } = await request.json()

    if (!reportType) {
      return NextResponse.json(
        { error: 'Tipo de relatório é obrigatório' },
        { status: 400 }
      )
    }

    // Calcular período
    let dateStart: Date
    let dateEnd: Date = new Date()

    switch (period) {
      case 'week':
        dateStart = new Date(dateEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        dateStart = new Date(dateEnd.getFullYear(), dateEnd.getMonth(), 1)
        break
      case 'quarter':
        const quarter = Math.floor(dateEnd.getMonth() / 3)
        dateStart = new Date(dateEnd.getFullYear(), quarter * 3, 1)
        break
      case 'year':
        dateStart = new Date(dateEnd.getFullYear(), 0, 1)
        break
      case 'custom':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'Data inicial e final são obrigatórias para período customizado' },
            { status: 400 }
          )
        }
        dateStart = new Date(startDate)
        dateEnd = new Date(endDate)
        break
      default:
        dateStart = new Date(dateEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    let report: any = {}

    switch (reportType) {
      case 'financial':
        // Relatório financeiro
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'paid')
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0) || 0
        const totalOrders = orders?.length || 0
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        report = {
          type: 'financial',
          period: { start: dateStart, end: dateEnd },
          totalRevenue,
          totalOrders,
          averageOrderValue,
          orders: orders?.map(order => ({
            id: order.id,
            amount: order.total_amount,
            date: order.created_at,
            status: order.status
          }))
        }
        break

      case 'users':
        // Relatório de usuários
        const { data: users } = await supabase
          .from('profiles')
          .select('id, role, created_at')
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        const usersByRole = users?.reduce((acc: any, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1
          return acc
        }, {}) || {}

        report = {
          type: 'users',
          period: { start: dateStart, end: dateEnd },
          totalUsers: users?.length || 0,
          usersByRole,
          users: users?.map(user => ({
            id: user.id,
            role: user.role,
            createdAt: user.created_at
          }))
        }
        break

      case 'appointments':
        // Relatório de consultas
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, status, scheduled_at, created_at')
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        const appointmentsByStatus = appointments?.reduce((acc: any, apt) => {
          acc[apt.status] = (acc[apt.status] || 0) + 1
          return acc
        }, {}) || {}

        report = {
          type: 'appointments',
          period: { start: dateStart, end: dateEnd },
          totalAppointments: appointments?.length || 0,
          appointmentsByStatus,
          appointments: appointments?.map(apt => ({
            id: apt.id,
            status: apt.status,
            scheduledAt: apt.scheduled_at,
            createdAt: apt.created_at
          }))
        }
        break

      case 'products':
        // Relatório de produtos
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, category, active')

        const { data: productOrders } = await supabase
          .from('orders')
          .select('items')
          .eq('status', 'paid')
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        const productSales: Record<string, number> = {}
        productOrders?.forEach(order => {
          if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              if (item.product_id) {
                productSales[item.product_id] = (productSales[item.product_id] || 0) + (item.quantity || 1)
              }
            })
          }
        })

        report = {
          type: 'products',
          period: { start: dateStart, end: dateEnd },
          totalProducts: products?.length || 0,
          activeProducts: products?.filter(p => p.active).length || 0,
          productSales,
          products: products?.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            active: product.active,
            sales: productSales[product.id] || 0
          }))
        }
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de relatório inválido' },
          { status: 400 }
        )
    }

    return NextResponse.json({ report })
  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}

