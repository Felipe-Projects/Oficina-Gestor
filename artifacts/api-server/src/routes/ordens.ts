import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordensTable,
  ordensServicosTable,
  ordensPecasTable,
  clientesTable,
  veiculosTable,
  servicosTable,
  pecasTable,
} from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const addServicoSchema = z.object({
  servicoId: z.number().int(),
  valor: z.number(),
});

const addPecaSchema = z.object({
  pecaId: z.number().int(),
  quantidade: z.number().int().positive(),
  valorUnitario: z.number(),
});

const createOrdemSchema = z.object({
  clienteId: z.number().int(),
  veiculoId: z.number().int(),
  responsavel: z.string().min(1),
  status: z.enum(["orcamento", "em_andamento", "finalizado", "entregue"]).optional().default("orcamento"),
  dataEntrada: z.string(),
  dataPrevisao: z.string().optional(),
  observacoes: z.string().optional(),
  checklistEntrada: z.record(z.any()).optional(),
  servicos: z.array(addServicoSchema).optional().default([]),
  pecas: z.array(addPecaSchema).optional().default([]),
});

const updateOrdemSchema = z.object({
  clienteId: z.number().int().optional(),
  veiculoId: z.number().int().optional(),
  responsavel: z.string().min(1).optional(),
  status: z.enum(["orcamento", "em_andamento", "finalizado", "entregue"]).optional(),
  dataEntrada: z.string().optional(),
  dataPrevisao: z.string().optional().nullable(),
  dataFinalizacao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  checklistEntrada: z.record(z.any()).optional().nullable(),
  checklistEntrega: z.record(z.any()).optional().nullable(),
  servicos: z.array(addServicoSchema).optional(),
  pecas: z.array(addPecaSchema).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["orcamento", "em_andamento", "finalizado", "entregue"]),
  checklistEntrega: z.record(z.any()).optional(),
});

async function generateNumero() {
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(ordensTable);
  const num = (Number(result?.count) ?? 0) + 1;
  return `OS-${String(num).padStart(5, "0")}`;
}

function parseNum(v: unknown) {
  return parseFloat(v as string);
}

async function buildOrdemDetalhada(ordemId: number) {
  const [ordem] = await db
    .select({
      id: ordensTable.id,
      numero: ordensTable.numero,
      clienteId: ordensTable.clienteId,
      clienteNome: clientesTable.nome,
      veiculoId: ordensTable.veiculoId,
      veiculoPlaca: veiculosTable.placa,
      veiculoModelo: veiculosTable.modelo,
      veiculoMarca: veiculosTable.marca,
      veiculoAno: veiculosTable.ano,
      veiculoKm: veiculosTable.km,
      responsavel: ordensTable.responsavel,
      status: ordensTable.status,
      dataEntrada: ordensTable.dataEntrada,
      dataPrevisao: ordensTable.dataPrevisao,
      dataFinalizacao: ordensTable.dataFinalizacao,
      observacoes: ordensTable.observacoes,
      checklistEntrada: ordensTable.checklistEntrada,
      checklistEntrega: ordensTable.checklistEntrega,
      createdAt: ordensTable.createdAt,
    })
    .from(ordensTable)
    .leftJoin(clientesTable, eq(ordensTable.clienteId, clientesTable.id))
    .leftJoin(veiculosTable, eq(ordensTable.veiculoId, veiculosTable.id))
    .where(eq(ordensTable.id, ordemId));

  if (!ordem) return null;

  const servicos = await db
    .select({
      id: ordensServicosTable.id,
      servicoId: ordensServicosTable.servicoId,
      nome: servicosTable.nome,
      valor: ordensServicosTable.valor,
    })
    .from(ordensServicosTable)
    .leftJoin(servicosTable, eq(ordensServicosTable.servicoId, servicosTable.id))
    .where(eq(ordensServicosTable.ordemId, ordemId));

  const pecas = await db
    .select({
      id: ordensPecasTable.id,
      pecaId: ordensPecasTable.pecaId,
      nome: pecasTable.nome,
      codigo: pecasTable.codigo,
      quantidade: ordensPecasTable.quantidade,
      valorUnitario: ordensPecasTable.valorUnitario,
    })
    .from(ordensPecasTable)
    .leftJoin(pecasTable, eq(ordensPecasTable.pecaId, pecasTable.id))
    .where(eq(ordensPecasTable.ordemId, ordemId));

  const totalServicos = servicos.reduce((sum, s) => sum + parseNum(s.valor), 0);
  const totalPecas = pecas.reduce((sum, p) => sum + parseNum(p.valorUnitario) * p.quantidade, 0);
  const now = new Date();
  const atrasado =
    ordem.status !== "finalizado" &&
    ordem.status !== "entregue" &&
    ordem.dataPrevisao != null &&
    new Date(ordem.dataPrevisao) < now;

  return {
    ...ordem,
    servicos: servicos.map((s) => ({ ...s, valor: parseNum(s.valor) })),
    pecas: pecas.map((p) => ({ ...p, valorUnitario: parseNum(p.valorUnitario), valorTotal: parseNum(p.valorUnitario) * p.quantidade })),
    totalServicos,
    totalPecas,
    total: totalServicos + totalPecas,
    atrasado,
  };
}

