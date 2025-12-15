import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clicksignClient } from '@/lib/signature/clicksign'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { documentType, documentId, signerEmail } = await request.json()

    if (!documentType || !documentId || !signerEmail) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: documentType, documentId, signerEmail' },
        { status: 400 }
      )
    }

    // Buscar o documento baseado no tipo
    let document: any = null
    let documentContent = ''

    if (documentType === 'medical_record') {
      const { data } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', documentId)
        .single()
      
      if (!data) {
        return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
      }
      
      document = data
      // Gerar conteúdo do documento para assinatura (simplificado)
      documentContent = JSON.stringify(data.soap_content || data.content, null, 2)
    } else if (documentType === 'prescription') {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', documentId)
        .single()
      
      if (!data) {
        return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })
      }
      
      document = data
      documentContent = JSON.stringify(data, null, 2)
    } else if (documentType === 'medical_report') {
      const { data } = await supabase
        .from('medical_reports')
        .select('*')
        .eq('id', documentId)
        .single()
      
      if (!data) {
        return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })
      }
      
      document = data
      documentContent = JSON.stringify(data.report_content, null, 2)
    }

    // Converter conteúdo para base64
    const contentBase64 = Buffer.from(documentContent).toString('base64')

    // Criar documento no ClickSign
    const clicksignDoc = await clicksignClient.createDocument({
      document: {
        path: `${documentType}_${documentId}.txt`,
        content_base64: contentBase64,
        deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        auto_close: false,
      },
      signers: [
        {
          email: signerEmail,
          action: 'sign',
          positions: [
            {
              page: 1,
              x: 100,
              y: 100,
            },
          ],
        },
      ],
    })

    // Salvar assinatura no banco
    const { data: signature, error: signatureError } = await supabase
      .from('digital_signatures')
      .insert({
        document_type: documentType,
        document_id: documentId,
        signer_id: user.id,
        provider: 'clicksign',
        provider_signature_id: clicksignDoc.document.key,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: clicksignDoc,
      })
      .select()
      .single()

    if (signatureError) {
      console.error('Erro ao salvar assinatura:', signatureError)
      throw signatureError
    }

    // Atualizar documento com referência à assinatura
    if (documentType === 'medical_record') {
      await supabase
        .from('medical_records')
        .update({ signature_id: signature.id })
        .eq('id', documentId)
    } else if (documentType === 'prescription') {
      await supabase
        .from('prescriptions')
        .update({ signature_id: signature.id })
        .eq('id', documentId)
    } else if (documentType === 'medical_report') {
      await supabase
        .from('medical_reports')
        .update({ signature_id: signature.id })
        .eq('id', documentId)
    }

    return NextResponse.json({
      success: true,
      signatureId: signature.id,
      documentKey: clicksignDoc.document.key,
      signUrl: clicksignDoc.signers?.[0]?.url,
    })
  } catch (error: any) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar assinatura digital' },
      { status: 500 }
    )
  }
}

