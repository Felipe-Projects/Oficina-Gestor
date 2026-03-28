import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Car, User, Phone, ChevronLeft, ChevronRight, Check, Wrench, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  valorPadrao: number;
  duracaoDias: number | null;
}

interface Disponibilidade {
  data: string;
  ocupacao: number;
  disponivel: boolean;
  bloqueado: boolean;
}

const HORARIOS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function hoje(): string {
  return new Date().toISOString().split("T")[0];
}

type Step = "servico" | "data" | "horario" | "dados" | "sucesso";

export default function Agendar() {
  const [step, setStep] = useState<Step>("servico");
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [form, setForm] = useState({ nome: "", telefone: "", placa: "", modelo: "", observacoes: "" });
  const [erro, setErro] = useState<string | null>(null);

  const dataInicio = hoje();

  const { data: servicos } = useQuery<Servico[]>({
    queryKey: ["/api/servicos"],
    queryFn: () => apiRequest("GET", "/api/servicos"),
  });

  const { data: disponibilidade } = useQuery<Disponibilidade[]>({
    queryKey: ["/api/agendamentos/disponibilidade", dataInicio],
    queryFn: () => apiRequest("GET", `/api/agendamentos/disponibilidade?dataInicio=${dataInicio}&dias=90`),
  });

  const dispMap = React.useMemo(() => {
    const m: Record<string, Disponibilidade> = {};
    (disponibilidade ?? []).forEach(d => { m[d.data] = d; });
    return m;
  }, [disponibilidade]);

  const criarMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agendamentos", data),
    onSuccess: () => setStep("sucesso"),
    onError: (err: any) => setErro(err.message || "Erro ao agendar. Tente outra data."),
  });

  // Build calendar grid for current month
  const calendarDays = React.useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    const days: Array<{ date: string; dayOfWeek: number } | null> = [];
    // pad start
    for (let i = 0; i < primeiro.getDay(); i++) days.push(null);
    for (let d = 1; d <= ultimo.getDate(); d++) {
      const dateStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, dayOfWeek: new Date(dateStr + "T12:00:00Z").getUTCDay() });
    }
    return days;
  }, [mesAtual]);

  const handleSubmit = () => {
    if (!form.nome || !form.telefone || !form.placa || !form.modelo) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    setErro(null);
    criarMutation.mutate({
      clienteNome: form.nome,
      clienteTelefone: form.telefone,
      veiculoPlaca: form.placa.toUpperCase(),
      veiculoModelo: form.modelo,
      servicoId: servicoSelecionado?.id ?? null,
      servicoNome: servicoSelecionado?.nome ?? null,
      dataAgendamento: dataSelecionada,
      horario: horarioSelecionado,
      duracaoDias: servicoSelecionado?.duracaoDias ?? 1,
      observacoes: form.observacoes || null,
    });
  };

  const progresso = { servico: 1, data: 2, horario: 3, dados: 4, sucesso: 5 }[step];

  if (step === "sucesso") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Agendamento Realizado!</h1>
            <p className="text-muted-foreground mt-2">
              Recebemos seu pedido para <strong>{dataSelecionada ? dataSelecionada.split("-").reverse().join("/") : ""}</strong> às <strong>{horarioSelecionado}</strong>.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Entraremos em contato via telefone para confirmar o agendamento.
            </p>
          </div>
          <button
            onClick={() => { setStep("servico"); setDataSelecionada(null); setHorarioSelecionado(null); setServicoSelecionado(null); setForm({ nome: "", telefone: "", placa: "", modelo: "", observacoes: "" }); }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Fazer outro agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border/50 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-display font-bold text-foreground">Agendar Visita</h1>
          <p className="text-sm text-muted-foreground">Oficina Pro — Gestão Automotiva</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border-b border-border/50 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {["Serviço", "Data", "Horário", "Dados"].map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  progresso > i + 1 ? "bg-primary text-primary-foreground" :
                  progresso === i + 1 ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                )}>
                  {progresso > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", progresso === i + 1 ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < 3 && <div className={cn("flex-1 h-0.5 rounded", progresso > i + 1 ? "bg-primary" : "bg-muted")} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* STEP 1: Serviço */}
        {step === "servico" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Qual serviço você precisa?</h2>
              <p className="text-sm text-muted-foreground mt-1">Selecione um serviço ou pule esta etapa.</p>
            </div>
            <div className="grid gap-3">
              {(servicos ?? []).map(s => (
                <button
                  key={s.id}
                  onClick={() => { setServicoSelecionado(s); setStep("data"); }}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all",
                    servicoSelecionado?.id === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{s.nome}</p>
                      {s.descricao && <p className="text-sm text-muted-foreground mt-0.5">{s.descricao}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {s.duracaoDias && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                          {s.duracaoDias} dia{s.duracaoDias !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setServicoSelecionado(null); setStep("data"); }}
              className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors text-sm font-medium"
            >
              Não sei / Outro serviço → Continuar assim mesmo
            </button>
          </div>
        )}

        {/* STEP 2: Data */}
        {step === "data" && (
          <div className="space-y-4">
            {servicoSelecionado && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                <Wrench className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground font-medium">{servicoSelecionado.nome}</span>
                {servicoSelecionado.duracaoDias && (
                  <span className="text-muted-foreground">• previsão: {servicoSelecionado.duracaoDias} dia{servicoSelecionado.duracaoDias !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}

            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Escolha uma data</h2>
              <p className="text-sm text-muted-foreground mt-1">Datas em verde estão disponíveis.</p>
            </div>

            {/* Calendar navigation */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <button
                  onClick={() => setMesAtual(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-display font-semibold text-foreground">
                  {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                </span>
                <button
                  onClick={() => setMesAtual(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3">
                <div className="grid grid-cols-7 mb-2">
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const isPast = day.date < hoje();
                    const isDomingo = day.dayOfWeek === 0;
                    const disp = dispMap[day.date];
                    const available = disp?.disponivel ?? false;
                    const bloqueado = disp?.bloqueado ?? false;
                    const lotado = disp && !available && !bloqueado;
                    const isSelected = dataSelecionada === day.date;
                    const disabled = isPast || isDomingo || bloqueado || !available;

                    return (
                      <button
                        key={day.date}
                        disabled={disabled}
                        onClick={() => { setDataSelecionada(day.date); setStep("horario"); }}
                        title={bloqueado ? "Fechado" : lotado ? "Lotado" : undefined}
                        className={cn(
                          "aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center",
                          isSelected ? "bg-primary text-primary-foreground shadow-md" :
                          bloqueado ? "bg-muted/60 text-muted-foreground/40 cursor-not-allowed line-through" :
                          disabled ? "text-muted-foreground/40 cursor-not-allowed" :
                          available ? "text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer" :
                          "text-muted-foreground/40 cursor-not-allowed"
                        )}
                      >
                        <span>{day.date.split("-")[2]}</span>
                        {!isPast && !isDomingo && disp && (
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full mt-0.5",
                            bloqueado ? "bg-muted-foreground/30" :
                            available ? "bg-green-500" : "bg-amber-400"
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Disponível</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Lotado</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" />Fechado</span>
              </div>
            </div>

            <button onClick={() => setStep("servico")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        )}

        {/* STEP 3: Horário */}
        {step === "horario" && dataSelecionada && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Escolha o horário de entrada</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Data selecionada: <strong>{dataSelecionada.split("-").reverse().join("/")}</strong>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {HORARIOS.map(h => (
                <button
                  key={h}
                  onClick={() => { setHorarioSelecionado(h); setStep("dados"); }}
                  className={cn(
                    "py-4 rounded-xl border-2 text-base font-semibold transition-all",
                    horarioSelecionado === h
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border/50 bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>

            <button onClick={() => setStep("data")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        )}

        {/* STEP 4: Dados do cliente */}
        {step === "dados" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Seus dados</h2>
              <p className="text-sm text-muted-foreground mt-1">Precisamos de algumas informações para confirmar.</p>
            </div>

            {/* Resumo */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1 text-sm">
              {servicoSelecionado && <p><span className="text-muted-foreground">Serviço:</span> <strong className="text-foreground">{servicoSelecionado.nome}</strong></p>}
              <p><span className="text-muted-foreground">Data:</span> <strong className="text-foreground">{dataSelecionada?.split("-").reverse().join("/")}</strong></p>
              <p><span className="text-muted-foreground">Horário:</span> <strong className="text-foreground">{horarioSelecionado}</strong></p>
              {servicoSelecionado?.duracaoDias && (
                <p><span className="text-muted-foreground">Previsão de conclusão:</span> <strong className="text-foreground">{servicoSelecionado.duracaoDias} dia{servicoSelecionado.duracaoDias !== 1 ? "s" : ""}</strong></p>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Seu nome <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary text-sm"
                    placeholder="João Silva"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Telefone / WhatsApp <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary text-sm"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Placa do veículo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.placa}
                    onChange={e => setForm(p => ({ ...p, placa: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary text-sm font-mono uppercase"
                    placeholder="ABC-1234"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Modelo do veículo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.modelo}
                    onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary text-sm"
                    placeholder="Honda Civic 2020"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Observações <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary text-sm resize-none"
                  placeholder="Descreva o problema ou peça alguma informação adicional..."
                />
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep("horario")} className="px-5 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={criarMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {criarMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check className="w-5 h-5" /> Confirmar agendamento</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