// Dashboard route moved to dashboard.ts
router.get("/__unused_dashboard", async (_req, res) => {
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

  // get order totals
  const ordensIds = todasOrdens.map((o) => o.id);
  let totalsByOrdem: Record<number, { totalServicos: number; totalPecas: number }> = {};

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

router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;

  const query = db
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
    .leftJoin(veiculosTable, eq(ordensTable.veiculoId, veiculosTable.id));

  const ordens = status
    ? await query.where(eq(ordensTable.status, status as any))
    : await query;

  const ordensIds = ordens.map((o) => o.id);
  let totalsByOrdem: Record<number, { totalServicos: number; totalPecas: number }> = {};

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

  const now = new Date();
  const result = ordens.map((o) => {
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

  res.json(result.reverse());
});

router.post("/", async (req, res) => {
  const parsed = createOrdemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { servicos, pecas, dataEntrada, dataPrevisao, ...ordemData } = parsed.data;
  const numero = await generateNumero();

  const [ordem] = await db
    .insert(ordensTable)
    .values({
      ...ordemData,
      numero,
      dataEntrada: new Date(dataEntrada),
      dataPrevisao: dataPrevisao ? new Date(dataPrevisao) : null,
    })
    .returning();

  if (servicos.length > 0) {
    await db.insert(ordensServicosTable).values(
      servicos.map((s) => ({ ordemId: ordem.id, servicoId: s.servicoId, valor: String(s.valor) }))
    );
  }

  if (pecas.length > 0) {
    await db.insert(ordensPecasTable).values(
      pecas.map((p) => ({
        ordemId: ordem.id,
        pecaId: p.pecaId,
        quantidade: p.quantidade,
        valorUnitario: String(p.valorUnitario),
      }))
    );
    // reduce stock for parts
    for (const p of pecas) {
      await db
        .update(pecasTable)
        .set({ quantidade: sql`${pecasTable.quantidade} - ${p.quantidade}` })
        .where(eq(pecasTable.id, p.pecaId));
    }
  }

  const detalhada = await buildOrdemDetalhada(ordem.id);
  res.status(201).json(detalhada);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const detalhada = await buildOrdemDetalhada(id);
  if (!detalhada) {
    res.status(404).json({ error: "Ordem não encontrada" });
    return;
  }
  res.json(detalhada);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = updateOrdemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { servicos, pecas, dataEntrada, dataPrevisao, dataFinalizacao, ...rest } = parsed.data;

  // Get old parts to restore stock
  const oldPecas = await db.select().from(ordensPecasTable).where(eq(ordensPecasTable.ordemId, id));
  for (const op of oldPecas) {
    await db
      .update(pecasTable)
      .set({ quantidade: sql`${pecasTable.quantidade} + ${op.quantidade}` })
      .where(eq(pecasTable.id, op.pecaId));
  }

  const updateData: any = { ...rest };
  if (dataEntrada !== undefined) updateData.dataEntrada = new Date(dataEntrada);
  if (dataPrevisao !== undefined) updateData.dataPrevisao = dataPrevisao ? new Date(dataPrevisao) : null;
  if (dataFinalizacao !== undefined) {
    updateData.dataFinalizacao = dataFinalizacao ? new Date(dataFinalizacao) : null;
  } else if (rest.status === "finalizado" || rest.status === "entregue") {
    // Auto-set dataFinalizacao when status changes to finalizado/entregue
    const [current] = await db.select({ dataFinalizacao: ordensTable.dataFinalizacao }).from(ordensTable).where(eq(ordensTable.id, id));
    if (!current?.dataFinalizacao) {
      updateData.dataFinalizacao = new Date();
    }
  }

  await db.update(ordensTable).set(updateData).where(eq(ordensTable.id, id));

  if (servicos !== undefined) {
    await db.delete(ordensServicosTable).where(eq(ordensServicosTable.ordemId, id));
    if (servicos.length > 0) {
      await db.insert(ordensServicosTable).values(
        servicos.map((s) => ({ ordemId: id, servicoId: s.servicoId, valor: String(s.valor) }))
      );
    }
  }

  if (pecas !== undefined) {
    await db.delete(ordensPecasTable).where(eq(ordensPecasTable.ordemId, id));
    if (pecas.length > 0) {
      await db.insert(ordensPecasTable).values(
        pecas.map((p) => ({
          ordemId: id,
          pecaId: p.pecaId,
          quantidade: p.quantidade,
          valorUnitario: String(p.valorUnitario),
        }))
      );
      for (const p of pecas) {
        await db
          .update(pecasTable)
          .set({ quantidade: sql`${pecasTable.quantidade} - ${p.quantidade}` })
          .where(eq(pecasTable.id, p.pecaId));
      }
    }
  }

  const detalhada = await buildOrdemDetalhada(id);
  res.json(detalhada);
});

router.patch("/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const updateData: any = { status: parsed.data.status };
  if (parsed.data.checklistEntrega) {
    updateData.checklistEntrega = parsed.data.checklistEntrega;
  }
  if (parsed.data.status === "finalizado" || parsed.data.status === "entregue") {
    updateData.dataFinalizacao = new Date();
  }

  await db.update(ordensTable).set(updateData).where(eq(ordensTable.id, id));

  const detalhada = await buildOrdemDetalhada(id);
  if (!detalhada) {
    res.status(404).json({ error: "Ordem não encontrada" });
    return;
  }
  res.json(detalhada);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  // Restore stock
  const oldPecas = await db.select().from(ordensPecasTable).where(eq(ordensPecasTable.ordemId, id));
  for (const op of oldPecas) {
    await db
      .update(pecasTable)
      .set({ quantidade: sql`${pecasTable.quantidade} + ${op.quantidade}` })
      .where(eq(pecasTable.id, op.pecaId));
  }
  await db.delete(ordensTable).where(eq(ordensTable.id, id));
  res.status(204).end();
});

export default router;
