import React, { useState } from "react";
import { useListVeiculos, useListClientes, useCreateVeiculo, useDeleteVeiculo } from "@workspace/api-client-react";
import { Car, Plus, Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useQueryClient } from "@tanstack/react-query";

export default function VeiculosList() {
  const { data: veiculos, isLoading } = useListVeiculos();
  const { data: clientes } = useListClientes();
  const queryClient = useQueryClient();
  const createMutation = useCreateVeiculo();
  const deleteMutation = useDeleteVeiculo();
  
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    clienteId: "", placa: "", modelo: "", marca: "", ano: new Date().getFullYear(), km: "", cor: "", observacoes: "" 
  });

  const filtered = veiculos?.filter(v => 
    v.placa.toLowerCase().includes(search.toLowerCase()) || 
    v.modelo.toLowerCase().includes(search.toLowerCase()) ||
    v.clienteNome?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ data: { 
      ...formData, 
      clienteId: Number(formData.clienteId), 
      ano: Number(formData.ano), 
      km: formData.km ? Number(formData.km) : undefined 
    } });
    queryClient.invalidateQueries({ queryKey: ["/api/veiculos"] });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os veículos cadastrados na oficina.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Veículo
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa, modelo ou cliente..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Veículo</th>
                <th className="px-6 py-4 font-medium">Placa</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Ano/KM</th>
                <th className="px-6 py-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Car className="w-5 h-5" /></div>
                      <div>{v.marca} {v.modelo}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold tracking-wider">{v.placa.toUpperCase()}</td>
                  <td className="px-6 py-4">{v.clienteNome}</td>
                  <td className="px-6 py-4 text-muted-foreground">{v.ano} • {v.km ? `${v.km} km` : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={async () => { if(confirm("Excluir?")) { await deleteMutation.mutateAsync({id: v.id}); queryClient.invalidateQueries({queryKey: ["/api/veiculos"]}); } }}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Veículo">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente *</label>
            <select required value={formData.clienteId} onChange={e=>setFormData({...formData, clienteId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary">
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Placa *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none uppercase font-mono" value={formData.placa} onChange={e=>setFormData({...formData, placa: e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Marca *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none" value={formData.marca} onChange={e=>setFormData({...formData, marca: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-sm font-medium">Modelo *</label><input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none" value={formData.modelo} onChange={e=>setFormData({...formData, modelo: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Ano *</label><input required type="number" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none" value={formData.ano} onChange={e=>setFormData({...formData, ano: Number(e.target.value)})} /></div>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 mt-4">
            {createMutation.isPending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
