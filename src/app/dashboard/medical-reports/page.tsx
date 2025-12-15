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
  Sparkles, 
  Save, 
  FileCheck, 
  AlertCircle,
  Loader2,
  Edit,
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReportContent {
  tecnica: string
  achados: string
  comparacao: string
  conclusao: string
  recomendacoes: string
}

export default function MedicalReportsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'form' | 'edit' | 'preview'>('form')
  const [isDoctor, setIsDoctor] = useState(false)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    appointmentId: '',
    patientId: '',
    examType: '',
    examData: '',
    preliminaryFindings: '',
  })

  const [reportContent, setReportContent] = useState<ReportContent | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  useEffect(() => {
    checkRole()
  }, [])

  async function checkRole() {
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

      if (profile?.role !== 'doctor') {
        router.push('/dashboard')
        return
      }

      setIsDoctor(true)
    } catch (error: any) {
      console.error('Erro ao verificar role:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateWithAI() {
    if (!formData.examType || !formData.examData || !formData.patientId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o tipo de exame, dados do exame e paciente.',
        variant: 'destructive'
      })
      return
    }

    try {
      setGenerating(true)

      const response = await fetch('/api/ai/medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: formData.appointmentId || null,
          patientId: formData.patientId,
          examType: formData.examType,
          examData: formData.examData,
          preliminaryFindings: formData.preliminaryFindings,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setReportContent(data.content)
      setReportId(data.reportId)
      setMode('edit')

      toast({
        title: 'Laudo gerado!',
        description: 'Revise o conteúdo antes de salvar.',
      })
    } catch (error: any) {
      console.error('Error generating:', error)
      toast({
        title: 'Erro ao gerar',
        description: error.message || 'Não foi possível gerar o laudo. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!reportContent || !reportId) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('medical_reports')
        .update({
          report_content: reportContent,
          reviewed_by_doctor: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) throw error

      toast({
        title: 'Laudo salvo!',
        description: 'O laudo foi salvo com sucesso.',
      })

      setMode('preview')
    } catch (error: any) {
      console.error('Error saving:', error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o laudo.',
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

  if (!isDoctor) {
    return null
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Laudos Médicos</h1>
        <p className="text-gray-500">Elabore laudos médicos com auxílio de IA</p>
      </div>

      {/* Formulário Inicial */}
      {mode === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Gerar Laudo com IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">
                  ID do Paciente <span className="text-red-500">*</span>
                </Label>
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

            <div className="space-y-2">
              <Label htmlFor="examType">
                Tipo de Exame <span className="text-red-500">*</span>
              </Label>
              <Input
                id="examType"
                value={formData.examType}
                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                placeholder="Ex: Raio-X de Tórax, ECG, Hemograma..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="examData">
                Dados do Exame <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="examData"
                value={formData.examData}
                onChange={(e) => setFormData({ ...formData, examData: e.target.value })}
                placeholder="Descreva os dados do exame, resultados, imagens, etc."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preliminaryFindings">Achados Preliminares (Opcional)</Label>
              <Textarea
                id="preliminaryFindings"
                value={formData.preliminaryFindings}
                onChange={(e) => setFormData({ ...formData, preliminaryFindings: e.target.value })}
                placeholder="Observações preliminares ou impressões iniciais..."
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
                  Gerando Laudo...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Laudo com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Laudo Gerado/Editável */}
      {reportContent && (mode === 'edit' || mode === 'preview') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Laudo Médico</h2>
            <div className="flex items-center gap-3">
              {mode === 'preview' && (
                <Button
                  variant="outline"
                  onClick={() => setMode('edit')}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {mode === 'edit' && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Laudo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Técnica</CardTitle>
              </CardHeader>
              <CardContent>
                {mode === 'edit' ? (
                  <Textarea
                    value={reportContent.tecnica}
                    onChange={(e) => setReportContent({
                      ...reportContent,
                      tecnica: e.target.value
                    })}
                    rows={4}
                  />
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {reportContent.tecnica}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Achados</CardTitle>
              </CardHeader>
              <CardContent>
                {mode === 'edit' ? (
                  <Textarea
                    value={reportContent.achados}
                    onChange={(e) => setReportContent({
                      ...reportContent,
                      achados: e.target.value
                    })}
                    rows={8}
                  />
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {reportContent.achados}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparação</CardTitle>
              </CardHeader>
              <CardContent>
                {mode === 'edit' ? (
                  <Textarea
                    value={reportContent.comparacao}
                    onChange={(e) => setReportContent({
                      ...reportContent,
                      comparacao: e.target.value
                    })}
                    rows={4}
                  />
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {reportContent.comparacao || 'Não há exames anteriores para comparação.'}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conclusão</CardTitle>
              </CardHeader>
              <CardContent>
                {mode === 'edit' ? (
                  <Textarea
                    value={reportContent.conclusao}
                    onChange={(e) => setReportContent({
                      ...reportContent,
                      conclusao: e.target.value
                    })}
                    rows={4}
                  />
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap font-medium">
                    {reportContent.conclusao}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                {mode === 'edit' ? (
                  <Textarea
                    value={reportContent.recomendacoes}
                    onChange={(e) => setReportContent({
                      ...reportContent,
                      recomendacoes: e.target.value
                    })}
                    rows={4}
                  />
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {reportContent.recomendacoes}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

