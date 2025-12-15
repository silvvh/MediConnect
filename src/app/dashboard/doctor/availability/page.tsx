"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar as CalendarIcon,
  Save,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDate {
  date: string;
  reason: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export default function DoctorAvailabilityPage() {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedDateDialogOpen, setBlockedDateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [blockedReason, setBlockedReason] = useState("");

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    setLoading(true);
    try {
      const response = await fetch("/api/doctor/availability");
      const data = await response.json();

      if (response.ok) {
        // Inicializar com todos os dias da semana se não houver dados
        if (!data.availability || data.availability.length === 0) {
          const defaultAvailability = DAYS_OF_WEEK.map((day) => ({
            day_of_week: day.value,
            start_time: "09:00",
            end_time: "18:00",
            is_available: false,
          }));
          setAvailability(defaultAvailability);
        } else {
          // Preencher dias faltantes
          const existingDays = data.availability.map((a: Availability) => a.day_of_week);
          const defaultAvailability = DAYS_OF_WEEK.map((day) => {
            const existing = data.availability.find(
              (a: Availability) => a.day_of_week === day.value
            );
            return existing || {
              day_of_week: day.value,
              start_time: "09:00",
              end_time: "18:00",
              is_available: false,
            };
          });
          setAvailability(defaultAvailability);
        }

        setBlockedDates(data.blockedDates || []);
      } else {
        throw new Error(data.error || "Erro ao carregar disponibilidade");
      }
    } catch (error: any) {
      console.error("Erro ao buscar disponibilidade:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/doctor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability,
          blockedDates,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Disponibilidade salva com sucesso",
        });
      } else {
        throw new Error(data.error || "Erro ao salvar disponibilidade");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function updateAvailability(dayOfWeek: number, field: string, value: any) {
    setAvailability((prev) =>
      prev.map((avail) =>
        avail.day_of_week === dayOfWeek ? { ...avail, [field]: value } : avail
      )
    );
  }

  function handleAddBlockedDate() {
    if (!selectedDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data",
        variant: "destructive",
      });
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (blockedDates.some((bd) => bd.date === dateStr)) {
      toast({
        title: "Erro",
        description: "Esta data já está bloqueada",
        variant: "destructive",
      });
      return;
    }

    setBlockedDates([
      ...blockedDates,
      { date: dateStr, reason: blockedReason || null },
    ]);
    setSelectedDate(undefined);
    setBlockedReason("");
    setBlockedDateDialogOpen(false);
  }

  function handleRemoveBlockedDate(date: string) {
    setBlockedDates(blockedDates.filter((bd) => bd.date !== date));
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando disponibilidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Disponibilidade</h1>
        <p className="text-gray-500">
          Configure seus horários de atendimento e bloqueie datas específicas
        </p>
      </div>

      {/* Disponibilidade Semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horários de Atendimento Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const dayAvailability = availability.find(
                (a) => a.day_of_week === day.value
              );

              return (
                <div
                  key={day.value}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-2 w-32">
                    <Checkbox
                      checked={dayAvailability?.is_available || false}
                      onCheckedChange={(checked) =>
                        updateAvailability(day.value, "is_available", checked)
                      }
                    />
                    <Label className="font-medium">{day.label}</Label>
                  </div>

                  {dayAvailability?.is_available && (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">De</Label>
                        <Input
                          type="time"
                          value={dayAvailability.start_time}
                          onChange={(e) =>
                            updateAvailability(
                              day.value,
                              "start_time",
                              e.target.value
                            )
                          }
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Até</Label>
                        <Input
                          type="time"
                          value={dayAvailability.end_time}
                          onChange={(e) =>
                            updateAvailability(
                              day.value,
                              "end_time",
                              e.target.value
                            )
                          }
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}

                  {!dayAvailability?.is_available && (
                    <p className="text-sm text-gray-500">Indisponível</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Datas Bloqueadas */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Datas Bloqueadas
          </CardTitle>
          <Dialog
            open={blockedDateDialogOpen}
            onOpenChange={setBlockedDateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Bloquear Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bloquear Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(new Date(e.target.value));
                      }
                    }}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div>
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={blockedReason}
                    onChange={(e) => setBlockedReason(e.target.value)}
                    placeholder="Ex: Férias, Feriado, etc."
                  />
                </div>
                <Button onClick={handleAddBlockedDate} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {blockedDates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhuma data bloqueada
            </p>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((blocked) => (
                <div
                  key={blocked.date}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(blocked.date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    {blocked.reason && (
                      <p className="text-sm text-gray-500">{blocked.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlockedDate(blocked.date)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Disponibilidade
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

