import { Router } from "express";
import { db } from "@workspace/db";
import { servicosTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const servicoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  valorPadrao: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

function formatServico(s: typeof servicosTable.$inferSelect) {
  return {
    ...s,
    valorPadrao: parseFloat(s.valorPadrao as unknown as string),
  };
}

router.get("/", async (_req, res) => {
  const servicos = await db.select().from(servicosTable).orderBy(servicosTable.nome);
  res.json(servicos.map(formatServico));
});

router.post("/", async (req, res) => {
  const parsed = servicoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [servico] = await db.insert(servicosTable).values(parsed.data).returning();
  res.status(201).json(formatServico(servico));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = servicoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(servicosTable).set(parsed.data).where(eq(servicosTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }
  res.json(formatServico(updated));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(servicosTable).where(eq(servicosTable.id, id));
  res.status(204).end();
});

export default router;
