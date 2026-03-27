import React from "react";
import { useRoute, Link } from "wouter";
import { useGetCliente, useListVeiculos, useListOrdens } from "@workspace/api-client-react";
import { ArrowLeft, Car, ClipboardList, Phone, Mail } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function ClienteDetalhes() {
  const [match, params] = useRoute("/clientes/:id");
  const id = Number(params?.id);

  const { data: cliente, isLoading: loadingC } = useGetCliente(id, { query: { enabled: !!id } });
  const { data: veiculos, isLoading: loadingV } = useListVeiculos({ clienteId: id }, { query: { enabled: !!id } });
  const { data: ordens, isLoading: loadingO } = useListOrdens();

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
          <p className="text-muted-foreground mt-1">Detalhes e histórico do cliente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="font-semibold text-lg border-b border-border pb-3 mb-4">Contato</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-muted rounded-lg text-primary"><Phone className="w-4 h-4"/></div><div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium text-sm">{cliente.telefone}</p></div></div>
              {cliente.email && <div className="flex items-center gap-3"><div className="p-2 bg-muted rounded-lg text-primary"><Mail className="w-4 h-4"/></div><div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-sm">{cliente.email}</p></div></div>}
              {cliente.observacoes && (
                <div className="mt-4 p-4 bg-muted/50 rounded-xl text-sm border border-border/50">
                  <span className="font-medium block mb-1">Observações:</span>
                  {cliente.observacoes}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-semibold text-lg">Veículos</h3>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{veiculos?.length || 0}</span>
            </div>
            <div className="space-y-3">
              {veiculos?.map(v => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                  <div className="text-primary"><Car className="w-5 h-5"/></div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{v.modelo} <span className="text-muted-foreground font-normal">({v.ano})</span></p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{v.placa.toUpperCase()}</p>
                  </div>
                </div>
              ))}
              {veiculos?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary"/> Histórico de Serviços</h3>
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
                      <td className="px-6 py-4 font-bold"><Link href={`/ordens/${os.id}`}><a className="text-primary hover:underline">#{os.numero}</a></Link></td>
                      <td className="px-6 py-4">{os.veiculoModelo}</td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(os.dataEntrada)}</td>
                      <td className="px-6 py-4 capitalize text-xs font-semibold">{os.status.replace('_',' ')}</td>
                      <td className="px-6 py-4 font-medium">{formatCurrency(os.total)}</td>
                    </tr>
                  ))}
                  {historico.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Nenhuma ordem de serviço.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
