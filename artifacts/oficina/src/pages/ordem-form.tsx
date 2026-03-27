import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetOrdem, useCreateOrdem, useUpdateOrdem, 
  useListClientes, useListVeiculos, useListServicos, useListPecas 
} from "@workspace/api-client-react";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowLeft, Save, Trash2, PlusCircle, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

  // Form State
  const [clienteId, setClienteId] = useState<number | "">("");
  const [veiculoId, setVeiculoId] = useState<number | "">("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("orcamento");
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Checklist State
  const [checklist, setChecklist] = useState<Record<string, any>>({
    riscos: false, vidrosOk: true, parabrisasOk: true, rodasOk: true, tapetes: true, combustivel: "1/2", interior: "bom"
  });

  // Items State
  const [servicos, setServicos] = useState<{servicoId: number, valor: number, tempId: number}[]>([]);
  const [pecas, setPecas] = useState<{pecaId: number, quantidade: number, valorUnitario: number, tempId: number}[]>([]);

  // Fetch Veiculos dynamically
  const { data: veiculos } = useListVeiculos({ clienteId: clienteId as number }, { query: { enabled: !!clienteId } });

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
      
      setServicos(existingOs.servicos.map(s => ({ servicoId: s.servicoId, valor: s.valor, tempId: Math.random() })));
      setPecas(existingOs.pecas.map(p => ({ pecaId: p.pecaId, quantidade: p.quantidade, valorUnitario: p.valorUnitario, tempId: Math.random() })));
    }
  }, [existingOs]);

  const totalServicos = servicos.reduce((acc, s) => acc + s.valor, 0);
  const totalPecas = pecas.reduce((acc, p) => acc + (p.quantidade * p.valorUnitario), 0);
  const total = totalServicos + totalPecas;

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
      pecas: pecas.map(p => ({ pecaId: p.pecaId, quantidade: p.quantidade, valorUnitario: p.valorUnitario }))
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync({ data: payload });
      } else {
        await updateMutation.mutateAsync({ id: osId as number, data: payload });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ordens"] });
      setLocation("/ordens");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ordem de serviço");
    }
  };

  if (!isNew && isLoadingOs) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-8">
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
                <option value="orcamento">📝 Orçamento</option>
                <option value="em_andamento">⚙️ Em Andamento</option>
                <option value="finalizado">✅ Finalizado</option>
                <option value="entregue">🚗 Entregue</option>
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
                onClick={() => setPecas([...pecas, { pecaId: pecasCat?.[0]?.id || 0, quantidade: 1, valorUnitario: pecasCat?.[0]?.valorVenda || 0, tempId: Math.random() }])}
                className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="flex-1 space-y-3">
              {pecas.map((p, idx) => (
                <div key={p.tempId} className="flex gap-2 items-center bg-background p-2 rounded-xl border border-border/50">
                  <select 
                    value={p.pecaId}
                    onChange={e => {
                      const newId = Number(e.target.value);
                      const catInfo = pecasCat?.find(c => c.id === newId);
                      const newP = [...pecas];
                      newP[idx].pecaId = newId;
                      if (catInfo) newP[idx].valorUnitario = catInfo.valorVenda;
                      setPecas(newP);
                    }}
                    className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
                  >
                    <option value={0} disabled>Selecione...</option>
                    {pecasCat?.map(cat => <option key={cat.id} value={cat.id}>{cat.nome} (Estoque: {cat.quantidade})</option>)}
                  </select>
                  <input 
                    type="number" 
                    value={p.quantidade}
                    onChange={e => {
                      const newP = [...pecas];
                      newP[idx].quantidade = Number(e.target.value);
                      setPecas(newP);
                    }}
                    className="w-16 px-3 py-2 bg-muted rounded-lg outline-none text-sm text-center"
                    min="1" title="Qtd"
                  />
                  <input 
                    type="number" 
                    value={p.valorUnitario}
                    onChange={e => {
                      const newP = [...pecas];
                      newP[idx].valorUnitario = Number(e.target.value);
                      setPecas(newP);
                    }}
                    className="w-24 px-3 py-2 bg-muted rounded-lg outline-none text-sm font-medium"
                    step="0.01" min="0" title="Valor Unitário"
                  />
                  <button type="button" onClick={() => setPecas(pecas.filter(x => x.tempId !== p.tempId))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
