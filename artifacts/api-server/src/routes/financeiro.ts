import { Router } from "express";
import { db } from "@workspace/db";
import { despesasTable, ordensTable, ordensServicosTable, ordensPecasTable } from "@workspace/db/schema";
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
  return {
    ...d,
    valor: parseFloat(d.valor as unknown as string),
  };
}

router.get("/despesas", async (_req, res) => {
  const despesas = await db.select().from(despesasTable).orderBy(despesasTable.data);
  res.json(despesas.map(formatDespesa));
});

router.post("/despesas", async (req, res) => {
  const parsed = despesaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [despesa] = await db.insert(despesasTable).values(parsed.data).returning();
  res.status(201).json(formatDespesa(despesa));
});

router.delete("/despesas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(despesasTable).where(eq(despesasTable.id, id));
  res.status(204).end();
});

router.get("/resumo", async (_req, res) => {
  const ordens = await db
    .select({ id: ordensTable.id, status: ordensTable.status })
    .from(ordensTable)
    .where(sql`${ordensTable.status} IN ('finalizado', 'entregue')`);

  const ordensIds = ordens.map((o) => o.id);

  let totalReceitas = 0;

  if (ordensIds.length > 0) {
    const servicoTotals = await db
      .select({ total: sql<string>`sum(${ordensServicosTable.valor})` })
      .from(ordensServicosTable)
      .where(inArray(ordensServicosTable.ordemId, ordensIds));

    const pecaTotals = await db
      .select({ total: sql<string>`sum(${ordensPecasTable.valorUnitario} * ${ordensPecasTable.quantidade})` })
      .from(ordensPecasTable)
      .where(inArray(ordensPecasTable.ordemId, ordensIds));

    totalReceitas += parseFloat(servicoTotals[0]?.total ?? "0");
    totalReceitas += parseFloat(pecaTotals[0]?.total ?? "0");
  }

  const despesas = await db.select().from(despesasTable);
  const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor as unknown as string), 0);

  res.json({
    totalReceitas,
    totalDespesas,
    lucro: totalReceitas - totalDespesas,
    ordensFinalizadas: ordens.length,
    ticketMedio: ordens.length > 0 ? totalReceitas / ordens.length : 0,
  });
});

router.get("/fluxo-caixa", async (_req, res) => {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 29);

  const days: { data: string; receitas: number; despesas: number; saldo: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ data: dateStr, receitas: 0, despesas: 0, saldo: 0 });
  }

  const ordens = await db
    .select({ id: ordensTable.id, dataFinalizacao: ordensTable.dataFinalizacao, status: ordensTable.status })
    .from(ordensTable)
    .where(sql`${ordensTable.status} IN ('finalizado', 'entregue') AND ${ordensTable.dataFinalizacao} >= ${inicio.toISOString()}`);

  const ordensIds = ordens.map((o) => o.id);

  if (ordensIds.length > 0) {
    const servicoTotals = await db
      .select({ ordemId: ordensServicosTable.ordemId, total: sql<string>`sum(${ordensServicosTable.valor})` })
      .from(ordensServicosTable)
      .where(inArray(ordensServicosTable.ordemId, ordensIds))
      .groupBy(ordensServicosTable.ordemId);

    const pecaTotals = await db
      .select({
        ordemId: ordensPecasTable.ordemId,
        total: sql<string>`sum(${ordensPecasTable.valorUnitario} * ${ordensPecasTable.quantidade})`,
      })
      .from(ordensPecasTable)
      .where(inArray(ordensPecasTable.ordemId, ordensIds))
      .groupBy(ordensPecasTable.ordemId);

    const servicoMap: Record<number, number> = {};
    for (const s of servicoTotals) servicoMap[s.ordemId] = parseFloat(s.total ?? "0");
    const pecaMap: Record<number, number> = {};
    for (const p of pecaTotals) pecaMap[p.ordemId] = parseFloat(p.total ?? "0");

    for (const ordem of ordens) {
      if (!ordem.dataFinalizacao) continue;
      const dateStr = new Date(ordem.dataFinalizacao).toISOString().split("T")[0];
      const day = days.find((d) => d.data === dateStr);
      if (day) {
        day.receitas += (servicoMap[ordem.id] ?? 0) + (pecaMap[ordem.id] ?? 0);
      }
    }
  }

  const despesas = await db
    .select()
    .from(despesasTable)
    .where(sql`${despesasTable.data} >= ${inicio.toISOString().split("T")[0]}`);

  for (const despesa of despesas) {
    const day = days.find((d) => d.data === despesa.data);
    if (day) {
      day.despesas += parseFloat(despesa.valor as unknown as string);
    }
  }

  for (const day of days) {
    day.saldo = day.receitas - day.despesas;
  }

  res.json(days);
});

export default router;
