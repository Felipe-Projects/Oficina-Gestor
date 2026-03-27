import { Router } from "express";
import { db } from "@workspace/db";
import { veiculosTable, insertVeiculoSchema, clientesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined;
  
  const query = db
    .select({
      id: veiculosTable.id,
      clienteId: veiculosTable.clienteId,
      clienteNome: clientesTable.nome,
      placa: veiculosTable.placa,
      modelo: veiculosTable.modelo,
      marca: veiculosTable.marca,
      ano: veiculosTable.ano,
      km: veiculosTable.km,
      cor: veiculosTable.cor,
      observacoes: veiculosTable.observacoes,
      createdAt: veiculosTable.createdAt,
    })
    .from(veiculosTable)
    .leftJoin(clientesTable, eq(veiculosTable.clienteId, clientesTable.id));

  if (clienteId) {
    const result = await query.where(eq(veiculosTable.clienteId, clienteId));
    res.json(result);
  } else {
    const result = await query;
    res.json(result);
  }
});

router.post("/", async (req, res) => {
  const parsed = insertVeiculoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [veiculo] = await db.insert(veiculosTable).values(parsed.data).returning();
  const [withCliente] = await db
    .select({
      id: veiculosTable.id,
      clienteId: veiculosTable.clienteId,
      clienteNome: clientesTable.nome,
      placa: veiculosTable.placa,
      modelo: veiculosTable.modelo,
      marca: veiculosTable.marca,
      ano: veiculosTable.ano,
      km: veiculosTable.km,
      cor: veiculosTable.cor,
      observacoes: veiculosTable.observacoes,
      createdAt: veiculosTable.createdAt,
    })
    .from(veiculosTable)
    .leftJoin(clientesTable, eq(veiculosTable.clienteId, clientesTable.id))
    .where(eq(veiculosTable.id, veiculo.id));
  res.status(201).json(withCliente);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [veiculo] = await db
    .select({
      id: veiculosTable.id,
      clienteId: veiculosTable.clienteId,
      clienteNome: clientesTable.nome,
      placa: veiculosTable.placa,
      modelo: veiculosTable.modelo,
      marca: veiculosTable.marca,
      ano: veiculosTable.ano,
      km: veiculosTable.km,
      cor: veiculosTable.cor,
      observacoes: veiculosTable.observacoes,
      createdAt: veiculosTable.createdAt,
    })
    .from(veiculosTable)
    .leftJoin(clientesTable, eq(veiculosTable.clienteId, clientesTable.id))
    .where(eq(veiculosTable.id, id));
  if (!veiculo) {
    res.status(404).json({ error: "Veículo não encontrado" });
    return;
  }
  res.json(veiculo);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = insertVeiculoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  await db.update(veiculosTable).set(parsed.data).where(eq(veiculosTable.id, id));
  const [updated] = await db
    .select({
      id: veiculosTable.id,
      clienteId: veiculosTable.clienteId,
      clienteNome: clientesTable.nome,
      placa: veiculosTable.placa,
      modelo: veiculosTable.modelo,
      marca: veiculosTable.marca,
      ano: veiculosTable.ano,
      km: veiculosTable.km,
      cor: veiculosTable.cor,
      observacoes: veiculosTable.observacoes,
      createdAt: veiculosTable.createdAt,
    })
    .from(veiculosTable)
    .leftJoin(clientesTable, eq(veiculosTable.clienteId, clientesTable.id))
    .where(eq(veiculosTable.id, id));
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(veiculosTable).where(eq(veiculosTable.id, id));
  res.status(204).end();
});

export default router;
