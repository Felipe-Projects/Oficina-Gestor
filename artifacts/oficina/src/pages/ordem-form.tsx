import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetOrdem, useCreateOrdem, useUpdateOrdem, 
  useListClientes, useListVeiculos, useListServicos, useListPecas 
} from "@workspace/api-client-react";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowLeft, Save, Trash2, PlusCircle, FileDown, ChevronDown, ChevronUp, CalendarClock, Wrench, Plus } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { gerarOrcamentoPdf } from "@/lib/gerarOrcamentoPdf";
import { apiRequest } from "@/lib/queryClient";

interface ManutencaoOSItem {
  id?: number;
  nome: string;
  ultimaTroca: string;
  proximaTrocaData: string;
  proximaTrocaKm: string;
  tempId: number;
}

interface PecaItem {
  pecaId: number;
  quantidade: number;
  valorUnitario: number;
  tempId: number;
  proximaTrocaData?: string | null;
  proximaTrocaKm?: number | null;
  showTroca?: boolean;
}

export default function OrdemForm() {
  const [match, params] = useRoute("/ordens/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const isNew = params?.id === "nova";
  const osId = isNew ? null : Number(params?.id);

  const { data: clientes } = useListClientes();
  const { data: servicosCat } = useListServicos();
  const { data: pecasCat } = useListPecas();
  const { data: existingOs, isLoading: isLoadingOs } = useGetOrdem(osId as number, { query: { enabled: !isNew && !!osId } });

  const createMutation = useCreateOrdem();
  const updateMutation = useUpdateOrdem();

  const [clienteId, setClienteId] = useState<number | "">("");
  const [veiculoId, setVeiculoId] = useState<number | "">("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("orcamento");
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  const [checklist, setChecklist] = useState<Record<string, any>>({
    riscos: false, vidrosOk: true, parabrisasOk: true, rodasOk: true, tapetes: true, combustivel: "1/2", interior: "bom"
  });

  const [servicos, setServicos] = useState<{servicoId: number, valor: number, tempId: number}[]>([]);
  const [pecas, setPecas] = useState<PecaItem[]>([]);
  const [manutencaoItems, setManutencaoItems] = useState<ManutencaoOSItem[]>([]);
  const [showManutencao, setShowManutencao] = useState(false);

  const { data: veiculos } = useListVeiculos({ clienteId: clienteId as number }, { query: { enabled: !!clienteId } });
  const { data: manutencaoExistente } = useQuery<ManutencaoOSItem[]>({
    queryKey: ["/api/manutencao", veiculoId],
    queryFn: () => apiRequest("GET", `/api/manutencao?veiculoId=${veiculoId}`),
    enabled: !!veiculoId,
  });

  useEffect(() => {
    if (existingOs) {
      setClienteId(existingOs.clienteId);
      setVeiculoId(existingOs.veiculoId);
      setResponsavel(existingOs.responsavel);
      setStatus(existingOs.status);
      setDataEntrada(existingOs.dataEntrada.split('T')[0]);
      setDataPrevisao(existingOs.dataPrevisao ? existingOs.dataPrevisao.split('T')[0] : "");
      setObservacoes(existingOs.observacoes || "");
      if (existingOs.checklistEntrada) setChecklist(existingOs.checklistEntrada);
      
      setServicos(existingOs.servicos.map((s: any) => ({ servicoId: s.servicoId, valor: s.valor, tempId: Math.random() })));
      setPecas(existingOs.pecas.map((p: any) => ({
        pecaId: p.pecaId,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
        tempId: Math.random(),
        proximaTrocaData: p.proximaTrocaData ?? null,
        proximaTrocaKm: p.proximaTrocaKm ?? null,
        showTroca: !!(p.proximaTrocaData || p.proximaTrocaKm),
      })));
    }
  }, [existingOs]);

  useEffect(() => {
    if (manutencaoExistente && manutencaoExistente.length > 0) {
      setManutencaoItems(manutencaoExistente.map((m: any) => ({
        id: m.id,
        nome: m.nome,
        ultimaTroca: m.ultimaTroca ?? "",
        proximaTrocaData: m.proximaTrocaData ?? "",
        proximaTrocaKm: m.proximaTrocaKm != null ? String(m.proximaTrocaKm) : "",
        tempId: Math.random(),
      })));
      setShowManutencao(true);
    }
  }, [manutencaoExistente]);

  const totalServicos = servicos.reduce((acc, s) => acc + s.valor, 0);
  const totalPecas = pecas.reduce((acc, p) => acc + (p.quantidade * p.valorUnitario), 0);
  const total = totalServicos + totalPecas;

  const handleGerarPdf = () => {
    if (!existingOs) return;
    const cliente = clientes?.find(c => c.id === existingOs.clienteId);
    gerarOrcamentoPdf({
      numero: existingOs.numero,
      dataEntrada: existingOs.dataEntrada,
      dataPrevisao: existingOs.dataPrevisao ?? undefined,
      clienteNome: existingOs.clienteNome,
      clienteTelefone: cliente?.telefone ?? undefined,
      clienteEmail: cliente?.email ?? undefined,
      veiculoMarca: existingOs.veiculoMarca,
      veiculoModelo: existingOs.veiculoModelo,
      veiculoPlaca: existingOs.veiculoPlaca,
      veiculoAno: existingOs.veiculoAno ?? undefined,
      veiculoKm: existingOs.veiculoKm ?? undefined,
      responsavel: existingOs.responsavel,
      servicos: servicos.map(s => ({
        nome: servicosCat?.find(c => c.id === s.servicoId)?.nome ?? `Serviço #${s.servicoId}`,
        valor: s.valor,
      })),
      pecas: pecas.map(p => ({
        nome: pecasCat?.find(c => c.id === p.pecaId)?.nome ?? `Peça #${p.pecaId}`,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
      })),
      observacoes: observacoes || undefined,
      totalServicos,
      totalPecas,
      total,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !veiculoId || !responsavel) return alert("Preencha os campos obrigatórios");

    const payload = {
      clienteId: Number(clienteId),
      veiculoId: Number(veiculoId),
      responsavel,
      status: status as any,
      dataEntrada: new Date(dataEntrada).toISOString(),
      dataPrevisao: dataPrevisao ? new Date(dataPrevisao).toISOString() : undefined,
      observacoes,
      checklistEntrada: checklist,
      servicos: servicos.map(s => ({ servicoId: s.servicoId, valor: s.valor })),
      pecas: pecas.map(p => ({
        pecaId: p.pecaId,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
        proximaTrocaData: p.proximaTrocaData || null,
        proximaTrocaKm: p.proximaTrocaKm || null,
      }))
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync({ data: payload });
      } else {
        await updateMutation.mutateAsync({ id: osId as number, data: payload });
      }

      for (const item of manutencaoItems) {
        if (!item.nome.trim()) continue;
        const mData = {
          nome: item.nome,
          ultimaTroca: item.ultimaTroca || null,
          proximaTrocaData: item.proximaTrocaData || null,
          proximaTrocaKm: item.proximaTrocaKm ? parseInt(item.proximaTrocaKm) : null,
        };
        if (item.id) {
          await apiRequest("PUT", `/api/manutencao/${item.id}`, mData);
        } else {
          await apiRequest("POST", `/api/manutencao`, { ...mData, veiculoId: Number(veiculoId) });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ordens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manutencao"] });
      setLocation("/ordens");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ordem de serviço");
    }
  };

  const updateManutencao = (idx: number, fields: Partial<ManutencaoOSItem>) => {
    setManutencaoItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...fields };
      return next;
    });
  };

  const addManutencaoItem = () => {
    setManutencaoItems(prev => [...prev, {
      nome: "",
      ultimaTroca: new Date().toISOString().split("T")[0],
      proximaTrocaData: "",
      proximaTrocaKm: "",
      tempId: Math.random(),
    }]);
  };

  const removeManutencaoItem = (idx: number) => {
    setManutencaoItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePeca = (idx: number, fields: Partial<PecaItem>) => {
    setPecas(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...fields };
      return next;
    });
  };

  if (!isNew && isLoadingOs) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/ordens")} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {isNew ? "Nova Ordem de Serviço" : `OS #${existingOs?.numero}`}
            </h1>
            <p className="text-muted-foreground mt-1">Preencha os dados do serviço abaixo.</p>
          </div>
        </div>
        {!isNew && existingOs && (
          <button
            type="button"
            data-testid="button-gerar-pdf"
            onClick={handleGerarPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted font-medium text-foreground transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4 text-primary" />
            Gerar PDF do Orçamento
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm space-y-6">
          <h2 className="text-xl font-display font-semibold border-b border-border/50 pb-4 mb-4">Informações Principais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cliente <span className="text-red-500">*</span></label>
              <select 
                value={clienteId} 
                onChange={e => { setClienteId(Number(e.target.value)); setVeiculoId(""); }}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              >
                <option value="">Selecione um cliente...</option>
                {clientes?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Veículo <span className="text-red-500">*</span></label>
              <select 
                value={veiculoId} 
                onChange={e => setVeiculoId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                required
                disabled={!clienteId}
              >
                <option value="">Selecione um veículo...</option>
                {veiculos?.map(v => <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Responsável <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Mecânico responsável"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-semibold"
              >
                <option value="orcamento">Orçamento</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="finalizado">Finalizado</option>
                <option value="entregue">Entregue</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data Entrada <span className="text-red-500">*</span></label>
              <input 
                type="date" 
                value={dataEntrada}
                onChange={e => setDataEntrada(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Previsão Entrega</label>
              <input 
                type="date" 
                value={dataPrevisao}
                onChange={e => setDataPrevisao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Serviços e Peças */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Serviços */}
          <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col">
            <div className="flex justify-between items-center border-b border-border/50 pb-4 mb-4">
              <h2 className="text-lg font-display font-semibold">Serviços</h2>
              <button 
                type="button" 
                onClick={() => setServicos([...servicos, { servicoId: servicosCat?.[0]?.id || 0, valor: servicosCat?.[0]?.valorPadrao || 0, tempId: Math.random() }])}
                className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="flex-1 space-y-3">
              {servicos.map((s, idx) => (
                <div key={s.tempId} className="flex gap-2 items-center bg-background p-2 rounded-xl border border-border/50">
                  <select 
                    value={s.servicoId}
                    onChange={e => {
                      const newId = Number(e.target.value);
                      const catInfo = servicosCat?.find(c => c.id === newId);
                      const newS = [...servicos];
                      newS[idx].servicoId = newId;
                      if (catInfo) newS[idx].valor = catInfo.valorPadrao;
                      setServicos(newS);
                    }}
                    className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
                  >
                    <option value={0} disabled>Selecione...</option>
                    {servicosCat?.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                  </select>
                  <input 
                    type="number" 
                    value={s.valor}
                    onChange={e => {
                      const newS = [...servicos];
                      newS[idx].valor = Number(e.target.value);
                      setServicos(newS);
                    }}
                    className="w-24 px-3 py-2 bg-muted rounded-lg outline-none text-sm font-medium"
                    step="0.01" min="0"
                  />
                  <button type="button" onClick={() => setServicos(servicos.filter(x => x.tempId !== s.tempId))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {servicos.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Nenhum serviço adicionado.</p>}
            </div>
            <div className="pt-4 mt-4 border-t border-border/50 flex justify-between items-center font-bold">
              <span>Subtotal Serviços:</span>
              <span className="text-lg">{formatCurrency(totalServicos)}</span>
            </div>
          </div>

          {/* Peças */}
          <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col">
            <div className="flex justify-between items-center border-b border-border/50 pb-4 mb-4">
              <h2 className="text-lg font-display font-semibold">Peças (Estoque)</h2>
              <button 
                type="button" 
                onClick={() => setPecas([...pecas, { pecaId: pecasCat?.[0]?.id || 0, quantidade: 1, valorUnitario: pecasCat?.[0]?.valorVenda || 0, tempId: Math.random(), showTroca: false }])}
                className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="flex-1 space-y-3">
              {pecas.map((p, idx) => (
                <div key={p.tempId} className="bg-background rounded-xl border border-border/50 overflow-hidden">
                  {/* Linha principal */}
                  <div className="flex gap-2 items-center p-2">
                    <select 
                      value={p.pecaId}
                      onChange={e => {
                        const newId = Number(e.target.value);
                        const catInfo = pecasCat?.find(c => c.id === newId);
                        updatePeca(idx, { pecaId: newId, ...(catInfo ? { valorUnitario: catInfo.valorVenda } : {}) });
                      }}
                      className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
                    >
                      <option value={0} disabled>Selecione...</option>
                      {pecasCat?.map(cat => <option key={cat.id} value={cat.id}>{cat.nome} (Estoque: {cat.quantidade})</option>)}
                    </select>
                    <input 
                      type="number" 
                      value={p.quantidade}
                      onChange={e => updatePeca(idx, { quantidade: Number(e.target.value) })}
                      className="w-16 px-3 py-2 bg-muted rounded-lg outline-none text-sm text-center"
                      min="1" title="Qtd"
                    />
                    <input 
                      type="number" 
                      value={p.valorUnitario}
                      onChange={e => updatePeca(idx, { valorUnitario: Number(e.target.value) })}
                      className="w-24 px-3 py-2 bg-muted rounded-lg outline-none text-sm font-medium"
                      step="0.01" min="0" title="Valor Unitário"
                    />
                    <button
                      type="button"
                      title="Próxima troca"
                      onClick={() => updatePeca(idx, { showTroca: !p.showTroca })}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        p.showTroca
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                      )}
                    >
                      <CalendarClock className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setPecas(pecas.filter(x => x.tempId !== p.tempId))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Seção Próxima Troca */}
                  {p.showTroca && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/40 bg-primary/5">
                      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" />
                        Próxima Troca
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Data prevista</label>
                          <input
                            type="date"
                            value={p.proximaTrocaData ?? ""}
                            onChange={e => updatePeca(idx, { proximaTrocaData: e.target.value || null })}
                            className="w-full px-2 py-1.5 rounded-lg bg-background border border-border outline-none text-xs focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Quilometragem (km)</label>
                          <input
                            type="number"
                            value={p.proximaTrocaKm ?? ""}
                            onChange={e => updatePeca(idx, { proximaTrocaKm: e.target.value ? Number(e.target.value) : null })}
                            placeholder="Ex: 85000"
                            className="w-full px-2 py-1.5 rounded-lg bg-background border border-border outline-none text-xs focus:border-primary"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {pecas.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Nenhuma peça adicionada.</p>}
            </div>
            <div className="pt-4 mt-4 border-t border-border/50 flex justify-between items-center font-bold">
              <span>Subtotal Peças:</span>
              <span className="text-lg">{formatCurrency(totalPecas)}</span>
            </div>
          </div>
        </div>

        {/* Controle de Manutenção */}
        {veiculoId && (
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowManutencao(v => !v)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary"><Wrench className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-lg font-display font-semibold">Controle de Manutenção</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Registre última e próxima troca de correia, óleo, filtros, etc.
                    {manutencaoItems.length > 0 && ` • ${manutencaoItems.length} item(ns) registrado(s)`}
                  </p>
                </div>
              </div>
              {showManutencao ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>

            {showManutencao && (
              <div className="px-6 pb-6 space-y-3 border-t border-border/50 pt-4">
                {manutencaoItems.map((item, idx) => (
                  <div key={item.tempId} className="bg-background rounded-xl border border-border/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Óleo do motor, Correia dentada, Filtro de ar..."
                        value={item.nome}
                        onChange={e => updateManutencao(idx, { nome: e.target.value })}
                        className="flex-1 px-3 py-2 bg-muted rounded-lg outline-none text-sm focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => removeManutencaoItem(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Última troca</label>
                        <input
                          type="date"
                          value={item.ultimaTroca}
                          onChange={e => updateManutencao(idx, { ultimaTroca: e.target.value })}
                          className="w-full px-2 py-1.5 bg-muted rounded-lg outline-none text-xs focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Próx. data</label>
                        <input
                          type="date"
                          value={item.proximaTrocaData}
                          onChange={e => updateManutencao(idx, { proximaTrocaData: e.target.value })}
                          className="w-full px-2 py-1.5 bg-muted rounded-lg outline-none text-xs focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Próx. KM</label>
                        <input
                          type="number"
                          placeholder="Ex: 85000"
                          value={item.proximaTrocaKm}
                          onChange={e => updateManutencao(idx, { proximaTrocaKm: e.target.value })}
                          className="w-full px-2 py-1.5 bg-muted rounded-lg outline-none text-xs focus:ring-2 focus:ring-primary/20"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addManutencaoItem}
                  className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar item de manutenção
                </button>
              </div>
            )}
          </div>
        )}

        {/* Observações */}
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
          <h2 className="text-lg font-display font-semibold border-b border-border/50 pb-4 mb-4">Observações</h2>
          <textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            rows={3}
            placeholder="Observações adicionais sobre a OS..."
            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm"
          />
        </div>

        {/* Footer Actions */}
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 sticky bottom-6 z-20">
          <div className="text-center md:text-left">
            <p className="text-muted-foreground text-sm font-medium">Valor Total da OS</p>
            <p className="text-4xl font-display font-bold text-primary">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button type="button" onClick={() => setLocation("/ordens")} className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-border font-medium hover:bg-muted transition-colors text-foreground">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 md:flex-none bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Save className="w-5 h-5" /> Salvar OS</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
