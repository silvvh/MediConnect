"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Bell, Shield, Mail } from "lucide-react";

export default function AdminSettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "MediConnect",
    supportEmail: "",
    maxFileSize: "10",
    enableNotifications: true,
    requireEmailVerification: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const { settings } = await response.json();
        if (settings) {
          setSettings({
            platformName: settings.platformName || "MediConnect",
            supportEmail: settings.supportEmail || "",
            maxFileSize: settings.maxFileSize || "10",
            enableNotifications: settings.enableNotifications !== false,
            requireEmailVerification: settings.requireEmailVerification !== false,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar configurações");
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          Configurações
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Gerencie as configurações gerais da plataforma
        </p>
      </div>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platformName">Nome da Plataforma</Label>
            <Input
              id="platformName"
              value={settings.platformName}
              onChange={(e) =>
                setSettings({ ...settings, platformName: e.target.value })
              }
              placeholder="MediConnect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Email de Suporte</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={(e) =>
                setSettings({ ...settings, supportEmail: e.target.value })
              }
              placeholder="suporte@mediconnect.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Tamanho Máximo de Arquivo (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={settings.maxFileSize}
              onChange={(e) =>
                setSettings({ ...settings, maxFileSize: e.target.value })
              }
              placeholder="10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Verificação de Email Obrigatória</p>
              <p className="text-sm text-gray-500">
                Requer que usuários verifiquem o email antes de usar a
                plataforma
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.requireEmailVerification}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  requireEmailVerification: e.target.checked,
                })
              }
              className="w-5 h-5 rounded border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações por Email</p>
              <p className="text-sm text-gray-500">
                Enviar notificações por email para administradores
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  enableNotifications: e.target.checked,
                })
              }
              className="w-5 h-5 rounded border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
