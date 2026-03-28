import React, { useState } from "react";
import { useListServicos, useCreateServico, useUpdateServico, useDeleteServico } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Wrench, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ServicoForm {
  nome: string;
  descricao: string;
  valorPadrao: string;
  duracaoDias: string;
}

const emptyForm: ServicoForm = { nome: "", descricao: "", valorPadrao: "", duracaoDias: "" };

export default function Servicos() {
  const queryClient = useQueryClient();
  const { data: servicos, isLoading } = useListServicos();
  const createMutation = useCreateServico();
  const updateMutation = useUpdateServico();
  const deleteMutation = useDeleteServico();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServicoForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = (servicos ?? []).filter(
    (s) =>
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      (s.descricao ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(s: any) {
    setEditingId(s.id);
    setForm({ nome: s.nome, descricao: s.descricao ?? "", valorPadrao: String(s.valorPadrao), duracaoDias: s.duracaoDias ? String(s.duracaoDias) : "" });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || undefined,
      valorPadrao: parseFloat(form.valorPadrao),
      duracaoDias: form.duracaoDias ? parseInt(form.duracaoDias) : null,
    } as any;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      closeForm();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar serviço");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      setConfirmDelete(null);
    } catch {
      alert("Erro ao excluir serviço");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Catálogo de Serviços</h1>
          <p className="text-muted-foreground mt-1">Gerencie os serviços oferecidos pela oficina.</p>
        </div>
        <button
          data-testid="button-novo-servico"
          onClick={openNew}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          data-testid="input-search-servico"
          type="text"
          placeholder="Buscar serviço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-display font-semibold mb-5">
            {editingId ? "Editar Serviço" : "Novo Serviço"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Nome do Serviço <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="input-nome-servico"
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Troca de Óleo, Alinhamento..."
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Valor Padrão (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="input-valor-servico"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.valorPadrao}
                  onChange={(e) => setForm({ ...form, valorPadrao: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Duração (dias)
                </label>
                <input
                  data-testid="input-duracao-servico"
                  type="number"
                  min="1"
                  step="1"
                  value={form.duracaoDias}
                  onChange={(e) => setForm({ ...form, duracaoDias: e.target.value })}
                  placeholder="Ex: 1, 2, 3..."
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <textarea
                data-testid="input-descricao-servico"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o serviço detalhadamente..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-colors text-foreground flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                data-testid="button-salvar-servico"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingId ? "Salvar Alterações" : "Cadastrar Serviço"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Wrench className="w-10 h-10 opacity-30" />
            <p className="font-medium">
              {search ? "Nenhum serviço encontrado." : "Nenhum serviço cadastrado ainda."}
            </p>
            {!search && (
              <button onClick={openNew} className="text-primary hover:underline text-sm font-medium">
                Cadastrar primeiro serviço
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Serviço</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium text-center">Duração</th>
                  <th className="px-6 py-4 font-medium text-right">Valor Padrão</th>
                  <th className="px-6 py-4 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((s) => (
                  <tr key={s.id} data-testid={`row-servico-${s.id}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">{s.nome}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                      {s.descricao || <span className="italic opacity-50">Sem descrição</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(s as any).duracaoDias ? (
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                          {(s as any).duracaoDias} dia{(s as any).duracaoDias !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-foreground text-base">
                        {formatCurrency(s.valorPadrao)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {confirmDelete === s.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Confirmar?</span>
                            <button
                              data-testid={`button-confirm-delete-${s.id}`}
                              onClick={() => handleDelete(s.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                            >
                              Excluir
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-3 py-1 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              data-testid={`button-edit-servico-${s.id}`}
                              onClick={() => openEdit(s)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              data-testid={`button-delete-servico-${s.id}`}
                              onClick={() => setConfirmDelete(s.id)}
                              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "serviço" : "serviços"} encontrado{filtered.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </div>
  );
}
