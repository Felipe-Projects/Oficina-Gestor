import { Router } from "express";
import { db } from "@workspace/db";
import { despesasTable, ordensTable, ordensServicosTable, ordensPecasTable, pecasTable, servicosTable } from "@workspace/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { z } from "zod";

const despesaSchema = z.object({
  descricao: z.string().min(1),
  valor: z.union([z.string(), z.number()]).transform((v) => String(v)),
  categoria: z.string().min(1),
  data: z.string(),
});

const router = Router();

function formatDespesa(d: typeof despesasTable.$inferSelect) {
  return { ...d, valor: parseFloat(d.valor as unknown as string) };
}

// ── DESPESAS CRUD ─────────────────────────────────────────────────────────
router.get("/despesas", async (_req, res) => {
  const despesas = await db.select().from(despesasTable).orderBy(despesasTable.data);
  res.json(despesas.map(formatDespesa));
});

router.post("/despesas", async (req, res) => {
  const parsed = despesaSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [despesa] = await db.insert(despesasTable).values(parsed.data).returning();
  res.status(201).json(formatDespesa(despesa));
});

router.delete("/despesas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(despesasTable).where(eq(despesasTable.id, id));
  res.status(204).end();
});

// ── HELPER: get revenues and costs for a set of order IDs ─────────────────
async function calcOrderTotals(ordensIds: number[]) {
  if (ordensIds.length === 0) return { receitas: 0, custoPecas: 0 };

  const [servicoRow] = await db
    .select({ total: sql<string>`coalesce(sum(${ordensServicosTable.valor}), 0)` })
    .from(ordensServicosTable)
    .where(inArray(ordensServicosTable.ordemId, ordensIds));

  const [pecaVendaRow] = await db
    .select({ total: sql<string>`coalesce(sum(${ordensPecasTable.valorUnitario} * ${ordensPecasTable.quantidade}), 0)` })
    .from(ordensPecasTable)
    .where(inArray(ordensPecasTable.ordemId, ordensIds));

  // Cost of parts = join with pecas table to get valorCusto
  const [pecaCustoRow] = await db
    .select({ total: sql<string>`coalesce(sum(${pecasTable.valorCusto} * ${ordensPecasTable.quantidade}), 0)` })
    .from(ordensPecasTable)
    .leftJoin(pecasTable, eq(ordensPecasTable.pecaId, pecasTable.id))
    .where(inArray(ordensPecasTable.ordemId, ordensIds));

  const receitas = parseFloat(servicoRow?.total ?? "0") + parseFloat(pecaVendaRow?.total ?? "0");
  const custoPecas = parseFloat(pecaCustoRow?.total ?? "0");
  return { receitas, custoPecas };
}

// ── RESUMO ────────────────────────────────────────────────────────────────
router.get("/resumo", async (_req, res) => {
  const ordens = await db
    .select({ id: ordensTable.id })
    .from(ordensTable)
    .where(sql`${ordensTable.status} IN ('finalizado', 'entregue')`);

  const ordensIds = ordens.map((o) => o.id);
  const { receitas: totalReceitas, custoPecas } = await calcOrderTotals(ordensIds);

  const despesas = await db.select().from(despesasTable);
  const totalDespesas = despesas.reduce((s, d) => s + parseFloat(d.valor as unknown as string), 0);

  const lucro = totalReceitas - custoPecas - totalDespesas;

  res.json({
    totalReceitas,
    custoPecas,
    totalDespesas,
    lucro,
    ordensFinalizadas: ordens.length,
    ticketMedio: ordens.length > 0 ? totalReceitas / ordens.length : 0,
  });
});

