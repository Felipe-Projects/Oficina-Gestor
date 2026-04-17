import { Router } from "express";
import { db } from "@workspace/db";
import { notificacoesConfigTable, notificacoesLogTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { runNotificacoesJob } from "../jobs/notificacoesJob";

const router = Router();

const configSchema = z.object({
  diasAntecedencia: z.number().int().min(1).max(365),
  ativo: z.boolean(),
  numeroRemetente: z.string().optional().nullable(),
});

async function getOrCreateConfig() {
  const [existing] = await db.select().from(notificacoesConfigTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(notificacoesConfigTable).values({}).returning();
  return created;
}

// GET /api/notificacoes/config
router.get("/config", async (_req, res) => {
  const config = await getOrCreateConfig();
  res.json(config);
});

// PUT /api/notificacoes/config
router.put("/config", async (req, res) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const config = await getOrCreateConfig();
  const [updated] = await db
    .update(notificacoesConfigTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(notificacoesConfigTable.id, config.id))
    .returning();
  res.json(updated);
});

// GET /api/notificacoes/log
router.get("/log", async (_req, res) => {
  const logs = await db
    .select()
    .from(notificacoesLogTable)
    .orderBy(desc(notificacoesLogTable.enviadoEm))
    .limit(100);
  res.json(logs);
});

// POST /api/notificacoes/disparar — executa o job imediatamente
router.post("/disparar", async (_req, res) => {
  try {
    const result = await runNotificacoesJob();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
