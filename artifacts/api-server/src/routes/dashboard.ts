import { Router } from "express";
import { db } from "@workspace/db";
import { ordensTable, ordensServicosTable, ordensPecasTable, clientesTable, veiculosTable, pecasTable } from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const todasOrdens = await db
    .select({
      id: ordensTable.id,
      numero: ordensTable.numero,
      clienteId: ordensTable.clienteId,
      clienteNome: clientesTable.nome,
      veiculoId: ordensTable.veiculoId,
      veiculoPlaca: veiculosTable.placa,
      veiculoModelo: veiculosTable.modelo,
      responsavel: ordensTable.responsavel,
      status: ordensTable.status,
      dataEntrada: ordensTable.dataEntrada,
      dataPrevisao: ordensTable.dataPrevisao,
      dataFinalizacao: ordensTable.dataFinalizacao,
      observacoes: ordensTable.observacoes,
      createdAt: ordensTable.createdAt,
    })
    .from(ordensTable)
    .leftJoin(clientesTable, eq(ordensTable.clienteId, clientesTable.id))
    .leftJoin(veiculosTable, eq(ordensTable.veiculoId, veiculosTable.id))
    .orderBy(ordensTable.createdAt);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ordensIds = todasOrdens.map((o) => o.id);
  const totalsByOrdem: Record<number, { totalServicos: number; totalPecas: number }> = {};

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

    for (const st of servicoTotals) {
      if (!totalsByOrdem[st.ordemId]) totalsByOrdem[st.ordemId] = { totalServicos: 0, totalPecas: 0 };
      totalsByOrdem[st.ordemId].totalServicos = parseFloat(st.total ?? "0");
    }
    for (const pt of pecaTotals) {
      if (!totalsByOrdem[pt.ordemId]) totalsByOrdem[pt.ordemId] = { totalServicos: 0, totalPecas: 0 };
      totalsByOrdem[pt.ordemId].totalPecas = parseFloat(pt.total ?? "0");
    }
  }

  const ordens = todasOrdens.map((o) => {
    const totals = totalsByOrdem[o.id] ?? { totalServicos: 0, totalPecas: 0 };
    const atrasado =
      o.status !== "finalizado" &&
      o.status !== "entregue" &&
      o.dataPrevisao != null &&
      new Date(o.dataPrevisao) < now;
    return {
      ...o,
      totalServicos: totals.totalServicos,
      totalPecas: totals.totalPecas,
      total: totals.totalServicos + totals.totalPecas,
      atrasado,
    };
  });

  const ordensEmAndamento = ordens.filter((o) => o.status === "em_andamento").length;
  const ordensAtrasadas = ordens.filter((o) => o.atrasado).length;
  const ordensHoje = ordens.filter((o) => {
    const d = new Date(o.dataEntrada);
    return d >= today && d < new Date(today.getTime() + 86400000);
  }).length;

  const ordensDia = ordens.filter(
    (o) =>
      (o.status === "finalizado" || o.status === "entregue") &&
      o.dataFinalizacao &&
      new Date(o.dataFinalizacao) >= today
  );
  const ordensMes = ordens.filter(
    (o) =>
      (o.status === "finalizado" || o.status === "entregue") &&
      o.dataFinalizacao &&
      new Date(o.dataFinalizacao) >= startOfMonth
  );

  const faturamentoDia = ordensDia.reduce((sum, o) => sum + o.total, 0);
  const faturamentoMes = ordensMes.reduce((sum, o) => sum + o.total, 0);

  const [{ count: pecasCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pecasTable)
    .where(sql`${pecasTable.quantidade} <= ${pecasTable.quantidadeMinima}`);

  res.json({
    ordensEmAndamento,
    ordensAtrasadas,
    ordensHoje,
    faturamentoDia,
    faturamentoMes,
    pecasEstoqueBaixo: Number(pecasCount),
    ordens: ordens.slice(-20).reverse(),
  });
});

export default router;
