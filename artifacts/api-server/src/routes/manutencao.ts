import { Router } from "express";
import { db } from "@workspace/db";
import { manutencaoVeiculoTable, veiculosTable, clientesTable } from "@workspace/db/schema";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const manutencaoSchema = z.object({
  veiculoId: z.number().int(),
  nome: z.string().min(1),
  ultimaTroca: z.string().optional().nullable(),
  proximaTrocaData: z.string().optional().nullable(),
  proximaTrocaKm: z.number().int().optional().nullable(),
});

const updateManutencaoSchema = z.object({
  nome: z.string().min(1).optional(),
  ultimaTroca: z.string().optional().nullable(),
  proximaTrocaData: z.string().optional().nullable(),
  proximaTrocaKm: z.number().int().optional().nullable(),
});

// GET /api/manutencao/alertas — itens com próxima troca nos próximos 3 meses
router.get("/alertas", async (_req, res) => {
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const limitDate = threeMonthsLater.toISOString().split("T")[0];

  const items = await db
    .select({
      id: manutencaoVeiculoTable.id,
      veiculoId: manutencaoVeiculoTable.veiculoId,
      nome: manutencaoVeiculoTable.nome,
      ultimaTroca: manutencaoVeiculoTable.ultimaTroca,
      proximaTrocaData: manutencaoVeiculoTable.proximaTrocaData,
      proximaTrocaKm: manutencaoVeiculoTable.proximaTrocaKm,
      veiculoModelo: veiculosTable.modelo,
      veiculoMarca: veiculosTable.marca,
      veiculoPlaca: veiculosTable.placa,
      clienteId: veiculosTable.clienteId,
      clienteNome: clientesTable.nome,
    })
    .from(manutencaoVeiculoTable)
    .innerJoin(veiculosTable, eq(manutencaoVeiculoTable.veiculoId, veiculosTable.id))
    .innerJoin(clientesTable, eq(veiculosTable.clienteId, clientesTable.id))
    .where(
      and(
        isNotNull(manutencaoVeiculoTable.proximaTrocaData),
        lte(manutencaoVeiculoTable.proximaTrocaData, limitDate),
      )
    )
    .orderBy(manutencaoVeiculoTable.proximaTrocaData);

  res.json(items);
});

// GET /api/manutencao?veiculoId=X
router.get("/", async (req, res) => {
  const veiculoId = parseInt(req.query.veiculoId as string);
  if (!veiculoId) {
    res.status(400).json({ error: "veiculoId é obrigatório" });
    return;
  }
  const items = await db
    .select()
    .from(manutencaoVeiculoTable)
    .where(eq(manutencaoVeiculoTable.veiculoId, veiculoId))
    .orderBy(manutencaoVeiculoTable.nome);
  res.json(items);
});

// POST /api/manutencao
router.post("/", async (req, res) => {
  const parsed = manutencaoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [item] = await db.insert(manutencaoVeiculoTable).values(parsed.data).returning();
  res.status(201).json(item);
});

// PUT /api/manutencao/:id
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = updateManutencaoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db
    .update(manutencaoVeiculoTable)
    .set(parsed.data)
    .where(eq(manutencaoVeiculoTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  res.json(updated);
});

// DELETE /api/manutencao/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(manutencaoVeiculoTable).where(eq(manutencaoVeiculoTable.id, id));
  res.status(204).end();
});

export default router;
