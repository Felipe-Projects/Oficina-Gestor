import React, { useState } from "react";
import { useListVeiculos, useListClientes, useCreateVeiculo, useDeleteVeiculo } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Plus, Search, Trash2, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { apiRequest } from "@/lib/queryClient";

const emptyForm = {
  clienteId: "", placa: "", modelo: "", marca: "",
  ano: new Date().getFullYear(), km: "", cor: "", observacoes: ""
};

export default function VeiculosList() {
  const qc = useQueryClient();
  const { data: veiculos, isLoading } = useListVeiculos();
  const { data: clientes } = useListClientes();
  const createMutation = useCreateVeiculo();
  const deleteMutation = useDeleteVeiculo();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/veiculos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/veiculos"] }),
  });

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const filtered = veiculos?.filter(v =>
    v.placa.toLowerCase().includes(search.toLowerCase()) ||
    v.modelo.toLowerCase().includes(search.toLowerCase()) ||
    v.clienteNome?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.id);
    setFormData({
      clienteId: String(v.clienteId),
      placa: v.placa,
      modelo: v.modelo,
      marca: v.marca,
      ano: v.ano,
      km: v.km != null ? String(v.km) : "",
      cor: v.cor ?? "",
      observacoes: v.observacoes ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clienteId: Number(formData.clienteId),
      placa: formData.placa,
      modelo: formData.modelo,
      marca: formData.marca,
      ano: Number(formData.ano),
      km: formData.km ? Number(formData.km) : undefined,
      cor: formData.cor || undefined,
      observacoes: formData.observacoes || undefined,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: payload });
    } else {
      await createMutation.mutateAsync({ data: payload });
      qc.invalidateQueries({ queryKey: ["/api/veiculos"] });
    }
    setIsModalOpen(false);
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os veículos cadastrados na oficina.</p>
        </div>
        <button
          onClick={openCreate}
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
              type="text" value={search} onChange={e => setSearch(e.target.value)}
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
                <th className="px-6 py-4 font-medium">Ano / KM</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-muted/20 group">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <p>{v.marca} {v.modelo}</p>
                        {v.cor && <p className="text-xs text-muted-foreground">{v.cor}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold tracking-wider">{v.placa.toUpperCase()}</td>
                  <td className="px-6 py-4">{v.clienteNome}</td>
                  <td className="px-6 py-4 text-muted-foreground">{v.ano} • {v.km ? `${v.km.toLocaleString("pt-BR")} km` : '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(v)}
                        data-testid={`button-edit-veiculo-${v.id}`}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("Excluir este veículo?")) {
                            await deleteMutation.mutateAsync({ id: v.id });
                            qc.invalidateQueries({ queryKey: ["/api/veiculos"] });
                          }
                        }}
                        data-testid={`button-delete-veiculo-${v.id}`}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Car className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>Nenhum veículo encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Veículo" : "Cadastrar Veículo"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente *</label>
            <select
              required value={formData.clienteId} onChange={f("clienteId")}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary"
            >
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Placa *</label>
              <input
                required type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none uppercase font-mono focus:border-primary"
                value={formData.placa} onChange={e => setFormData(p => ({ ...p, placa: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Marca *</label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={formData.marca} onChange={f("marca")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo *</label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={formData.modelo} onChange={f("modelo")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano *</label>
              <input required type="number" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={formData.ano} onChange={f("ano")} min="1900" max="2100" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">KM atual</label>
              <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={formData.km} onChange={f("km")} min="0" placeholder="Ex: 75000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={formData.cor} onChange={f("cor")} placeholder="Ex: Prata" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary resize-none text-sm"
              value={formData.observacoes}
              onChange={f("observacoes")}
              placeholder="Informações adicionais..."
            />
          </div>

          <button
            type="submit" disabled={isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 mt-2 disabled:opacity-50"
          >
            {isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Veículo"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
