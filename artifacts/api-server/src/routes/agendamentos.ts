import { Router } from "express";
import { db } from "@workspace/db";
import { agendamentosTable, ordensTable, diasBloqueadosTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const MAX_CARROS = 2;

const agendamentoSchema = z.object({
  clienteNome: z.string().min(1),
  clienteTelefone: z.string().min(1),
  veiculoPlaca: z.string().min(1),
  veiculoModelo: z.string().min(1),
  servicoId: z.number().int().optional().nullable(),
  servicoNome: z.string().optional().nullable(),
  dataAgendamento: z.string().min(1),
  horario: z.string().min(1),
  duracaoDias: z.number().int().min(1).default(1),
  observacoes: z.string().optional().nullable(),
});

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function dateRange(start: string, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    result.push(addDays(start, i));
  }
  return result;
}

function toDateStr(val: Date | string): string {
  return (val instanceof Date ? val.toISOString() : String(val)).split("T")[0];
}

// ─── DIAS BLOQUEADOS ────────────────────────────────────────────────────────

// GET /api/agendamentos/dias-bloqueados
router.get("/dias-bloqueados", async (_req, res) => {
  const dias = await db.select().from(diasBloqueadosTable).orderBy(diasBloqueadosTable.data);
  res.json(dias);
});

// POST /api/agendamentos/dias-bloqueados
router.post("/dias-bloqueados", async (req, res) => {
  const { data, motivo } = req.body;
  if (!data) {
    res.status(400).json({ error: "Campo 'data' obrigatório (YYYY-MM-DD)" });
    return;
  }
  try {
    const [criado] = await db.insert(diasBloqueadosTable).values({ data, motivo: motivo || null }).returning();
    res.status(201).json(criado);
  } catch {
    res.status(409).json({ error: "Essa data já está bloqueada." });
  }
});

// DELETE /api/agendamentos/dias-bloqueados/:id
router.delete("/dias-bloqueados/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(diasBloqueadosTable).where(eq(diasBloqueadosTable.id, id));
  res.status(204).end();
});

// ─── DISPONIBILIDADE ────────────────────────────────────────────────────────

// GET /api/agendamentos/disponibilidade?dataInicio=YYYY-MM-DD&dias=60
router.get("/disponibilidade", async (req, res) => {
  const dataInicio = (req.query.dataInicio as string) || new Date().toISOString().split("T")[0];
  const totalDias = parseInt((req.query.dias as string) || "60");
  const dataFim = addDays(dataInicio, totalDias);

  const [ordensAtivas, agendamentosAtivos, diasBloqueados] = await Promise.all([
    db.select({ dataEntrada: ordensTable.dataEntrada, dataPrevisao: ordensTable.dataPrevisao })
      .from(ordensTable)
      .where(inArray(ordensTable.status, ["orcamento", "em_andamento"])),
    db.select({ dataAgendamento: agendamentosTable.dataAgendamento, duracaoDias: agendamentosTable.duracaoDias })
      .from(agendamentosTable)
      .where(inArray(agendamentosTable.status, ["pendente", "confirmado"])),
    db.select().from(diasBloqueadosTable),
  ]);

  const bloqueadosSet = new Set(diasBloqueados.map(d => d.data));

  const occupancy: Record<string, number> = {};

  for (const os of ordensAtivas) {
    if (!os.dataPrevisao) continue;
    const entrada = toDateStr(os.dataEntrada);
    const previsao = toDateStr(os.dataPrevisao);
    let cur = entrada < dataInicio ? dataInicio : entrada;
    while (cur <= previsao && cur <= dataFim) {
      occupancy[cur] = (occupancy[cur] || 0) + 1;
      cur = addDays(cur, 1);
    }
  }

  for (const ag of agendamentosAtivos) {
    for (const d of dateRange(ag.dataAgendamento, ag.duracaoDias)) {
      if (d >= dataInicio && d <= dataFim) {
        occupancy[d] = (occupancy[d] || 0) + 1;
      }
    }
  }

  const result: Array<{ data: string; ocupacao: number; disponivel: boolean; bloqueado: boolean }> = [];
  for (let i = 0; i < totalDias; i++) {
    const d = addDays(dataInicio, i);
    const dow = new Date(d + "T12:00:00Z").getUTCDay();
    if (dow === 0) continue; // skip Sundays
    const bloqueado = bloqueadosSet.has(d);
    const occ = occupancy[d] || 0;
    result.push({ data: d, ocupacao: occ, disponivel: !bloqueado && occ < MAX_CARROS, bloqueado });
  }

  res.json(result);
});

// ─── AGENDAMENTOS ────────────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  const agendamentos = await db.select().from(agendamentosTable).orderBy(agendamentosTable.dataAgendamento);
  res.json(agendamentos);
});

router.post("/", async (req, res) => {
  const parsed = agendamentoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { dataAgendamento, duracaoDias } = parsed.data;
  const dates = dateRange(dataAgendamento, duracaoDias);

  const [ordensAtivas, agendamentosAtivos, diasBloqueados] = await Promise.all([
    db.select({ dataEntrada: ordensTable.dataEntrada, dataPrevisao: ordensTable.dataPrevisao })
      .from(ordensTable).where(inArray(ordensTable.status, ["orcamento", "em_andamento"])),
    db.select({ dataAgendamento: agendamentosTable.dataAgendamento, duracaoDias: agendamentosTable.duracaoDias })
      .from(agendamentosTable).where(inArray(agendamentosTable.status, ["pendente", "confirmado"])),
    db.select().from(diasBloqueadosTable),
  ]);

  const bloqueadosSet = new Set(diasBloqueados.map(d => d.data));

  for (const d of dates) {
    if (bloqueadosSet.has(d)) {
      res.status(409).json({ error: `A data ${d} está bloqueada. A oficina não atende nesse dia.` });
      return;
    }
    let occ = 0;
    for (const os of ordensAtivas) {
      if (!os.dataPrevisao) continue;
      const entrada = toDateStr(os.dataEntrada);
      const previsao = toDateStr(os.dataPrevisao);
      if (d >= entrada && d <= previsao) occ++;
    }
    for (const ag of agendamentosAtivos) {
      if (dateRange(ag.dataAgendamento, ag.duracaoDias).includes(d)) occ++;
    }
    if (occ >= MAX_CARROS) {
      res.status(409).json({ error: `Data ${d} já está com capacidade máxima.` });
      return;
    }
  }

  const [criado] = await db.insert(agendamentosTable).values(parsed.data).returning();
  res.status(201).json(criado);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, observacoes } = req.body;
  const [updated] = await db
    .update(agendamentosTable)
    .set({ status, observacoes })
    .where(eq(agendamentosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(agendamentosTable).where(eq(agendamentosTable.id, id));
  res.status(204).end();
});

export default router;
