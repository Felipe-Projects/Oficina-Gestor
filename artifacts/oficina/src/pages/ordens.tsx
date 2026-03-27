import React, { useState } from "react";
import { useListOrdens } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Filter, Clock, CheckCircle2, ClipboardList, Car } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function OrdensList() {
  const [filter, setFilter] = useState<string>("todos");
  const { data: ordens, isLoading } = useListOrdens();

  const filteredOrdens = ordens?.filter(o => filter === "todos" || o.status === filter) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground mt-1">Gerencie os orçamentos e serviços da oficina.</p>
        </div>
        <Link href="/ordens/nova">
          <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar OS
          </button>
        </Link>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar cliente, placa ou OS..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
          </div>
          
          <div className="flex overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 gap-2 custom-scrollbar">
            {["todos", "orcamento", "em_andamento", "finalizado", "entregue"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  filter === status 
                    ? "bg-foreground text-background shadow-md" 
                    : "bg-background border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Nº OS</th>
                  <th className="px-6 py-4 font-medium">Cliente & Veículo</th>
                  <th className="px-6 py-4 font-medium">Datas</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredOrdens.map((os, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={os.id} 
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-6 py-5 font-bold text-foreground">
                      #{os.numero}
                      {os.atrasado && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" title="Atrasado" />}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-semibold text-foreground">{os.clienteNome}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{os.veiculoModelo} ({os.veiculoPlaca})</div>
                    </td>
                    <td className="px-6 py-5 text-muted-foreground text-xs">
                      <div><span className="font-medium text-foreground">Entrada:</span> {formatDate(os.dataEntrada)}</div>
                      {os.dataPrevisao && <div><span className="font-medium text-foreground">Prev:</span> {formatDate(os.dataPrevisao)}</div>}
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5",
                        os.status === 'orcamento' ? "bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800" :
                        os.status === 'em_andamento' ? "bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800" :
                        os.status === 'finalizado' ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" :
                        "bg-slate-100/50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      )}>
                        {os.status === 'orcamento' && <ClipboardList className="w-3.5 h-3.5" />}
                        {os.status === 'em_andamento' && <Clock className="w-3.5 h-3.5" />}
                        {os.status === 'finalizado' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {os.status === 'entregue' && <Car className="w-3.5 h-3.5" />}
                        {os.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-bold text-foreground">
                      {formatCurrency(os.total)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link href={`/ordens/${os.id}`}>
                        <button className="text-primary hover:text-primary/80 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                          Detalhes
                        </button>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
                {filteredOrdens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-lg">Nenhuma ordem encontrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
