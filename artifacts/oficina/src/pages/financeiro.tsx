import React from "react";
import { useGetResumoFinanceiro, useGetFluxoCaixa, useListDespesas } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Financeiro() {
  const { data: resumo } = useGetResumoFinanceiro();
  const { data: fluxo } = useGetFluxoCaixa();
  const { data: despesas } = useListDespesas();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Acompanhamento do fluxo de caixa e resultados.</p>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground font-medium">Receitas</h3>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(resumo.totalReceitas)}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground font-medium">Despesas</h3>
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600"><TrendingDown className="w-5 h-5" /></div>
            </div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(resumo.totalDespesas)}</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-muted-foreground font-medium">Lucro Líquido</h3>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><DollarSign className="w-5 h-5" /></div>
            </div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(resumo.lucro)}</p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-display font-semibold mb-6">Fluxo de Caixa (Últimos Dias)</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fluxo || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(v) => `R$ ${v/1000}k`} />
              <Tooltip 
                cursor={{fill: 'hsl(var(--muted))'}}
                contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
                formatter={(val: number) => formatCurrency(val)}
                labelFormatter={(l) => formatDate(l)}
              />
              <Legend iconType="circle" />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
