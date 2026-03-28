import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, Car, Phone, Check, X, Trash2, Copy,
  CalendarClock, MessageCircle, ChevronLeft, ChevronRight, BanIcon, Plus
} from "lucide-react";
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

interface DiaBloqueado {
  id: number;
  data: string;
  motivo: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmado: { label: "Confirmado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA_SHORT = ["D","S","T","Q","Q","S","S"];

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

const EMOJI = {
  check:  String.fromCodePoint(0x2705), // ✅
  x:      String.fromCodePoint(0x274C), // ❌
  wrench: String.fromCodePoint(0x1F527), // 🔧
  clock:  String.fromCodePoint(0x23F0), // ⏰
};

function buildWhatsAppUrl(phone: string, message: string) {
  const cleaned = formatPhone(phone);
  const full = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  // encodeURIComponent garante UTF-8 correto para todos os caracteres Unicode
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

function buildConfirmMsg(ag: Agendamento) {
  const servico = ag.servicoNome ? `para ${ag.servicoNome}` : "";
  return `Ol\u00E1, ${ag.clienteNome}! Seu agendamento ${servico} para o dia ${formatDate(ag.dataAgendamento)} \u00E0s ${ag.horario} foi ${EMOJI.check} CONFIRMADO. Aguardamos voc\u00EA na oficina! ${EMOJI.wrench}`;
}

function buildRecusaMsg(ag: Agendamento) {
  return `Ol\u00E1, ${ag.clienteNome}! ${EMOJI.x} Infelizmente n\u00E3o conseguimos atender seu agendamento para o dia ${formatDate(ag.dataAgendamento)}. Entre em contato para encontrarmos um hor\u00E1rio dispon\u00EDvel. Pedimos desculpas pelo inconveniente.`;
}

// ─── WHATSAPP MODAL ─────────────────────────────────────────────────────────

interface WaModalProps {
  agendamento: Agendamento;
  acao: "confirmar" | "recusar";
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
}

function WhatsAppModal({ agendamento: ag, acao, onClose, onStatusChange }: WaModalProps) {
  const defaultMsg = acao === "confirmar" ? buildConfirmMsg(ag) : buildRecusaMsg(ag);
  const [msg, setMsg] = useState(defaultMsg);
  const novoStatus = acao === "confirmar" ? "confirmado" : "cancelado";

  const [copiado, setCopiado] = useState(false);

  function handleSoStatus() {
    onStatusChange(ag.id, novoStatus);
    onClose();
  }

  function handleCopiar() {
    navigator.clipboard.writeText(msg).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const waUrl = buildWhatsAppUrl(ag.clienteTelefone, msg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">
              {acao === "confirmar" ? "Confirmar agendamento" : "Recusar agendamento"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ag.clienteNome} — {ag.clienteTelefone}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-500" />
            Mensagem para o cliente
          </label>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Edite a mensagem antes de enviar, se quiser.</p>
            <button
              onClick={handleCopiar}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copiado ? "Copiado!" : "Copiar texto"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { onStatusChange(ag.id, novoStatus); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-center no-underline"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar pelo WhatsApp
          </a>
          <button
            onClick={handleSoStatus}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Só alterar status (sem WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MINI-CALENDAR PARA DIAS BLOQUEADOS ─────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function hoje(): string {
  return new Date().toISOString().split("T")[0];
}

interface DiasBloqueadosSectionProps {
  diasBloqueados: DiaBloqueado[];
  onAdd: (data: string, motivo: string) => void;
  onRemove: (id: number) => void;
  isAdding: boolean;
}

function DiasBloqueadosSection({ diasBloqueados, onAdd, onRemove, isAdding }: DiasBloqueadosSectionProps) {
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const bloqueadosSet = new Set(diasBloqueados.map(d => d.data));

  const calendarDays = React.useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    const days: Array<{ date: string; dayOfWeek: number } | null> = [];
    for (let i = 0; i < primeiro.getDay(); i++) days.push(null);
    for (let d = 1; d <= ultimo.getDate(); d++) {
      const dateStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, dayOfWeek: new Date(dateStr + "T12:00:00Z").getUTCDay() });
    }
    return days;
  }, [mesAtual]);

  function handleDiaClick(date: string, dow: number) {
    if (dow === 0) return; // not sunday
    if (bloqueadosSet.has(date)) return; // already blocked
    setDataEscolhida(d => d === date ? null : date);
    setMotivo("");
  }

  function handleAdd() {
    if (!dataEscolhida) return;
    onAdd(dataEscolhida, motivo);
    setDataEscolhida(null);
    setMotivo("");
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <button
            onClick={() => setMesAtual(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-semibold text-foreground text-sm">
            {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
          </span>
          <button
            onClick={() => setMesAtual(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA_SHORT.map((d, i) => (
              <div key={i} className={cn("text-center text-xs font-medium py-1", i === 0 ? "text-muted-foreground/40" : "text-muted-foreground")}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const isBloqueado = bloqueadosSet.has(day.date);
              const isDomingo = day.dayOfWeek === 0;
              const isPast = day.date < hoje();
              const isSelected = dataEscolhida === day.date;
              const disabled = isDomingo || isPast;
              return (
                <button
                  key={day.date}
                  disabled={disabled}
                  onClick={() => !isBloqueado && handleDiaClick(day.date, day.dayOfWeek)}
                  className={cn(
                    "aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center relative",
                    isBloqueado ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 cursor-default" :
                    isSelected ? "bg-primary text-primary-foreground shadow-md" :
                    disabled ? "text-muted-foreground/30 cursor-not-allowed" :
                    "text-foreground hover:bg-muted cursor-pointer"
                  )}
                  title={isBloqueado ? diasBloqueados.find(d => d.data === day.date)?.motivo ?? "Bloqueado" : undefined}
                >
                  {day.date.split("-")[2]}
                  {isBloqueado && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-4 pb-3 text-xs text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-200 inline-block" />Bloqueado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Selecionado</span>
          <span className="text-muted-foreground/60 text-xs ml-auto">Clique para selecionar</span>
        </div>
      </div>

      {dataEscolhida && (
        <div className="bg-card rounded-xl border border-primary/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Bloquear <strong>{formatDate(dataEscolhida)}</strong>
          </p>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo (opcional) — ex: Feriado, Férias..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isAdding}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <BanIcon className="w-4 h-4" />
              Bloquear este dia
            </button>
            <button
              onClick={() => setDataEscolhida(null)}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {diasBloqueados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dias bloqueados ({diasBloqueados.length})
          </p>
          <div className="space-y-1.5">
            {diasBloqueados.map(dia => (
              <div key={dia.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <BanIcon className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{formatDate(dia.data)}</span>
                    {dia.motivo && <span className="text-xs text-muted-foreground ml-2">— {dia.motivo}</span>}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(dia.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Remover bloqueio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {diasBloqueados.length === 0 && !dataEscolhida && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum dia bloqueado. Clique em uma data no calendário acima para bloquear.
        </p>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function Agendamentos() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("todos");
  const [aba, setAba] = useState<"agendamentos" | "bloqueados">("agendamentos");
  const [waModal, setWaModal] = useState<{ ag: Agendamento; acao: "confirmar" | "recusar" } | null>(null);

  const { data: agendamentos, isLoading } = useQuery<Agendamento[]>({
    queryKey: ["/api/agendamentos"],
    queryFn: () => apiRequest("GET", "/api/agendamentos"),
  });

  const { data: diasBloqueados = [] } = useQuery<DiaBloqueado[]>({
    queryKey: ["/api/agendamentos/dias-bloqueados"],
    queryFn: () => apiRequest("GET", "/api/agendamentos/dias-bloqueados"),
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

  const addBloqueioMutation = useMutation({
    mutationFn: ({ data, motivo }: { data: string; motivo: string }) =>
      apiRequest("POST", "/api/agendamentos/dias-bloqueados", { data, motivo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/agendamentos/dias-bloqueados"] }),
  });

  const removeBloqueioMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/agendamentos/dias-bloqueados/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/agendamentos/dias-bloqueados"] }),
  });

  const filtered = (agendamentos ?? []).filter(
    a => filterStatus === "todos" || a.status === filterStatus
  ).sort((a, b) => a.dataAgendamento.localeCompare(b.dataAgendamento));

  const pendentes = (agendamentos ?? []).filter(a => a.status === "pendente").length;

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}agendar`.replace(/\/\//g, "/")
    : "";

  return (
    <>
      {waModal && (
        <WhatsAppModal
          agendamento={waModal.ag}
          acao={waModal.acao}
          onClose={() => setWaModal(null)}
          onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
        />
      )}

      <div className="space-y-6 pb-12">
        {/* Header */}
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

        {/* Abas */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {[
            { key: "agendamentos", label: "Agendamentos", icon: CalendarClock },
            { key: "bloqueados", label: "Dias sem Trabalho", icon: BanIcon },
          ].map(a => (
            <button
              key={a.key}
              onClick={() => setAba(a.key as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                aba === a.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <a.icon className="w-4 h-4" />
              {a.label}
              {a.key === "bloqueados" && diasBloqueados.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {diasBloqueados.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ABA: AGENDAMENTOS */}
        {aba === "agendamentos" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "todos", label: "Todos" },
                { key: "pendente", label: "Pendentes" },
                { key: "confirmado", label: "Confirmados" },
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
                          <span className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5" />
                            {ag.veiculoModelo} — <span className="font-mono">{ag.veiculoPlaca.toUpperCase()}</span>
                          </span>
                        </div>
                        {ag.servicoNome && <p className="text-sm text-foreground font-medium">{ag.servicoNome}</p>}
                        {ag.observacoes && <p className="text-xs text-muted-foreground italic">"{ag.observacoes}"</p>}
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
                                onClick={() => setWaModal({ ag, acao: "confirmar" })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Confirmar
                              </button>
                              <button
                                onClick={() => setWaModal({ ag, acao: "recusar" })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Recusar
                              </button>
                            </>
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
          </>
        )}

        {/* ABA: DIAS BLOQUEADOS */}
        {aba === "bloqueados" && (
          <div className="max-w-sm">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Marque os dias em que a oficina não vai funcionar. Esses dias aparecem como <strong>"Fechado"</strong> no calendário dos clientes.
              </p>
            </div>
            <DiasBloqueadosSection
              diasBloqueados={diasBloqueados}
              onAdd={(data, motivo) => addBloqueioMutation.mutate({ data, motivo })}
              onRemove={(id) => removeBloqueioMutation.mutate(id)}
              isAdding={addBloqueioMutation.isPending}
            />
          </div>
        )}
      </div>
    </>
  );
}
