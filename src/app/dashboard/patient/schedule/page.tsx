"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import DoctorSelector from "@/app/dashboard/schedule/components/doctor-selector";
import CalendarView from "@/app/dashboard/schedule/components/calendar-view";
import TimeSlotPicker from "@/app/dashboard/schedule/components/time-slot-picker";
import AppointmentSummary from "@/app/dashboard/schedule/components/appointment-summary";
import SpecialtySelector from "@/app/dashboard/schedule/components/specialty-selector";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Doctor } from "@/lib/calendar/types";
import { createAppointment as createAppointmentQuery } from "@/lib/calendar/queries";

type Step = "specialty" | "doctor" | "datetime" | "confirmation";

export default function SchedulePage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState<Step>("specialty");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null
  );
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isPatient, setIsPatient] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Verificar role ao carregar
  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "patient") {
          // Redirecionar médicos para sua agenda
          if (profile?.role === "doctor") {
            router.push("/dashboard/doctor");
          } else {
            router.push("/dashboard");
          }
          return;
        }

        setIsPatient(true);
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        router.push("/dashboard");
      } finally {
        setCheckingRole(false);
      }
    }

    checkRole();
  }, [supabase, router]);

  const steps = [
    { key: "specialty", label: "Especialidade", icon: Stethoscope },
    { key: "doctor", label: "Médico", icon: Calendar },
    { key: "datetime", label: "Data e Hora", icon: Clock },
    { key: "confirmation", label: "Confirmação", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Mostrar loading enquanto verifica role
  if (checkingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não for paciente, não renderizar (já redirecionou)
  if (!isPatient) {
    return null;
  }

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTimeSlot) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Buscar ou criar patient_id
      let patientId = user.id;

      // Verificar se existe registro na tabela patients
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("id", user.id)
        .single();

      // Se não existir, criar o registro
      if (!patientData && patientError?.code === "PGRST116") {
        const { error: insertError } = await supabase.from("patients").insert({
          id: user.id,
          // Campos opcionais podem ser preenchidos depois
        });

        if (insertError) {
          console.error("Error creating patient record:", insertError);
          // Continuar mesmo assim, pois o ID é o mesmo do user
        }
      }

      // Combinar data e hora
      const [hours, minutes] = selectedTimeSlot.split(":");
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Criar appointment usando a query helper
      await createAppointmentQuery({
        patientId: patientId,
        doctorId: selectedDoctor.id,
        scheduledAt: scheduledAt,
        durationMinutes: 60,
      });

      // Redirecionar para página de consultas
      router.push("/dashboard/patient/consultations");
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert("Erro ao agendar consulta. Tente novamente.");
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      <PageHeader
        icon={Calendar}
        title="Agendar Consulta"
        description="Escolha o especialista e horário ideal para você"
        actions={
          currentStep !== "specialty" ? (
            <Button
              variant="outline"
              onClick={() => {
                const prevStep = steps[currentStepIndex - 1]?.key;
                if (prevStep) setCurrentStep(prevStep as Step);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          ) : undefined
        }
        stats={
          <div className="space-y-2">
            <div className="flex items-center justify-center mt-4 max-w-4xl mx-auto">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.key === currentStep;
                const isCompleted = index < currentStepIndex;

                return (
                  <div
                    key={step.key}
                    className="flex items-center flex-1 max-w-[200px]"
                  >
                    <div className="flex flex-col items-center w-full">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center transition-all
                          ${isCompleted ? "bg-secondary-500 text-white" : ""}
                          ${
                            isActive
                              ? "bg-primary-500 text-white ring-4 ring-primary-100"
                              : ""
                          }
                          ${
                            !isActive && !isCompleted
                              ? "bg-gray-200 text-gray-400"
                              : ""
                          }
                        `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <StepIcon className="w-6 h-6" />
                        )}
                      </div>
                      <span
                        className={`
                          text-sm font-medium mt-2 text-center
                          ${isActive ? "text-primary-600" : ""}
                          ${isCompleted ? "text-secondary-600" : ""}
                          ${!isActive && !isCompleted ? "text-gray-400" : ""}
                        `}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 h-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted ? "bg-secondary-500 w-full" : "w-0"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress Bar */}
            <div className="max-w-4xl mx-auto">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        }
      />

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Step 1: Specialty Selection */}
        {currentStep === "specialty" && (
          <SpecialtySelector
            onSelect={(specialty) => {
              setSelectedSpecialty(specialty);
              setCurrentStep("doctor");
            }}
          />
        )}

        {/* Step 2: Doctor Selection */}
        {currentStep === "doctor" && (
          <DoctorSelector
            specialty={selectedSpecialty}
            onSelect={(doctor) => {
              setSelectedDoctor(doctor);
              setCurrentStep("datetime");
            }}
          />
        )}

        {/* Step 3: Date & Time Selection */}
        {currentStep === "datetime" && selectedDoctor && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <CalendarView
                doctorId={selectedDoctor.id}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
            <div>
              <TimeSlotPicker
                doctorId={selectedDoctor.id}
                selectedDate={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                onTimeSlotSelect={(timeSlot) => {
                  setSelectedTimeSlot(timeSlot);
                  setCurrentStep("confirmation");
                }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === "confirmation" && selectedDoctor && (
          <AppointmentSummary
            doctor={selectedDoctor}
            date={selectedDate}
            timeSlot={selectedTimeSlot}
            onConfirm={handleConfirm}
            onEdit={() => setCurrentStep("datetime")}
          />
        )}
      </main>
    </div>
  );
}
