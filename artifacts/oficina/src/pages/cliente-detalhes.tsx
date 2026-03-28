import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetCliente, useListVeiculos, useListOrdens } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Car, ClipboardList, Phone, Mail, Plus, Trash2, Pencil, X, Check, CalendarClock, Gauge } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Modal } from "@/components/ui/Modal";

interface ManutencaoItem {
  id: number;
  veiculoId: number;
  nome: string;
  ultimaTroca: string | null;
  proximaTrocaData: string | null;
  proximaTrocaKm: number | null;
}

const emptyForm = { nome: "", ultimaTroca: "", proximaTrocaData: "", proximaTrocaKm: "" };

function ManutencaoVeiculo({ veiculoId, veiculoLabel }: { veiculoId: number; veiculoLabel: string }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<ManutencaoItem[]>({
    queryKey: ["/api/manutencao", veiculoId],
    queryFn: () => apiRequest("GET", `/api/manutencao?veiculoId=${veiculoId}`),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/manutencao", veiculoId] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/manutencao", data),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(emptyForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/manutencao/${id}`, data),
    onSuccess: () => { invalidate(); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/manutencao/${id}`),
    onSuccess: invalidate,
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      veiculoId,
      nome: form.nome,
      ultimaTroca: form.ultimaTroca || null,
      proximaTrocaData: form.proximaTrocaData || null,
      proximaTrocaKm: form.proximaTrocaKm ? parseInt(form.proximaTrocaKm) : null,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    updateMutation.mutate({
      id: editId,
      data: {
        nome: editForm.nome,
        ultimaTroca: editForm.ultimaTroca || null,
        proximaTrocaData: editForm.proximaTrocaData || null,
        proximaTrocaKm: editForm.proximaTrocaKm ? parseInt(editForm.proximaTrocaKm) : null,
      },
    });
  };

  const startEdit = (item: ManutencaoItem) => {
    setEditId(item.id);
    setEditForm({
      nome: item.nome,
      ultimaTroca: item.ultimaTroca ?? "",
      proximaTrocaData: item.proximaTrocaData ?? "",
      proximaTrocaKm: item.proximaTrocaKm != null ? String(item.proximaTrocaKm) : "",
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">{veiculoLabel}</span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); }}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-primary mb-2">Novo item de controle</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome do item *</label>
            <input
              required
              autoFocus
              type="text"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Correia dentada, Óleo do motor..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Última troca</label>
              <input
                type="text"
                value={form.ultimaTroca}
                onChange={e => setForm({ ...form, ultimaTroca: e.target.value })}
                placeholder="Ex: Jan/2024"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Próxima troca (data)</label>
              <input
                type="date"
                value={form.proximaTrocaData}
                onChange={e => setForm({ ...form, proximaTrocaData: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Próxima troca (km)</label>
              <input
                type="number"
                value={form.proximaTrocaKm}
                onChange={e => setForm({ ...form, proximaTrocaKm: e.target.value })}
                placeholder="Ex: 85000"
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {addMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="py-4 flex justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum item de manutenção cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id}>
              {editId === item.id ? (
                <form onSubmit={handleUpdate} className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nome do item</label>
                    <input
                      required
                      autoFocus
                      type="text"
                      value={editForm.nome}
                      onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Última troca</label>
                      <input
                        type="text"
                        value={editForm.ultimaTroca}
                        onChange={e => setEditForm({ ...editForm, ultimaTroca: e.target.value })}
                        placeholder="Ex: Jan/2024"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Próxima troca (data)</label>
                      <input
                        type="date"
                        value={editForm.proximaTrocaData}
                        onChange={e => setEditForm({ ...editForm, proximaTrocaData: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Próxima troca (km)</label>
                      <input
                        type="number"
                        value={editForm.proximaTrocaKm}
                        onChange={e => setEditForm({ ...editForm, proximaTrocaKm: e.target.value })}
                        placeholder="Ex: 85000"
                        min="0"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none text-sm focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
                      <Check className="w-4 h-4" />
                      {updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" onClick={() => setEditId(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="group flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{item.nome}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {item.ultimaTroca && (
                        <span className="text-xs text-muted-foreground">
                          Última troca: <span className="text-foreground font-medium">{item.ultimaTroca}</span>
                        </span>
                      )}
                      {item.proximaTrocaData && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          Próxima: <span className="text-primary font-medium">{formatDate(item.proximaTrocaData)}</span>
                        </span>
                      )}
                      {item.proximaTrocaKm != null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          <span className="text-primary font-medium">{item.proximaTrocaKm.toLocaleString("pt-BR")} km</span>
                        </span>
                      )}
                      {!item.ultimaTroca && !item.proximaTrocaData && item.proximaTrocaKm == null && (
                        <span className="text-xs text-muted-foreground italic">Sem datas definidas</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Excluir item?")) deleteMutation.mutate(item.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyVeiculoForm = { placa: "", modelo: "", marca: "", ano: new Date().getFullYear(), km: "", cor: "", observacoes: "" };

export default function ClienteDetalhes() {
  const [match, params] = useRoute("/clientes/:id");
  const id = Number(params?.id);
  const qc = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore generated hook type mismatch with query v5
  const { data: cliente, isLoading: loadingC } = useGetCliente(id, { query: { enabled: !!id } });
  // @ts-ignore generated hook type mismatch with query v5
  const { data: veiculos, isLoading: loadingV } = useListVeiculos({ clienteId: id }, { query: { enabled: !!id } });
  const { data: ordens, isLoading: loadingO } = useListOrdens();

  const [editVeiculoId, setEditVeiculoId] = useState<number | null>(null);
  const [veiculoForm, setVeiculoForm] = useState({ ...emptyVeiculoForm });

  const updateVeiculoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/veiculos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/veiculos"] });
      setEditVeiculoId(null);
    },
  });

  const openEditVeiculo = (v: any) => {
    setEditVeiculoId(v.id);
    setVeiculoForm({
      placa: v.placa,
      modelo: v.modelo,
      marca: v.marca,
      ano: v.ano,
      km: v.km != null ? String(v.km) : "",
      cor: v.cor ?? "",
      observacoes: v.observacoes ?? "",
    });
  };

  const handleSaveVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVeiculoId) return;
    await updateVeiculoMutation.mutateAsync({
      id: editVeiculoId,
      data: {
        clienteId: id,
        placa: veiculoForm.placa,
        modelo: veiculoForm.modelo,
        marca: veiculoForm.marca,
        ano: Number(veiculoForm.ano),
        km: veiculoForm.km ? Number(veiculoForm.km) : undefined,
        cor: veiculoForm.cor || undefined,
        observacoes: veiculoForm.observacoes || undefined,
      },
    });
  };

  const fv = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVeiculoForm(prev => ({ ...prev, [field]: e.target.value }));

  if (loadingC) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  if (!cliente) return <div className="p-12 text-center text-red-500">Cliente não encontrado.</div>;

  const historico = ordens?.filter(o => o.clienteId === id) || [];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/clientes">
          <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ArrowLeft className="w-6 h-6" /></button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{cliente.nome}</h1>
          <p className="text-muted-foreground mt-1">Detalhes, histórico e controle de manutenção.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Contato */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="font-semibold text-lg border-b border-border pb-3 mb-4">Contato</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg text-primary"><Phone className="w-4 h-4"/></div>
                <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium text-sm">{cliente.telefone}</p></div>
              </div>
              {cliente.email && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg text-primary"><Mail className="w-4 h-4"/></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-sm">{cliente.email}</p></div>
                </div>
              )}
              {cliente.observacoes && (
                <div className="mt-4 p-4 bg-muted/50 rounded-xl text-sm border border-border/50">
                  <span className="font-medium block mb-1">Observações:</span>
                  {cliente.observacoes}
                </div>
              )}
            </div>
          </div>

          {/* Veículos */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-semibold text-lg">Veículos</h3>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{veiculos?.length || 0}</span>
            </div>
            <div className="space-y-3">
              {veiculos?.map(v => (
                <div key={v.id} className="group flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 hover:border-border transition-colors">
                  <div className="text-primary shrink-0"><Car className="w-5 h-5"/></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">{v.marca} {v.modelo} <span className="text-muted-foreground font-normal">({v.ano})</span></p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{v.placa.toUpperCase()}{v.km ? ` • ${v.km.toLocaleString("pt-BR")} km` : ""}</p>
                  </div>
                  <button
                    onClick={() => openEditVeiculo(v)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                    title="Editar veículo"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {veiculos?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>}
            </div>
          </div>
        </div>

        {/* Histórico de Serviços */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary"/>
                Histórico de Serviços
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">OS</th>
                    <th className="px-6 py-4 font-medium">Veículo</th>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {historico.map(os => (
                    <tr key={os.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 font-bold">
                        <Link href={`/ordens/${os.id}`} className="text-primary hover:underline">#{os.numero}</Link>
                      </td>
                      <td className="px-6 py-4">{os.veiculoModelo}</td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(os.dataEntrada)}</td>
                      <td className="px-6 py-4 capitalize text-xs font-semibold">{os.status.replace('_',' ')}</td>
                      <td className="px-6 py-4 font-medium">{formatCurrency(os.total)}</td>
                    </tr>
                  ))}
                  {historico.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhuma ordem de serviço.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Controle de Manutenção */}
      {veiculos && veiculos.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Controle de Manutenção</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Registre itens como correia dentada, óleo do motor, filtros e defina as datas e quilometragens para a próxima troca.
            </p>
          </div>
          <div className="p-6 space-y-8">
            {veiculos.map((v, idx) => (
              <div key={v.id}>
                {idx > 0 && <div className="border-t border-border/50 mb-8" />}
                <ManutencaoVeiculo
                  veiculoId={v.id}
                  veiculoLabel={`${v.marca} ${v.modelo} ${v.ano} — ${v.placa.toUpperCase()}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal editar veículo */}
      <Modal
        isOpen={editVeiculoId !== null}
        onClose={() => setEditVeiculoId(null)}
        title="Editar Veículo"
      >
        <form onSubmit={handleSaveVeiculo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Placa *</label>
              <input
                required type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none uppercase font-mono focus:border-primary"
                value={veiculoForm.placa}
                onChange={e => setVeiculoForm(p => ({ ...p, placa: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Marca *</label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={veiculoForm.marca} onChange={fv("marca")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo *</label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={veiculoForm.modelo} onChange={fv("modelo")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano *</label>
              <input required type="number" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={veiculoForm.ano} onChange={fv("ano")} min="1900" max="2100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">KM atual</label>
              <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={veiculoForm.km} onChange={fv("km")} min="0" placeholder="Ex: 75000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" value={veiculoForm.cor} onChange={fv("cor")} placeholder="Ex: Prata" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary resize-none text-sm"
              value={veiculoForm.observacoes}
              onChange={fv("observacoes")}
              placeholder="Informações adicionais..."
            />
          </div>
          <button
            type="submit"
            disabled={updateVeiculoMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 mt-2 disabled:opacity-50"
          >
            {updateVeiculoMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
