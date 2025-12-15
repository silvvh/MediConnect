'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentUploadProps {
  appointmentId?: string
  category?: 'exam' | 'prescription' | 'report' | 'other'
  onUploadComplete?: () => void
}

export function DocumentUpload({ 
  appointmentId, 
  category = 'other',
  onUploadComplete 
}: DocumentUploadProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({})

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  async function handleUpload() {
    if (files.length === 0) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      for (const file of files) {
        try {
          setUploadStatus(prev => ({ ...prev, [file.name]: 'pending' }))

          // Upload para Supabase Storage
          const filePath = `${user.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('medical-documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Gerar resumo com IA se for texto (PDF requer biblioteca especial)
          let aiSummary = null;
          if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
            try {
              const text = await file.text();
              if (text && text.length > 100) {
                const summaryResponse = await fetch('/api/ai/document-summary', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ documentText: text.substring(0, 10000) }),
                });
                if (summaryResponse.ok) {
                  const summaryData = await summaryResponse.json();
                  aiSummary = JSON.stringify(summaryData.summary);
                }
              }
            } catch (summaryError) {
              console.error('Erro ao gerar resumo:', summaryError);
              // Não falhar o upload se o resumo falhar
            }
          }

          // Registrar no banco de dados
          const { error: dbError } = await supabase
            .from('medical_documents')
            .insert({
              user_id: user.id,
              appointment_id: appointmentId || null,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              storage_path: filePath,
              category,
              ai_summary: aiSummary
            })

          if (dbError) throw dbError

          setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }))
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error)
          setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }))
        }
      }

      // Limpar após 2 segundos
      setTimeout(() => {
        setFiles([])
        setUploadProgress({})
        setUploadStatus({})
        onUploadComplete?.()
      }, 2000)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Erro ao fazer upload. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  function removeFile(fileName: string) {
    setFiles(prev => prev.filter(f => f.name !== fileName))
  }

  function getFileIcon(fileType: string) {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-500" />
    return <FileText className="w-8 h-8 text-gray-500" />
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition",
            isDragActive 
              ? "border-primary-500 bg-primary-50" 
              : "border-gray-300 hover:border-primary-400"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-primary-600 font-medium">Solte os arquivos aqui...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Arraste arquivos aqui ou <span className="text-primary-600 font-medium">clique para selecionar</span>
              </p>
              <p className="text-sm text-gray-400">
                PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Lista de Arquivos */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">
              Arquivos Selecionados ({files.length})
            </h3>
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadProgress[file.name] > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                  )}
                </div>
                {uploadStatus[file.name] === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {uploadStatus[file.name] === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {!uploadStatus[file.name] && (
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-1 hover:bg-gray-200 rounded transition"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            ))}

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Enviar {files.length} arquivo{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

