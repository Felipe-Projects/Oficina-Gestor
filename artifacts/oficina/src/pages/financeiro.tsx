import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetResumoFinanceiro, useGetFluxoCaixa, useListDespesas } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Package, Plus, Trash2, BarChart2, Star, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Cell,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";

// ── Types ──────────────────────────────────────────────────────────────────
interface MesData {
  mes: string; label: string;
  receitas: number; custoPecas: number; despesas: number; lucro: number; ordens: number;
}
interface ServicoRank {
  servicoId: number; nome: string; quantidade: number; totalReceita: number;
}

// ── Hooks for new endpoints ────────────────────────────────────────────────
function useFinanceiroPorMes() {
  return useQuery<MesData[]>({
    queryKey: ["/api/financeiro/por-mes"],
    queryFn: () => apiRequest("GET", "/api/financeiro/por-mes"),
  });
}
function useServicosRanking() {
  return useQuery<ServicoRank[]>({
    queryKey: ["/api/financeiro/servicos-ranking"],
    queryFn: () => apiRequest("GET", "/api/financeiro/servicos-ranking"),
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
const GREEN  = "hsl(142, 71%, 45%)";
const RED    = "hsl(0, 84%, 60%)";
const BLUE   = "hsl(217, 91%, 60%)";
const ORANGE = "hsl(38, 92%, 50%)";

function StatCard({
  title, value, subtitle, icon: Icon, iconBg, iconColor, highlight = false,
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; iconBg: string; iconColor: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-card p-6 rounded-2xl border shadow-sm flex flex-col gap-3 ${highlight ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

const TooltipStyle = {
  contentStyle: { backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "10px" },
  cursor: { fill: "hsl(var(--muted))" },
};

// ── Despesas Form ──────────────────────────────────────────────────────────
function DespesasPanel() {
  const qc = useQueryClient();
  const { data: despesas } = useListDespesas();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "Outros", data: new Date().toISOString().split("T")[0] });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/financeiro/despesas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/financeiro/despesas"] }); qc.invalidateQueries({ queryKey: ["/api/financeiro/resumo"] }); qc.invalidateQueries({ queryKey: ["/api/financeiro/por-mes"] }); setShow(false); setForm({ descricao: "", valor: "", categoria: "Outros", data: new Date().toISOString().split("T")[0] }); },
  });
  const delMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/financeiro/despesas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/financeiro/despesas"] }); qc.invalidateQueries({ queryKey: ["/api/financeiro/resumo"] }); qc.invalidateQueries({ queryKey: ["/api/financeiro/por-mes"] }); },
  });

  const categorias = ["Aluguel", "Salários", "Estoque", "Utilidades", "Equipamentos", "Marketing", "Impostos", "Outros"];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-border/50">
        <h2 className="text-lg font-display font-semibold text-foreground">Despesas Operacionais</h2>
        <button
          onClick={() => setShow(!show)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Despesa
        </button>
      </div>

      {show && (
        <div className="p-6 border-b border-border/50 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              className="px-4 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary col-span-full sm:col-span-1 lg:col-span-1"
              placeholder="Descrição *"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <select
              className="px-4 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              type="number" min="0" step="0.01"
              className="px-4 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Valor (R$) *"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
            <input
              type="date"
              className="px-4 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShow(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button
              disabled={addMutation.isPending || !form.descricao || !form.valor}
              onClick={() => addMutation.mutate(form)}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {addMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/40">
        {(despesas ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">Nenhuma despesa registrada.</p>
        ) : (
          [...(despesas ?? [])].reverse().map((d) => (
            <div key={d.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{d.descricao}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{d.categoria} · {formatDate(d.data)}</p>
              </div>
              <div className="flex items-center gap-4 ml-4 shrink-0">
                <span className="font-bold text-red-500">{formatCurrency(d.valor)}</span>
                <button
                  onClick={() => delMutation.mutate(d.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Financeiro() {
  const { data: resumoRaw } = useGetResumoFinanceiro();
  const resumo = resumoRaw as typeof resumoRaw & { custoPecas: number };
  const { data: fluxo } = useGetFluxoCaixa();
  const { data: porMes } = useFinanceiroPorMes();
  const { data: ranking } = useServicosRanking();

  const [mesesVisiveis, setMesesVisiveis] = useState(6);

  const mesesChart = (porMes ?? []).slice(-mesesVisiveis);
  const maxRanking = ranking?.[0]?.quantidade ?? 1;

  // Month-over-month change
  const mesAtual = porMes?.[porMes.length - 1];
  const mesAnterior = porMes?.[porMes.length - 2];
  const variacaoReceita = mesAtual && mesAnterior && mesAnterior.receitas > 0
    ? ((mesAtual.receitas - mesAnterior.receitas) / mesAnterior.receitas * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Resultados, comparativos e análise de serviços.</p>
      </div>

      {/* KPI Cards */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Receita Total"
            value={formatCurrency(resumo.totalReceitas)}
            subtitle={variacaoReceita ? `${Number(variacaoReceita) >= 0 ? "+" : ""}${variacaoReceita}% vs. mês anterior` : `${resumo.ordensFinalizadas} OS finalizadas`}
            icon={TrendingUp}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600"
          />
          <StatCard
            title="Custo das Peças"
            value={formatCurrency(resumo.custoPecas)}
            subtitle="Preço de custo dos materiais usados"
            icon={Package}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-500"
          />
          <StatCard
            title="Despesas Operacionais"
            value={formatCurrency(resumo.totalDespesas)}
            subtitle="Aluguel, salários, utilidades..."
            icon={TrendingDown}
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-500"
          />
          <StatCard
            title="Lucro Líquido"
            value={formatCurrency(resumo.lucro)}
            subtitle={`Ticket médio: ${formatCurrency(resumo.ticketMedio)}`}
            icon={DollarSign}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            highlight
          />
        </div>
      )}

      {/* Lucro breakdown explanation */}
      {resumo && (
        <div className="flex items-start gap-3 px-5 py-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Cálculo do Lucro Líquido:</span>{" "}
            Receita ({formatCurrency(resumo.totalReceitas)}) − Custo das peças ({formatCurrency(resumo.custoPecas)}) − Despesas operacionais ({formatCurrency(resumo.totalDespesas)}) = <strong>{formatCurrency(resumo.lucro)}</strong>
          </p>
        </div>
      )}

      {/* Monthly Comparison */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 border-b border-border/50">
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Comparativo Mensal</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Receitas, despesas e lucro líquido por mês</p>
          </div>
          <div className="flex gap-2">
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                onClick={() => setMesesVisiveis(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mesesVisiveis === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {n}M
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mesesChart} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                {...TooltipStyle}
                formatter={(val: number, name: string) => [formatCurrency(val), name]}
                labelFormatter={(l) => `Mês: ${l}`}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receitas" name="Receitas" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Bar dataKey="despesas" name="Despesas Op." fill={RED} radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Bar dataKey="custoPecas" name="Custo Peças" fill={ORANGE} radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Bar dataKey="lucro" name="Lucro Líquido" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly table */}
      {porMes && porMes.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-display font-semibold text-foreground">Detalhamento por Mês</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Mês</th>
                  <th className="px-6 py-3 text-right font-medium">OS</th>
                  <th className="px-6 py-3 text-right font-medium">Receita</th>
                  <th className="px-6 py-3 text-right font-medium">Custo Peças</th>
                  <th className="px-6 py-3 text-right font-medium">Despesas Op.</th>
                  <th className="px-6 py-3 text-right font-medium">Lucro Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {[...(porMes ?? [])].reverse().slice(0, 8).map((m) => (
                  <tr key={m.mes} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground capitalize">{m.label}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{m.ordens}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-medium">{formatCurrency(m.receitas)}</td>
                    <td className="px-6 py-3 text-right text-orange-500 font-medium">{formatCurrency(m.custoPecas)}</td>
                    <td className="px-6 py-3 text-right text-red-500 font-medium">{formatCurrency(m.despesas)}</td>
                    <td className={`px-6 py-3 text-right font-bold ${m.lucro >= 0 ? "text-primary" : "text-red-500"}`}>
                      {formatCurrency(m.lucro)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Services Ranking + Cash Flow (side by side on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Ranking */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50 flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Ranking de Serviços</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Serviços mais realizados em OS finalizadas</p>
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {(ranking ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Nenhum serviço em OS finalizada ainda.</p>
            ) : (
              (ranking ?? []).map((s, idx) => {
                const pct = Math.round((s.quantidade / maxRanking) * 100);
                return (
                  <div key={s.servicoId} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40" : idx === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800" : idx === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30" : "bg-muted text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                        {idx === 0 && <Star className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                        <span className="font-medium text-foreground text-sm truncate">{s.nome}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-foreground text-sm">{s.quantidade}×</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatCurrency(s.totalReceita)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: idx === 0 ? "hsl(38, 92%, 50%)" : "hsl(var(--primary))" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {(ranking ?? []).length > 1 && (
            <div className="px-6 py-4 border-t border-border/40 bg-muted/30 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                Serviço menos realizado: <span className="font-medium text-foreground">{ranking![ranking!.length - 1].nome}</span> ({ranking![ranking!.length - 1].quantidade}×)
              </p>
            </div>
          )}
        </div>

        {/* Cash Flow */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-display font-semibold text-foreground">Fluxo de Caixa</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 dias</p>
          </div>
          <div className="p-4 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fluxo ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="data" axisLine={false} tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  interval={4}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip
                  {...TooltipStyle}
                  formatter={(val: number) => formatCurrency(val)}
                  labelFormatter={(l) => formatDate(l)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receitas" name="Receitas" stroke={GREEN} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="despesas" name="Despesas" stroke={RED} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Despesas */}
      <DespesasPanel />
    </div>
  );
}
