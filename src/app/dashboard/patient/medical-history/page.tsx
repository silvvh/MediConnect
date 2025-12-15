'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  FileText,
  Pill,
  Stethoscope,
  Loader2,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface HistoryEvent {
  id: string
  event_type: string
  event_id?: string | null
  title: string
  description?: string | null
  date: string
  doctor_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export default function MedicalHistoryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isPatient, setIsPatient] = useState(false)

  useEffect(() => {
    checkRoleAndLoad()
  }, [])

  async function checkRoleAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'patient') {
        router.push('/dashboard')
        return
      }

      setIsPatient(true)
      await loadHistory(user.id)
    } catch (error: any) {
      console.error('Erro ao verificar role:', error)
      router.push('/dashboard')
    }
  }

  async function loadHistory(userId: string) {
    try {
      // Buscar histórico médico
      const { data: history, error: historyError } = await supabase
        .from('medical_history')
        .select('*')
        .order('date', { ascending: false })

      if (historyError) throw historyError

      // Buscar consultas
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, scheduled_at, status, doctor_id')
        .eq('patient_id', userId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })

      // Buscar prontuários
      const { data: records } = await supabase
        .from('medical_records')
        .select('id, appointment_id, created_at, doctor_id')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })

      // Buscar receitas
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('id, created_at, medications, doctor_id')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })

      // Buscar laudos
      const { data: reports } = await supabase
        .from('medical_reports')
        .select('id, exam_type, created_at, doctor_id')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })

      // Buscar nomes dos médicos (se necessário)
      const doctorIds = new Set<string>()
      appointments?.forEach((apt: any) => apt.doctor_id && doctorIds.add(apt.doctor_id))
      records?.forEach((rec: any) => rec.doctor_id && doctorIds.add(rec.doctor_id))
      prescriptions?.forEach((pres: any) => pres.doctor_id && doctorIds.add(pres.doctor_id))
      reports?.forEach((rep: any) => rep.doctor_id && doctorIds.add(rep.doctor_id))

      const { data: doctorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(doctorIds))

      const doctorNames = new Map<string, string>()
      doctorProfiles?.forEach((profile: any) => {
        doctorNames.set(profile.id, profile.full_name)
      })

      // Combinar todos os eventos
      const allEvents: HistoryEvent[] = []

      // Adicionar consultas
      appointments?.forEach((apt: any) => {
        const doctorName = doctorNames.get(apt.doctor_id) || 'Médico'
        allEvents.push({
          id: apt.id,
          event_type: 'consultation',
          event_id: apt.id,
          title: `Consulta com ${doctorName}`,
          description: `Consulta realizada em ${format(new Date(apt.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
          date: apt.scheduled_at.split('T')[0],
          doctor_id: apt.doctor_id,
          created_at: apt.scheduled_at,
        })
      })

      // Adicionar prontuários
      records?.forEach((record: any) => {
        const doctorName = doctorNames.get(record.doctor_id) || 'Médico'
        allEvents.push({
          id: record.id,
          event_type: 'report',
          event_id: record.appointment_id,
          title: `Prontuário - ${doctorName}`,
          description: 'Prontuário médico da consulta',
          date: record.created_at.split('T')[0],
          doctor_id: record.doctor_id,
          created_at: record.created_at,
        })
      })

      // Adicionar receitas
      prescriptions?.forEach((prescription: any) => {
        const doctorName = doctorNames.get(prescription.doctor_id) || 'Médico'
        const medNames = prescription.medications
          .map((m: any) => m.name)
          .join(', ')
        allEvents.push({
          id: prescription.id,
          event_type: 'prescription',
          event_id: prescription.id,
          title: `Receita Médica - ${doctorName}`,
          description: `Medicações: ${medNames}`,
          date: prescription.created_at.split('T')[0],
          doctor_id: prescription.doctor_id,
          created_at: prescription.created_at,
        })
      })

      // Adicionar laudos
      reports?.forEach((report: any) => {
        const doctorName = doctorNames.get(report.doctor_id) || 'Médico'
        allEvents.push({
          id: report.id,
          event_type: 'exam',
          event_id: report.id,
          title: `Laudo - ${report.exam_type}`,
          description: `Laudo médico elaborado por ${doctorName}`,
          date: report.created_at.split('T')[0],
          doctor_id: report.doctor_id,
          created_at: report.created_at,
        })
      })

      // Ordenar por data
      allEvents.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      setEvents(allEvents)
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  function getEventIcon(type: string) {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="w-5 h-5" />
      case 'prescription':
        return <Pill className="w-5 h-5" />
      case 'exam':
      case 'report':
        return <FileText className="w-5 h-5" />
      default:
        return <Calendar className="w-5 h-5" />
    }
  }

  function getEventColor(type: string) {
    switch (type) {
      case 'consultation':
        return 'bg-blue-100 text-blue-700'
      case 'prescription':
        return 'bg-green-100 text-green-700'
      case 'exam':
      case 'report':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!isPatient) {
    return null
  }

  // Agrupar eventos por data
  const eventsByDate = events.reduce((acc, event) => {
    const date = event.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, HistoryEvent[]>)

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Histórico Médico</h1>
        <p className="text-gray-500">Visualize todo o seu histórico de atendimentos</p>
      </div>

      <div className="space-y-6">
        {Object.keys(eventsByDate).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum histórico encontrado</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(eventsByDate).map(([date, dateEvents]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold">
                  {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
              </div>

              <div className="space-y-3">
                {dateEvents.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${getEventColor(event.event_type)}`}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold">{event.title}</h3>
                            <Badge className={getEventColor(event.event_type)}>
                              {event.event_type === 'consultation' && 'Consulta'}
                              {event.event_type === 'prescription' && 'Receita'}
                              {event.event_type === 'exam' && 'Exame'}
                              {event.event_type === 'report' && 'Prontuário'}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {format(new Date(event.created_at), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