// ── FLUXO DE CAIXA (últimos 30 dias) ─────────────────────────────────────
router.get("/fluxo-caixa", async (_req, res) => {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 29);

  const days: { data: string; receitas: number; despesas: number; saldo: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    days.push({ data: d.toISOString().split("T")[0], receitas: 0, despesas: 0, saldo: 0 });
  }

  const ordens = await db
    .select({ id: ordensTable.id, dataFinalizacao: ordensTable.dataFinalizacao })
    .from(ordensTable)
    .where(sql`${ordensTable.status} IN ('finalizado', 'entregue') AND ${ordensTable.dataFinalizacao} >= ${inicio.toISOString()}`);

  if (ordens.length > 0) {
    const ids = ordens.map((o) => o.id);
    const svc = await db
      .select({ ordemId: ordensServicosTable.ordemId, total: sql<string>`sum(${ordensServicosTable.valor})` })
      .from(ordensServicosTable).where(inArray(ordensServicosTable.ordemId, ids)).groupBy(ordensServicosTable.ordemId);
    const pec = await db
      .select({ ordemId: ordensPecasTable.ordemId, total: sql<string>`sum(${ordensPecasTable.valorUnitario} * ${ordensPecasTable.quantidade})` })
      .from(ordensPecasTable).where(inArray(ordensPecasTable.ordemId, ids)).groupBy(ordensPecasTable.ordemId);
    const svcMap: Record<number, number> = {};
    for (const s of svc) svcMap[s.ordemId] = parseFloat(s.total ?? "0");
    const pecMap: Record<number, number> = {};
    for (const p of pec) pecMap[p.ordemId] = parseFloat(p.total ?? "0");

    for (const ordem of ordens) {
      if (!ordem.dataFinalizacao) continue;
      const ds = new Date(ordem.dataFinalizacao).toISOString().split("T")[0];
      const day = days.find((d) => d.data === ds);
      if (day) day.receitas += (svcMap[ordem.id] ?? 0) + (pecMap[ordem.id] ?? 0);
    }
  }

  const despesas = await db.select().from(despesasTable)
    .where(sql`${despesasTable.data} >= ${inicio.toISOString().split("T")[0]}`);
  for (const d of despesas) {
    const day = days.find((x) => x.data === d.data);
    if (day) day.despesas += parseFloat(d.valor as unknown as string);
  }
  for (const day of days) day.saldo = day.receitas - day.despesas;

  res.json(days);
});

// ── POR MÊS (últimos 12 meses) ────────────────────────────────────────────
router.get("/por-mes", async (_req, res) => {
  const hoje = new Date();
  const meses: {
    mes: string; label: string;
    receitas: number; custoPecas: number; despesas: number; lucro: number; ordens: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mes = inicio.toISOString().slice(0, 7);
    const label = inicio.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    meses.push({ mes, label, receitas: 0, custoPecas: 0, despesas: 0, lucro: 0, ordens: 0 });

    const ordens = await db
      .select({ id: ordensTable.id })
      .from(ordensTable)
      .where(sql`${ordensTable.status} IN ('finalizado', 'entregue')
        AND ${ordensTable.dataFinalizacao} >= ${inicio.toISOString()}
        AND ${ordensTable.dataFinalizacao} < ${fim.toISOString()}`);

    const ids = ordens.map((o) => o.id);
    const { receitas, custoPecas } = await calcOrderTotals(ids);

    const despesasRows = await db.select().from(despesasTable)
      .where(sql`${despesasTable.data} >= ${inicio.toISOString().split("T")[0]}
             AND ${despesasTable.data} < ${fim.toISOString().split("T")[0]}`);
    const totalDespesas = despesasRows.reduce((s, d) => s + parseFloat(d.valor as unknown as string), 0);

    const entry = meses[meses.length - 1];
    entry.receitas = receitas;
    entry.custoPecas = custoPecas;
    entry.despesas = totalDespesas;
    entry.lucro = receitas - custoPecas - totalDespesas;
    entry.ordens = ordens.length;
  }

  res.json(meses);
});

// ── RANKING DE SERVIÇOS ───────────────────────────────────────────────────
router.get("/servicos-ranking", async (_req, res) => {
  const rows = await db
    .select({
      servicoId: ordensServicosTable.servicoId,
      nome: servicosTable.nome,
      quantidade: sql<string>`count(*)`,
      totalReceita: sql<string>`sum(${ordensServicosTable.valor})`,
    })
    .from(ordensServicosTable)
    .leftJoin(servicosTable, eq(ordensServicosTable.servicoId, servicosTable.id))
    .leftJoin(ordensTable, eq(ordensServicosTable.ordemId, ordensTable.id))
    .where(sql`${ordensTable.status} IN ('finalizado', 'entregue')`)
    .groupBy(ordensServicosTable.servicoId, servicosTable.nome)
    .orderBy(sql`count(*) DESC`);

  res.json(rows.map((r) => ({
    servicoId: r.servicoId,
    nome: r.nome ?? `Serviço #${r.servicoId}`,
    quantidade: parseInt(r.quantidade as unknown as string),
    totalReceita: parseFloat(r.totalReceita ?? "0"),
  })));
});

export default router;
