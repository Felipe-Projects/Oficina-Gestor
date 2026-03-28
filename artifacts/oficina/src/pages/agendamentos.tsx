import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Car, User, Phone, Check, X, Trash2, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Agendamento {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  servicoNome: string | null;
  dataAgendamento: string;
  horario: string;
  duracaoDias: number;
  status: string;
  observacoes: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmado: { label: "Confirmado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  concluido: { label: "Concluído", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function Agendamentos() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("todos");

  const { data: agendamentos, isLoading } = useQuery<Agendamento[]>({
    queryKey: ["/api/agendamentos"],
    queryFn: () => apiRequest("GET", "/api/agendamentos"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/agendamentos/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/agendamentos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/agendamentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/agendamentos"] }),
  });

  const filtered = (agendamentos ?? []).filter(
    a => filterStatus === "todos" || a.status === filterStatus
  ).sort((a, b) => a.dataAgendamento.localeCompare(b.dataAgendamento));

  const pendentes = (agendamentos ?? []).filter(a => a.status === "pendente").length;

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}agendar`.replace(/\/\//g, "/")
    : "";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie as visitas agendadas pelos clientes.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl text-sm">
            <span className="text-muted-foreground">Link do cliente:</span>
            <a
              href={baseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary font-mono text-xs underline truncate max-w-xs"
            >
              {baseUrl}
            </a>
          </div>
          {pendentes > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full font-semibold">
              {pendentes} agendamento{pendentes !== 1 ? "s" : ""} aguardando confirmação
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "todos", label: "Todos" },
          { key: "pendente", label: "Pendentes" },
          { key: "confirmado", label: "Confirmados" },
          { key: "concluido", label: "Concluídos" },
          { key: "cancelado", label: "Cancelados" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              filterStatus === f.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">Carregando agendamentos...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <CalendarClock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(ag => {
          const st = STATUS_LABELS[ag.status] ?? { label: ag.status, color: "bg-muted text-muted-foreground" };
          return (
            <div key={ag.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", st.color)}>{st.label}</span>
                    <span className="text-sm font-bold text-foreground">{ag.clienteNome}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{ag.clienteTelefone}</span>
                    <span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />{ag.veiculoModelo} — <span className="font-mono">{ag.veiculoPlaca.toUpperCase()}</span></span>
                  </div>
                  {ag.servicoNome && (
                    <p className="text-sm text-foreground font-medium">{ag.servicoNome}</p>
                  )}
                  {ag.observacoes && (
                    <p className="text-xs text-muted-foreground italic">"{ag.observacoes}"</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      {formatDate(ag.dataAgendamento)}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {ag.horario}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {ag.duracaoDias} dia{ag.duracaoDias !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {ag.status === "pendente" && (
                      <>
                        <button
                          onClick={() => updateMutation.mutate({ id: ag.id, status: "confirmado" })}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </button>
                        <button
                          onClick={() => updateMutation.mutate({ id: ag.id, status: "cancelado" })}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Recusar
                        </button>
                      </>
                    )}
                    {ag.status === "confirmado" && (
                      <button
                        onClick={() => updateMutation.mutate({ id: ag.id, status: "concluido" })}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Marcar concluído
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm("Excluir agendamento?")) deleteMutation.mutate(ag.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
