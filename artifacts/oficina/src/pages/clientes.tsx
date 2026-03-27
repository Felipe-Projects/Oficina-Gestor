import React, { useState } from "react";
import { useListClientes, useCreateCliente, useDeleteCliente } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, User, Phone, Trash2, Edit } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useQueryClient } from "@tanstack/react-query";

export default function ClientesList() {
  const { data: clientes, isLoading } = useListClientes();
  const queryClient = useQueryClient();
  const createMutation = useCreateCliente();
  const deleteMutation = useDeleteCliente();
  
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", telefone: "", whatsapp: "", email: "", observacoes: "" });

  const filtered = clientes?.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    c.telefone.includes(search)
  ) || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ data: formData });
    queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
    setIsModalOpen(false);
    setFormData({ nome: "", telefone: "", whatsapp: "", email: "", observacoes: "" });
  };

  const handleDelete = async (id: number) => {
    if(confirm("Deseja excluir este cliente?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie a base de clientes da oficina.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden p-6">
        <div className="relative max-w-md mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
          />
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="group border border-border/60 hover:border-primary/50 bg-background rounded-2xl p-5 transition-all hover:shadow-md relative">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/clientes/${c.id}`}>
                      <h3 className="font-semibold text-lg text-foreground truncate cursor-pointer hover:text-primary transition-colors">
                        {c.nome}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{c.telefone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome Completo *</label>
            <input 
              required type="text" value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone *</label>
              <input 
                required type="text" value={formData.telefone} onChange={e=>setFormData({...formData, telefone: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp</label>
              <input 
                type="text" value={formData.whatsapp} onChange={e=>setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input 
              type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea 
              rows={3} value={formData.observacoes} onChange={e=>setFormData({...formData, observacoes: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary resize-none" 
            />
          </div>
          <button 
            type="submit" 
            disabled={createMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 mt-4 disabled:opacity-50"
          >
            {createMutation.isPending ? "Salvando..." : "Cadastrar Cliente"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
