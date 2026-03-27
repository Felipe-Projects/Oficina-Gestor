import React from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, Clock, CheckCircle2, AlertTriangle, TrendingUp, PackageX, Car, ClipboardList, Plus } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { motion } from "framer-motion";

function StatCard({ title, value, subtitle, icon: Icon, colorClass, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${colorClass}`} />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20 backdrop-blur-md`}>
          <Icon className="w-6 h-6 text-current" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dashboard) return <div>Erro ao carregar dashboard</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Acompanhe os principais indicadores da sua oficina hoje.</p>
        </div>
        <Link href="/ordens/nova">
          <span className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova OS
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Faturamento (Hoje)" 
          value={formatCurrency(dashboard.faturamentoDia)} 
          subtitle={`Mês: ${formatCurrency(dashboard.faturamentoMes)}`}
          icon={TrendingUp} 
          colorClass="bg-green-500 text-green-600 dark:text-green-400"
          delay={0}
        />
        <StatCard 
          title="OS em Andamento" 
          value={dashboard.ordensEmAndamento} 
          subtitle={`${dashboard.ordensHoje} ordens criadas hoje`}
          icon={Clock} 
          colorClass="bg-blue-500 text-blue-600 dark:text-blue-400"
          delay={0.1}
        />
        <StatCard 
          title="Atrasadas / Alertas" 
          value={dashboard.ordensAtrasadas} 
          subtitle={`${dashboard.pecasEstoqueBaixo} peças com estoque baixo`}
          icon={AlertTriangle} 
          colorClass="bg-red-500 text-red-600 dark:text-red-400"
          delay={0.2}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-foreground">Ordens Recentes</h2>
          <Link href="/ordens">
            <span className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer">
              Ver todas <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">OS</th>
                  <th className="px-6 py-4 font-medium">Cliente & Veículo</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {dashboard.ordens.slice(0, 5).map((os) => (
                  <tr key={os.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <Link href={`/ordens/${os.id}`}>
                        <span className="hover:text-primary hover:underline cursor-pointer">
                          #{os.numero}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{os.clienteNome}</div>
                      <div className="text-xs text-muted-foreground">{os.veiculoModelo} - {os.veiculoPlaca}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5",
                        os.status === 'orcamento' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        os.status === 'em_andamento' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        os.status === 'finalizado' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                        {os.status === 'orcamento' && <ClipboardList className="w-3 h-3" />}
                        {os.status === 'em_andamento' && <Clock className="w-3 h-3" />}
                        {os.status === 'finalizado' && <CheckCircle2 className="w-3 h-3" />}
                        {os.status === 'entregue' && <Car className="w-3 h-3" />}
                        {os.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {formatCurrency(os.total)}
                    </td>
                  </tr>
                ))}
                {dashboard.ordens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Nenhuma ordem recente encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
