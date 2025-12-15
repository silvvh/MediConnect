'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FileText, 
  Calendar,
  Loader2,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
}

interface Prescription {
  id: string
  appointment_id?: string | null
  patient_id: string
  doctor_id: string
  medications: Medication[]
  instructions?: string | null
  valid_until?: string | null
  signed: boolean
  signed_at?: string | null
  created_at: string
}

export default function PrescriptionsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    patientId: '',
    appointmentId: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }] as Medication[],
    instructions: '',
    validUntil: '',
  })

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

      if (!profile) {
        router.push('/dashboard')
        return
      }

      setUserRole(profile.role)

      // Apenas médicos podem criar receitas, pacientes só veem
      if (profile.role === 'patient') {
        await loadPrescriptions(user.id, 'patient')
      } else if (profile.role === 'doctor') {
        await loadPrescriptions(user.id, 'doctor')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Erro ao verificar role:', error)
      router.push('/dashboard')
    }
  }

  async function loadPrescriptions(userId: string, role: string) {
    try {
      let query = supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (role === 'doctor') {
        query = query.eq('doctor_id', userId)
      } else if (role === 'patient') {
        query = query.eq('patient_id', userId)
      }

      const { data, error } = await query

      if (error) throw error
      setPrescriptions(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar receitas:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as receitas.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!formData.patientId || formData.medications.length === 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o paciente e pelo menos um medicamento.',
        variant: 'destructive'
      })
      return
    }

    try {
      setCreating(true)

      const response = await fetch('/api/prescriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: formData.appointmentId || null,
          patientId: formData.patientId,
          medications: formData.medications.filter(m => m.name),
          instructions: formData.instructions || null,
          validUntil: formData.validUntil || null,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast({
        title: 'Receita criada!',
        description: 'A receita foi criada com sucesso.',
      })

      setShowForm(false)
      setFormData({
        patientId: '',
        appointmentId: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
        instructions: '',
        validUntil: '',
      })
      loadPrescriptions()
    } catch (error: any) {
      console.error('Erro ao criar receita:', error)
      toast({
        title: 'Erro ao criar',
        description: error.message || 'Não foi possível criar a receita.',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  function addMedication() {
    setFormData({
      ...formData,
      medications: [...formData.medications, { name: '', dosage: '', frequency: '', duration: '' }]
    })
  }

  function removeMedication(index: number) {
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index)
    })
  }

  function updateMedication(index: number, field: keyof Medication, value: string) {
    const newMedications = [...formData.medications]
    newMedications[index] = { ...newMedications[index], [field]: value }
    setFormData({ ...formData, medications: newMedications })
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
          <h1 className="text-3xl font-bold mb-2">Receitas Médicas</h1>
          <p className="text-gray-500">Gerencie receitas médicas digitais</p>
        </div>
        {userRole === 'doctor' && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-5 h-5 mr-2" />
            Nova Receita
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">ID do Paciente *</Label>
                <Input
                  id="patientId"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  placeholder="UUID do paciente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentId">ID do Agendamento (Opcional)</Label>
                <Input
                  id="appointmentId"
                  value={formData.appointmentId}
                  onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                  placeholder="UUID do agendamento"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medicações *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Medicamento
                </Button>
              </div>

              {formData.medications.map((med, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Medicamento {index + 1}</span>
                    {formData.medications.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Medicamento *</Label>
                      <Input
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        placeholder="Ex: Paracetamol"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dosagem *</Label>
                      <Input
                        value={med.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        placeholder="Ex: 500mg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Frequência *</Label>
                      <Input
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        placeholder="Ex: 3x ao dia"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duração *</Label>
                      <Input
                        value={med.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        placeholder="Ex: 7 dias"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções Adicionais</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
                placeholder="Instruções especiais para o paciente..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Válido até (Opcional)</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Criar Receita
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {prescriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhuma receita encontrada</p>
            </CardContent>
          </Card>
        ) : (
          prescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Receita #{prescription.id.slice(0, 8)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {prescription.signed ? (
                      <Badge className="bg-green-100 text-green-700">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Assinada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Não Assinada
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Data:</span>{' '}
                    {new Date(prescription.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  {prescription.valid_until && (
                    <div>
                      <span className="font-medium">Válido até:</span>{' '}
                      {new Date(prescription.valid_until).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Medicações:</Label>
                  <div className="space-y-2">
                    {prescription.medications.map((med, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{med.name}</p>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mt-1">
                          <div>
                            <span className="font-medium">Dosagem:</span> {med.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Frequência:</span> {med.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Duração:</span> {med.duration}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {prescription.instructions && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Instruções:</Label>
                    <p className="text-sm text-gray-700">{prescription.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

