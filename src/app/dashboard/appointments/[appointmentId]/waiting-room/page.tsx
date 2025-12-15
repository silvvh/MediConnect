'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Video, Mic, MicOff, VideoOff, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function WaitingRoomPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.appointmentId as string
  const supabase = createClient()

  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [creatingRoom, setCreatingRoom] = useState(false)

  useEffect(() => {
    fetchAppointment()
  }, [appointmentId])

  async function fetchAppointment() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          status,
          duration_minutes,
          doctor:doctors!inner (
            id,
            specialty,
            profiles!inner (
              full_name,
              avatar_url
            )
          ),
          patient:patients!inner (
            id,
            profiles!inner (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (error) throw error
      setAppointment(data)
    } catch (error) {
      console.error('Error fetching appointment:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinCall() {
    try {
      setCreatingRoom(true)

      // Criar sala de vídeo
      const response = await fetch('/api/video/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      // Redirecionar para sala de vídeo
      router.push(`/dashboard/appointments/${appointmentId}/video?room=${data.roomName}`)
    } catch (error) {
      console.error('Error joining call:', error)
      alert('Erro ao entrar na chamada. Tente novamente.')
    } finally {
      setCreatingRoom(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Consulta não encontrada</p>
            <Button onClick={() => router.push('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const doctor = appointment.doctor
  const scheduledTime = new Date(appointment.scheduled_at)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Video className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Sala de Espera</h1>
          <p className="text-gray-600">
            Verifique sua câmera e microfone antes de entrar
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Preview de Vídeo */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Preview da Câmera</h2>
              
              {/* Simulação de preview */}
              <div className="aspect-video bg-gray-900 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                {videoEnabled ? (
                  <div className="text-white text-center">
                    <User className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Sua câmera aparecerá aqui</p>
                  </div>
                ) : (
                  <div className="text-white text-center">
                    <VideoOff className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Câmera desligada</p>
                  </div>
                )}
              </div>

              {/* Controles */}
              <div className="flex justify-center gap-4">
                <Button
                  variant={audioEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="flex-1"
                >
                  {audioEnabled ? (
                    <><Mic className="w-5 h-5 mr-2" /> Microfone</>
                  ) : (
                    <><MicOff className="w-5 h-5 mr-2" /> Mudo</>
                  )}
                </Button>

                <Button
                  variant={videoEnabled ? "default" : "destructive"}
                  size="lg"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className="flex-1"
                >
                  {videoEnabled ? (
                    <><Video className="w-5 h-5 mr-2" /> Câmera</>
                  ) : (
                    <><VideoOff className="w-5 h-5 mr-2" /> Câmera Off</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Consulta */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Informações da Consulta</h2>

                <div className="flex items-start gap-4 mb-6">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={doctor.profiles.avatar_url} />
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {doctor.profiles.full_name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{doctor.profiles.full_name}</p>
                    <p className="text-gray-500">{doctor.specialty}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Data e Horário</p>
                      <p className="font-medium">
                        {format(scheduledTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Video className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Duração</p>
                      <p className="font-medium">{appointment.duration_minutes} minutos</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Dicas para uma boa consulta:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Certifique-se de estar em um local tranquilo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Verifique sua conexão de internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Tenha seus exames e documentos à mão</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Use fones de ouvido para melhor qualidade</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button
              onClick={handleJoinCall}
              disabled={creatingRoom}
              className="w-full h-14 bg-secondary-500 hover:bg-secondary-600 text-lg font-semibold"
            >
              {creatingRoom ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Entrar na Consulta
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

