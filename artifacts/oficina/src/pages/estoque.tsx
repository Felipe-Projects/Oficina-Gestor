import React, { useState } from "react";
import { useListPecas, useCreatePeca, useMovimentarPeca } from "@workspace/api-client-react";
import { Package, Plus, AlertTriangle, ArrowDownUp } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { useQueryClient } from "@tanstack/react-query";

export default function Estoque() {
  const { data: pecas, isLoading } = useListPecas();
  const queryClient = useQueryClient();
  const createMutation = useCreatePeca();
  const movMutation = useMovimentarPeca();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<number>(0);
  
  const [createData, setCreateData] = useState({ nome: "", codigo: "", quantidade: 0, quantidadeMinima: 0, valorCusto: 0, valorVenda: 0 });
  const [movData, setMovData] = useState({ tipo: "entrada", quantidade: 1, motivo: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ data: createData as any });
    queryClient.invalidateQueries({ queryKey: ["/api/pecas"] });
    setIsCreateOpen(false);
  };

  const handleMov = async (e: React.FormEvent) => {
    e.preventDefault();
    await movMutation.mutateAsync({ id: selectedPeca, data: movData as any });
    queryClient.invalidateQueries({ queryKey: ["/api/pecas"] });
    setIsMovOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Estoque de Peças</h1>
          <p className="text-muted-foreground mt-1">Controle de inventário, alertas e precificação.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Cadastrar Peça
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Nome / Código</th>
                <th className="px-6 py-4 font-medium">Quantidade</th>
                <th className="px-6 py-4 font-medium">Valor Compra/Venda</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {pecas?.map(p => (
                <tr key={p.id} className={cn("hover:bg-muted/20", p.estoqueAlerta && "bg-red-50/50 dark:bg-red-900/10")}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.codigo || 'Sem código'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-bold text-lg", p.estoqueAlerta ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                        {p.quantidade}
                      </span>
                      {p.estoqueAlerta && <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Estoque Baixo" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Min: {p.quantidadeMinima}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div><span className="text-muted-foreground">Custo:</span> {formatCurrency(p.valorCusto)}</div>
                    <div className="font-medium text-foreground"><span className="text-muted-foreground font-normal">Venda:</span> {formatCurrency(p.valorVenda)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => { setSelectedPeca(p.id); setIsMovOpen(true); }}
                      className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ml-auto"
                    >
                      <ArrowDownUp className="w-4 h-4" /> Movimentar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nova Peça">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Nome *</label><input required type="text" className="w-full px-4 py-2 bg-background border rounded-xl" value={createData.nome} onChange={e=>setCreateData({...createData, nome: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Código</label><input type="text" className="w-full px-4 py-2 bg-background border rounded-xl" value={createData.codigo} onChange={e=>setCreateData({...createData, codigo: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Estoque Inicial</label><input type="number" required className="w-full px-4 py-2 bg-background border rounded-xl" value={createData.quantidade} onChange={e=>setCreateData({...createData, quantidade: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Estoque Mínimo</label><input type="number" required className="w-full px-4 py-2 bg-background border rounded-xl" value={createData.quantidadeMinima} onChange={e=>setCreateData({...createData, quantidadeMinima: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Custo Unitário</label><input type="number" step="0.01" required className="w-full px-4 py-2 bg-background border rounded-xl" value={createData.valorCusto} onChange={e=>setCreateData({...createData, valorCusto: Number(e.target.value)})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Preço de Venda</label><input type="number" step="0.01" required className="w-full px-4 py-2 bg-background border rounded-xl" value={createData.valorVenda} onChange={e=>setCreateData({...createData, valorVenda: Number(e.target.value)})} /></div>
          </div>
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl mt-4 font-semibold">Salvar Peça</button>
        </form>
      </Modal>

      <Modal isOpen={isMovOpen} onClose={() => setIsMovOpen(false)} title="Movimentar Estoque">
        <form onSubmit={handleMov} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Tipo</label>
            <select className="w-full px-4 py-2 bg-background border rounded-xl" value={movData.tipo} onChange={e=>setMovData({...movData, tipo: e.target.value})}>
              <option value="entrada">Entrada (+)</option>
              <option value="saida">Saída (-)</option>
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Quantidade</label><input type="number" min="1" required className="w-full px-4 py-2 bg-background border rounded-xl" value={movData.quantidade} onChange={e=>setMovData({...movData, quantidade: Number(e.target.value)})} /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Motivo</label><input type="text" placeholder="Ex: Compra, Ajuste, Extravio" className="w-full px-4 py-2 bg-background border rounded-xl" value={movData.motivo} onChange={e=>setMovData({...movData, motivo: e.target.value})} /></div>
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl mt-4 font-semibold">Confirmar</button>
        </form>
      </Modal>
    </div>
  );
}
