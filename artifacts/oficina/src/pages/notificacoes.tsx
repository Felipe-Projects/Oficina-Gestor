import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Send, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotificacaoConfig {
  id: number;
  diasAntecedencia: number;
  ativo: boolean;
  numeroRemetente: string | null;
}

interface NotificacaoLog {
  id: number;
  manutencaoId: number;
  clienteNome: string;
  numero: string;
  mensagem: string;
  status: "enviado" | "erro";
  erro: string | null;
  enviadoEm: string;
}

export default function Notificacoes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showLog, setShowLog] = useState(false);
  const [forcarReenvio, setForcarReenvio] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery<NotificacaoConfig>({
    queryKey: ["/api/notificacoes/config"],
    queryFn: () => apiRequest("GET", "/api/notificacoes/config"),
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery<NotificacaoLog[]>({
    queryKey: ["/api/notificacoes/log"],
    queryFn: () => apiRequest("GET", "/api/notificacoes/log"),
    enabled: showLog,
  });

  const [form, setForm] = useState<{ diasAntecedencia: number; ativo: boolean }>({
    diasAntecedencia: 7,
    ativo: true,
  });

  React.useEffect(() => {
    if (config) {
      setForm({ diasAntecedencia: config.diasAntecedencia, ativo: config.ativo });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data: { diasAntecedencia: number; ativo: boolean }) =>
      apiRequest("PUT", "/api/notificacoes/config", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notificacoes/config"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    },
  });

  const dispararMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/notificacoes/disparar${forcarReenvio ? "?forcar=true" : ""}`),
    onSuccess: (data: any) => {
      refetchLogs();
      toast({
        title: "Disparo concluído",
        description: `Enviados: ${data.enviados} | Erros: ${data.erros} | Ignorados: ${data.ignorados}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao disparar notificações",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (configLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  const totalEnviados = logs.filter((l) => l.status === "enviado").length;
  const totalErros = logs.filter((l) => l.status === "erro").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          Notificações WhatsApp
        </h1>
        <p className="text-muted-foreground mt-1">
          Envio automático de avisos de manutenção para os clientes via WhatsApp (Twilio).
        </p>
      </div>

      {/* Como funciona */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2">
        <p className="font-semibold text-primary text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Como funciona
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>A cada hora o sistema verifica manutenções próximas do vencimento.</li>
          <li>Clientes com WhatsApp ou telefone cadastrado recebem mensagem automática.</li>
          <li>Você pode disparar manualmente a qualquer momento pelo botão abaixo.</li>
          <li>
            Número Twilio configurado:{" "}
            <span className="font-mono font-semibold text-foreground">
              {config?.numeroRemetente ?? "+17172948883"}
            </span>
          </li>
        </ul>
      </div>

      {/* Configurações */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-display font-semibold">Configurações</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notificações automáticas</p>
            <p className="text-sm text-muted-foreground">Ativa ou desativa o envio automático a cada hora.</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              form.ativo ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${
                form.ativo ? "left-[calc(100%-1.375rem)]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="space-y-2">
          <label className="font-medium text-sm">Dias de antecedência para avisar</label>
          <p className="text-xs text-muted-foreground">
            Clientes serão avisados quando a manutenção estiver a este número de dias de distância.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={60}
              value={form.diasAntecedencia}
              onChange={(e) => setForm((f) => ({ ...f, diasAntecedencia: Number(e.target.value) }))}
              className="flex-1 accent-primary"
            />
            <span className="w-20 text-center bg-muted rounded-lg px-3 py-1.5 font-bold text-primary">
              {form.diasAntecedencia} dias
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 dia</span>
            <span>60 dias</span>
          </div>
        </div>

        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>

      {/* Disparo manual */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-display font-semibold">Disparo Manual</h2>
        <p className="text-sm text-muted-foreground">
          Executa agora a verificação e envia mensagens para todos os clientes com manutenções
          previstas nos próximos <strong>{form.diasAntecedencia} dias</strong>.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => dispararMutation.mutate()}
            disabled={dispararMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {dispararMutation.isPending ? "Disparando..." : "Disparar notificações agora"}
          </button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forcarReenvio}
              onChange={(e) => setForcarReenvio(e.target.checked)}
              className="accent-primary"
            />
            Forçar reenvio (incluir já notificados)
          </label>
        </div>
      </div>

      {/* Log */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLog((v) => !v)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/40 transition-colors"
        >
          <div>
            <h2 className="text-lg font-display font-semibold">Histórico de Envios</h2>
            {logs.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalEnviados} enviados, {totalErros} com erro
              </p>
            )}
          </div>
          {showLog ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {showLog && (
          <div className="border-t border-border/50">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum disparo registrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 shrink-0">
                      {log.status === "enviado" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-sm">{log.clienteNome}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.enviadoEm).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.numero}</p>
                      {log.erro && (
                        <p className="text-xs text-red-500 mt-1 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                          {log.erro}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
