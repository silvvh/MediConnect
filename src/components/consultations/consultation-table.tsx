"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Video,
  FileText,
  Stethoscope,
  MoreVertical,
  ArrowUpDown,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import {
  getStatusBadgeClass,
  getStatusLabel,
  getInitials,
  isToday,
} from "@/lib/consultations-utils";

interface ConsultationTableProps {
  consultations: Array<{
    id: string;
    scheduled_at: string;
    status: string;
    video_room_url?: string;
    doctor?: {
      full_name: string;
      specialty?: string;
      crm?: string;
      avatar_url?: string;
    };
    patient?: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
  role: "patient" | "doctor";
  onViewDetails: (id: string) => void;
  onReschedule?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function ConsultationTable({
  consultations,
  role,
  onViewDetails,
  onReschedule,
  onCancel,
}: ConsultationTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Scroll horizontal para mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-2">
                Data/Hora
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </TableHead>
            <TableHead>{role === "patient" ? "Médico" : "Paciente"}</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((consultation) => {
            const scheduledDate = new Date(consultation.scheduled_at);
            const otherPerson =
              role === "patient" ? consultation.doctor : consultation.patient;
            const isTodayConsultation = isToday(scheduledDate);

            return (
              <TableRow
                key={consultation.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onViewDetails(consultation.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(scheduledDate, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(scheduledDate, "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {otherPerson && (
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={otherPerson.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                          {getInitials(otherPerson.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">
                          {otherPerson.full_name}
                        </p>
                        {consultation.doctor?.crm && (
                          <p className="text-xs text-gray-500">
                            CRM {consultation.doctor.crm}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  {consultation.doctor?.specialty && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Stethoscope className="w-4 h-4" />
                      {consultation.doctor.specialty}
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <Badge className={getStatusBadgeClass(consultation.status)}>
                    {getStatusLabel(consultation.status)}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(consultation.id)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {consultation.status === "confirmed" &&
                        isTodayConsultation &&
                        consultation.video_room_url && (
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/consultations/${consultation.id}`}>
                              <Video className="w-4 h-4 mr-2" />
                              Entrar na Consulta
                            </Link>
                          </DropdownMenuItem>
                        )}
                      {consultation.status === "scheduled" && (
                        <>
                          {onReschedule && (
                            <DropdownMenuItem
                              onClick={() => onReschedule(consultation.id)}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Reagendar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onCancel && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onCancel(consultation.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
        </div>
      </div>
    </div>
  );
}

