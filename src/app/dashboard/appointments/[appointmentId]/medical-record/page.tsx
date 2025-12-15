'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Sparkles, 
  Save, 
  FileCheck, 
  AlertCircle,
  Loader2,
  Edit,
  Eye,
  ArrowLeft
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SOAPContent {
  subjective: {
    chief_complaint: string
    history_present_illness: string
    review_systems: string
  }
  objective: {
    vital_signs: {
      blood_pressure: string
      heart_rate: string
      temperature: string
      respiratory_rate: string
    }
    physical_exam: string
  }
  assessment: {
    primary_diagnosis: string
    differential_diagnoses: string[]
    severity: 'leve' | 'moderado' | 'grave'
  }
  plan: {
    treatment: string
    medications: Array<{
      name: string
      dosage: string
      frequency: string
      duration: string
    }>
    exams_requested: string[]
    follow_up: string
    recommendations: string[]
  }
}

export default function MedicalRecordPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const appointmentId = params.appointmentId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  // Inputs iniciais para IA
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [notes, setNotes] = useState('')

  // Conteúdo SOAP gerado/editado
  const [soapContent, setSoapContent] = useState<SOAPContent | null>(null)
  const [existingRecord, setExistingRecord] = useState<any>(null)

  useEffect(() => {
    checkExistingRecord()
  }, [appointmentId])

  async function checkExistingRecord() {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()

      if (data) {
        setExistingRecord(data)
        // Tentar usar soap_content, se não existir usar content
        const content = data.soap_content || data.content
        setSoapContent(content)
        setMode('preview')
      }
    } catch (error) {
      console.error('Error checking record:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateWithAI() {
    if (!chiefComplaint || !symptoms) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a queixa principal e os sintomas.',
        variant: 'destructive'
      })
      return
    }

    try {
      setGenerating(true)

      const response = await fetch('/api/ai/medical-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          chiefComplaint,
          symptoms,
          notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setSoapContent(data.content)
      setExistingRecord({ id: data.recordId, soap_content: data.content })
      setMode('edit')

      toast({
        title: 'Prontuário gerado!',
        description: 'Revise o conteúdo antes de salvar.',
      })
    } catch (error: any) {
      console.error('Error generating:', error)
      toast({
        title: 'Erro ao gerar',
        description: error.message || 'Não foi possível gerar o prontuário. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!soapContent) return

    try {
      setSaving(true)

      if (existingRecord?.id) {
        const { error } = await supabase
          .from('medical_records')
          .update({
            soap_content: soapContent,
            content: soapContent, // Manter compatibilidade
            reviewed_by_doctor: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)

        if (error) throw error
      } else {
        // Criar novo registro se não existir
        const { data: appointment } = await supabase
          .from('appointments')
          .select('patient_id, doctor_id')
          .eq('id', appointmentId)
          .single()

        if (!appointment) throw new Error('Agendamento não encontrado')

        const { error } = await supabase
          .from('medical_records')
          .insert({
            appointment_id: appointmentId,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            soap_content: soapContent,
            content: soapContent,
            reviewed_by_doctor: true,
            record_type: 'consultation'
          })

        if (error) throw error
      }

      // Atualizar status da consulta
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)

      toast({
        title: 'Prontuário salvo!',
        description: 'O prontuário foi salvo com sucesso.',
      })

      setMode('preview')
    } catch (error: any) {
      console.error('Error saving:', error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o prontuário.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
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
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Prontuário Médico</h1>
            <p className="text-gray-500">Elabore o prontuário com auxílio de IA</p>
          </div>
        </div>

        {existingRecord && (
          <div className="flex items-center gap-3">
            {mode === 'preview' && !existingRecord.signed && (
              <Button
                variant="outline"
                onClick={() => setMode('edit')}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            
            {existingRecord.signed ? (
              <Badge className="bg-green-100 text-green-700">
                <FileCheck className="w-4 h-4 mr-2" />
                Assinado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                <AlertCircle className="w-4 h-4 mr-2" />
                Não Assinado
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Formulário Inicial */}
      {!soapContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Gerar Prontuário com IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">
                Queixa Principal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="chiefComplaint"
                placeholder="Ex: Dor de cabeça há 3 dias"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">
                Sintomas e Observações <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="symptoms"
                placeholder="Descreva os sintomas relatados pelo paciente, histórico, fatores agravantes/atenuantes, etc."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Anotações Adicionais (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observações extras, exame físico, impressões clínicas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              onClick={handleGenerateWithAI}
              disabled={generating}
              className="w-full bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando Prontuário...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Prontuário com IA
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              A IA irá gerar um prontuário estruturado no formato SOAP que você poderá revisar e editar
            </p>
          </CardContent>
        </Card>
      )}

      {/* Prontuário Gerado/Editável */}
      {soapContent && (
        <div className="space-y-6">
          <Tabs defaultValue="subjective" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="subjective">Subjetivo</TabsTrigger>
                <TabsTrigger value="objective">Objetivo</TabsTrigger>
                <TabsTrigger value="assessment">Avaliação</TabsTrigger>
                <TabsTrigger value="plan">Plano</TabsTrigger>
              </TabsList>
              {mode === 'edit' && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="ml-4"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Prontuário
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* SUBJETIVO */}
            <TabsContent value="subjective" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subjetivo (S)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Queixa Principal</Label>
                    {mode === 'edit' ? (
                      <Input
                        value={soapContent.subjective.chief_complaint}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          subjective: {
                            ...soapContent.subjective,
                            chief_complaint: e.target.value
                          }
                        })}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg">
                        {soapContent.subjective.chief_complaint}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>História da Doença Atual</Label>
                    {mode === 'edit' ? (
                      <Textarea
                        value={soapContent.subjective.history_present_illness}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          subjective: {
                            ...soapContent.subjective,
                            history_present_illness: e.target.value
                          }
                        })}
                        rows={6}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                        {soapContent.subjective.history_present_illness}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Revisão de Sistemas</Label>
                    {mode === 'edit' ? (
                      <Textarea
                        value={soapContent.subjective.review_systems}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          subjective: {
                            ...soapContent.subjective,
                            review_systems: e.target.value
                          }
                        })}
                        rows={4}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                        {soapContent.subjective.review_systems}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* OBJETIVO */}
            <TabsContent value="objective" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Objetivo (O)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sinais Vitais</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(soapContent.objective.vital_signs).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs capitalize">
                            {key.replace('_', ' ')}
                          </Label>
                          {mode === 'edit' ? (
                            <Input
                              value={value}
                              onChange={(e) => setSoapContent({
                                ...soapContent,
                                objective: {
                                  ...soapContent.objective,
                                  vital_signs: {
                                    ...soapContent.objective.vital_signs,
                                    [key]: e.target.value
                                  }
                                }
                              })}
                            />
                          ) : (
                            <p className="p-2 bg-gray-50 rounded">{value}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Exame Físico</Label>
                    {mode === 'edit' ? (
                      <Textarea
                        value={soapContent.objective.physical_exam}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          objective: {
                            ...soapContent.objective,
                            physical_exam: e.target.value
                          }
                        })}
                        rows={8}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                        {soapContent.objective.physical_exam}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AVALIAÇÃO */}
            <TabsContent value="assessment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Avaliação (A)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Diagnóstico Principal</Label>
                    {mode === 'edit' ? (
                      <Input
                        value={soapContent.assessment.primary_diagnosis}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          assessment: {
                            ...soapContent.assessment,
                            primary_diagnosis: e.target.value
                          }
                        })}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg font-medium">
                        {soapContent.assessment.primary_diagnosis}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Diagnósticos Diferenciais</Label>
                    {mode === 'edit' ? (
                      <div className="space-y-2">
                        {soapContent.assessment.differential_diagnoses.map((diag, idx) => (
                          <Input
                            key={idx}
                            value={diag}
                            onChange={(e) => {
                              const newDiagnoses = [...soapContent.assessment.differential_diagnoses]
                              newDiagnoses[idx] = e.target.value
                              setSoapContent({
                                ...soapContent,
                                assessment: {
                                  ...soapContent.assessment,
                                  differential_diagnoses: newDiagnoses
                                }
                              })
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {soapContent.assessment.differential_diagnoses.map((diag, idx) => (
                          <li key={idx} className="p-2 bg-gray-50 rounded flex items-center gap-2">
                            <span className="text-gray-400">{idx + 1}.</span>
                            {diag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Gravidade</Label>
                    {mode === 'edit' ? (
                      <select
                        value={soapContent.assessment.severity}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          assessment: {
                            ...soapContent.assessment,
                            severity: e.target.value as 'leve' | 'moderado' | 'grave'
                          }
                        })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="leve">Leve</option>
                        <option value="moderado">Moderado</option>
                        <option value="grave">Grave</option>
                      </select>
                    ) : (
                      <Badge
                        className={
                          soapContent.assessment.severity === 'grave'
                            ? 'bg-red-100 text-red-700'
                            : soapContent.assessment.severity === 'moderado'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {soapContent.assessment.severity.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PLANO */}
            <TabsContent value="plan" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Plano (P)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Tratamento</Label>
                    {mode === 'edit' ? (
                      <Textarea
                        value={soapContent.plan.treatment}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          plan: {
                            ...soapContent.plan,
                            treatment: e.target.value
                          }
                        })}
                        rows={4}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                        {soapContent.plan.treatment}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Medicações Prescritas</Label>
                    {mode === 'preview' ? (
                      <div className="space-y-3">
                        {soapContent.plan.medications.map((med, idx) => (
                          <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium mb-2">{med.name}</p>
                            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
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
                    ) : (
                      <div className="space-y-3">
                        {soapContent.plan.medications.map((med, idx) => (
                          <div key={idx} className="p-4 border rounded-lg space-y-2">
                            <Input
                              placeholder="Nome do medicamento"
                              value={med.name}
                              onChange={(e) => {
                                const newMeds = [...soapContent.plan.medications]
                                newMeds[idx].name = e.target.value
                                setSoapContent({
                                  ...soapContent,
                                  plan: { ...soapContent.plan, medications: newMeds }
                                })
                              }}
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                placeholder="Dosagem"
                                value={med.dosage}
                                onChange={(e) => {
                                  const newMeds = [...soapContent.plan.medications]
                                  newMeds[idx].dosage = e.target.value
                                  setSoapContent({
                                    ...soapContent,
                                    plan: { ...soapContent.plan, medications: newMeds }
                                  })
                                }}
                              />
                              <Input
                                placeholder="Frequência"
                                value={med.frequency}
                                onChange={(e) => {
                                  const newMeds = [...soapContent.plan.medications]
                                  newMeds[idx].frequency = e.target.value
                                  setSoapContent({
                                    ...soapContent,
                                    plan: { ...soapContent.plan, medications: newMeds }
                                  })
                                }}
                              />
                              <Input
                                placeholder="Duração"
                                value={med.duration}
                                onChange={(e) => {
                                  const newMeds = [...soapContent.plan.medications]
                                  newMeds[idx].duration = e.target.value
                                  setSoapContent({
                                    ...soapContent,
                                    plan: { ...soapContent.plan, medications: newMeds }
                                  })
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Exames Solicitados</Label>
                    {mode === 'edit' ? (
                      <div className="space-y-2">
                        {soapContent.plan.exams_requested.map((exam, idx) => (
                          <Input
                            key={idx}
                            value={exam}
                            onChange={(e) => {
                              const newExams = [...soapContent.plan.exams_requested]
                              newExams[idx] = e.target.value
                              setSoapContent({
                                ...soapContent,
                                plan: { ...soapContent.plan, exams_requested: newExams }
                              })
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {soapContent.plan.exams_requested.map((exam, idx) => (
                          <li key={idx} className="p-2 bg-gray-50 rounded flex items-center gap-2">
                            <span className="text-gray-400">{idx + 1}.</span>
                            {exam}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Retorno</Label>
                    {mode === 'edit' ? (
                      <Input
                        value={soapContent.plan.follow_up}
                        onChange={(e) => setSoapContent({
                          ...soapContent,
                          plan: {
                            ...soapContent.plan,
                            follow_up: e.target.value
                          }
                        })}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-lg">
                        {soapContent.plan.follow_up}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Recomendações</Label>
                    {mode === 'edit' ? (
                      <div className="space-y-2">
                        {soapContent.plan.recommendations.map((rec, idx) => (
                          <Input
                            key={idx}
                            value={rec}
                            onChange={(e) => {
                              const newRecs = [...soapContent.plan.recommendations]
                              newRecs[idx] = e.target.value
                              setSoapContent({
                                ...soapContent,
                                plan: { ...soapContent.plan, recommendations: newRecs }
                              })
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {soapContent.plan.recommendations.map((rec, idx) => (
                          <li key={idx} className="p-2 bg-gray-50 rounded flex items-center gap-2">
                            <span className="text-gray-400">{idx + 1}.</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

