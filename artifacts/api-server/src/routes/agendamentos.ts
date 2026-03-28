import { Router } from "express";
import { db } from "@workspace/db";
import { agendamentosTable, ordensTable } from "@workspace/db/schema";
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

// GET /api/agendamentos/disponibilidade?dataInicio=YYYY-MM-DD&dias=60
// Returns for each date: occupancy count (0,1,2). 2 = unavailable.
router.get("/disponibilidade", async (req, res) => {
  const dataInicio = (req.query.dataInicio as string) || new Date().toISOString().split("T")[0];
  const totalDias = parseInt((req.query.dias as string) || "60");

  const dataFim = addDays(dataInicio, totalDias);

  // Get all active OS (orcamento + em_andamento) - filter in JS to avoid timestamp type issues
  const ordensAtivas = await db
    .select({
      dataEntrada: ordensTable.dataEntrada,
      dataPrevisao: ordensTable.dataPrevisao,
    })
    .from(ordensTable)
    .where(inArray(ordensTable.status, ["orcamento", "em_andamento"]));

  // Get confirmed/pending appointments
  const agendamentosAtivos = await db
    .select({
      dataAgendamento: agendamentosTable.dataAgendamento,
      duracaoDias: agendamentosTable.duracaoDias,
    })
    .from(agendamentosTable)
    .where(inArray(agendamentosTable.status, ["pendente", "confirmado"]));

  // Build occupancy map
  const occupancy: Record<string, number> = {};

  for (const os of ordensAtivas) {
    if (!os.dataPrevisao) continue;
    const entrada = (os.dataEntrada instanceof Date ? os.dataEntrada.toISOString() : String(os.dataEntrada)).split("T")[0];
    const previsao = (os.dataPrevisao instanceof Date ? os.dataPrevisao.toISOString() : String(os.dataPrevisao)).split("T")[0];
    // Mark each day from entrada to previsao
    let cur = entrada < dataInicio ? dataInicio : entrada;
    while (cur <= previsao && cur <= dataFim) {
      occupancy[cur] = (occupancy[cur] || 0) + 1;
      cur = addDays(cur, 1);
    }
  }

  for (const ag of agendamentosAtivos) {
    const dates = dateRange(ag.dataAgendamento, ag.duracaoDias);
    for (const d of dates) {
      if (d >= dataInicio && d <= dataFim) {
        occupancy[d] = (occupancy[d] || 0) + 1;
      }
    }
  }

  // Build result array
  const result: Array<{ data: string; ocupacao: number; disponivel: boolean }> = [];
  for (let i = 0; i < totalDias; i++) {
    const d = addDays(dataInicio, i);
    // Skip Sundays (0)
    const dow = new Date(d + "T12:00:00Z").getUTCDay();
    if (dow === 0) continue;
    const occ = occupancy[d] || 0;
    result.push({ data: d, ocupacao: occ, disponivel: occ < MAX_CARROS });
  }

  res.json(result);
});

// GET /api/agendamentos — admin list
router.get("/", async (_req, res) => {
  const agendamentos = await db
    .select()
    .from(agendamentosTable)
    .orderBy(agendamentosTable.dataAgendamento);
  res.json(agendamentos);
});

// POST /api/agendamentos — public create
router.post("/", async (req, res) => {
  const parsed = agendamentoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  // Validate availability on requested date
  const { dataAgendamento, duracaoDias } = parsed.data;
  const dates = dateRange(dataAgendamento, duracaoDias);

  const ordensAtivas = await db
    .select({ dataEntrada: ordensTable.dataEntrada, dataPrevisao: ordensTable.dataPrevisao })
    .from(ordensTable)
    .where(inArray(ordensTable.status, ["orcamento", "em_andamento"]));

  const agendamentosAtivos = await db
    .select({ dataAgendamento: agendamentosTable.dataAgendamento, duracaoDias: agendamentosTable.duracaoDias })
    .from(agendamentosTable)
    .where(inArray(agendamentosTable.status, ["pendente", "confirmado"]));

  for (const d of dates) {
    let occ = 0;
    for (const os of ordensAtivas) {
      if (!os.dataPrevisao) continue;
      const entrada = (os.dataEntrada instanceof Date ? os.dataEntrada.toISOString() : String(os.dataEntrada)).split("T")[0];
      const previsao = (os.dataPrevisao instanceof Date ? os.dataPrevisao.toISOString() : String(os.dataPrevisao)).split("T")[0];
      if (d >= entrada && d <= previsao) occ++;
    }
    for (const ag of agendamentosAtivos) {
      const agDates = dateRange(ag.dataAgendamento, ag.duracaoDias);
      if (agDates.includes(d)) occ++;
    }
    if (occ >= MAX_CARROS) {
      res.status(409).json({ error: `Data ${d} já está com capacidade máxima.` });
      return;
    }
  }

  const [criado] = await db.insert(agendamentosTable).values(parsed.data).returning();
  res.status(201).json(criado);
});

// PUT /api/agendamentos/:id — update status (admin)
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

// DELETE /api/agendamentos/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(agendamentosTable).where(eq(agendamentosTable.id, id));
  res.status(204).end();
});

export default router;
