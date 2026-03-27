import { Router } from "express";
import { db } from "@workspace/db";
import { clientesTable, insertClienteSchema, veiculosTable, ordensTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const clientes = await db.select().from(clientesTable).orderBy(clientesTable.nome);
  res.json(clientes);
});

router.post("/", async (req, res) => {
  const parsed = insertClienteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [cliente] = await db.insert(clientesTable).values(parsed.data).returning();
  res.status(201).json(cliente);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [cliente] = await db.select().from(clientesTable).where(eq(clientesTable.id, id));
  if (!cliente) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  res.json(cliente);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = insertClienteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(clientesTable).set(parsed.data).where(eq(clientesTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Cliente não encontrado" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(clientesTable).where(eq(clientesTable.id, id));
  res.status(204).end();
});

export default router;
