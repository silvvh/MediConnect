// Integração com ClickSign para assinatura digital
// Nota: Esta é uma implementação básica. Configure as credenciais no .env.local

interface ClickSignConfig {
  apiKey: string;
  baseUrl: string;
}

interface CreateDocumentRequest {
  document: {
    path: string;
    content_base64: string;
    deadline_at?: string;
    auto_close?: boolean;
  };
  signers: Array<{
    email: string;
    action: string;
    positions: Array<{
      page: number;
      x: number;
      y: number;
    }>;
  }>;
}

export class ClickSignClient {
  private config: ClickSignConfig;

  constructor() {
    this.config = {
      apiKey: process.env.CLICKSIGN_API_KEY || '',
      baseUrl: process.env.CLICKSIGN_BASE_URL || 'https://app.clicksign.com/api/v1',
    };
  }

  async createDocument(request: CreateDocumentRequest) {
    if (!this.config.apiKey) {
      throw new Error('CLICKSIGN_API_KEY não configurada');
    }

    const response = await fetch(`${this.config.baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar documento no ClickSign');
    }

    return response.json();
  }

  async getDocumentStatus(documentKey: string) {
    if (!this.config.apiKey) {
      throw new Error('CLICKSIGN_API_KEY não configurada');
    }

    const response = await fetch(`${this.config.baseUrl}/documents/${documentKey}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar status do documento');
    }

    return response.json();
  }

  async notifySigner(documentKey: string, signerKey: string) {
    if (!this.config.apiKey) {
      throw new Error('CLICKSIGN_API_KEY não configurada');
    }

    const response = await fetch(
      `${this.config.baseUrl}/documents/${documentKey}/notify/${signerKey}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao notificar signatário');
    }

    return response.json();
  }
}

export const clicksignClient = new ClickSignClient();

