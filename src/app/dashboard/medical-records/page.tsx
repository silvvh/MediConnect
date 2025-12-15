'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Calendar,
  User,
  Loader2,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'

interface MedicalRecord {
  id: string
  appointment_id: string | null
  patient_id: string
  created_at: string
  signed: boolean
  reviewed_by_doctor: boolean
  appointments?: {
    scheduled_at: string
    patients: {
      profiles: {
        full_name: string
      }
    }
  }
}

export default function MedicalRecordsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Verificar se é médico
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'doctor') {
        router.push('/dashboard')
        return
      }

      // Buscar prontuários do médico
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          id,
          appointment_id,
          patient_id,
          created_at,
          signed,
          reviewed_by_doctor,
          appointments (
            scheduled_at,
            patients (
              profiles (
                full_name
              )
            )
          )
        `)
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords((data || []) as any)
    } catch (error: any) {
      console.error('Erro ao carregar prontuários:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Prontuários Médicos</h1>
          <p className="text-gray-500">Gerencie todos os prontuários criados</p>
        </div>
      </div>

      <div className="space-y-4">
        {records.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Nenhum prontuário encontrado</p>
              <p className="text-sm text-gray-400">
                Os prontuários aparecerão aqui após serem criados durante as consultas
              </p>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-lg">
                        {record.appointments?.patients?.profiles?.full_name || 'Paciente'}
                      </h3>
                      <div className="flex gap-2">
                        {record.signed ? (
                          <Badge className="bg-green-100 text-green-700">
                            Assinado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                            Não Assinado
                          </Badge>
                        )}
                        {record.reviewed_by_doctor ? (
                          <Badge className="bg-blue-100 text-blue-700">
                            Revisado
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {record.appointments?.scheduled_at
                          ? format(new Date(record.appointments.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })
                          : format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Prontuário #{record.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {record.appointment_id && (
                      <Link href={`/dashboard/appointments/${record.appointment_id}/medical-record`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

