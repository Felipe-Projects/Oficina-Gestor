import { Router } from "express";
import { db } from "@workspace/db";
import { pecasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const numStr = () => z.union([z.string(), z.number()]).transform((v) => String(v));

const pecaSchema = z.object({
  nome: z.string().min(1),
  codigo: z.string().optional(),
  quantidade: z.number().int().default(0),
  quantidadeMinima: z.number().int().default(1),
  valorCusto: numStr(),
  valorVenda: numStr(),
});

const movimentacaoSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.number().int().positive(),
  motivo: z.string().optional(),
});

function formatPeca(peca: typeof pecasTable.$inferSelect) {
  return {
    ...peca,
    valorCusto: parseFloat(peca.valorCusto as unknown as string),
    valorVenda: parseFloat(peca.valorVenda as unknown as string),
    estoqueAlerta: peca.quantidade <= peca.quantidadeMinima,
  };
}

router.get("/", async (_req, res) => {
  const pecas = await db.select().from(pecasTable).orderBy(pecasTable.nome);
  res.json(pecas.map(formatPeca));
});

router.post("/", async (req, res) => {
  const parsed = pecaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [peca] = await db.insert(pecasTable).values(parsed.data).returning();
  res.status(201).json(formatPeca(peca));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [peca] = await db.select().from(pecasTable).where(eq(pecasTable.id, id));
  if (!peca) {
    res.status(404).json({ error: "Peça não encontrada" });
    return;
  }
  res.json(formatPeca(peca));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = pecaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [updated] = await db.update(pecasTable).set(parsed.data).where(eq(pecasTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Peça não encontrada" });
    return;
  }
  res.json(formatPeca(updated));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(pecasTable).where(eq(pecasTable.id, id));
  res.status(204).end();
});

router.post("/:id/movimentacao", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = movimentacaoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [peca] = await db.select().from(pecasTable).where(eq(pecasTable.id, id));
  if (!peca) {
    res.status(404).json({ error: "Peça não encontrada" });
    return;
  }
  const novaQtd =
    parsed.data.tipo === "entrada"
      ? peca.quantidade + parsed.data.quantidade
      : peca.quantidade - parsed.data.quantidade;

  if (novaQtd < 0) {
    res.status(400).json({ error: "Quantidade insuficiente em estoque" });
    return;
  }
  const [updated] = await db
    .update(pecasTable)
    .set({ quantidade: novaQtd })
    .where(eq(pecasTable.id, id))
    .returning();
  res.json(formatPeca(updated));
});

export default router;
