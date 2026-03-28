import { Router } from "express";
import { db } from "@workspace/db";
import {
  backupsTable,
  clientesTable,
  veiculosTable,
  servicosTable,
  pecasTable,
  ordensTable,
  ordensServicosTable,
  ordensPecasTable,
  despesasTable,
  manutencaoVeiculoTable,
  agendamentosTable,
  diasBloqueadosTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

async function coletarTodosDados() {
  const [
    clientes,
    veiculos,
    servicos,
    pecas,
    ordens,
    ordensServicos,
    ordensPecas,
    despesas,
    manutencao,
    agendamentos,
    diasBloqueados,
  ] = await Promise.all([
    db.select().from(clientesTable),
    db.select().from(veiculosTable),
    db.select().from(servicosTable),
    db.select().from(pecasTable),
    db.select().from(ordensTable),
    db.select().from(ordensServicosTable),
    db.select().from(ordensPecasTable),
    db.select().from(despesasTable),
    db.select().from(manutencaoVeiculoTable),
    db.select().from(agendamentosTable),
    db.select().from(diasBloqueadosTable),
  ]);

  return {
    versao: "1.0",
    dataExportacao: new Date().toISOString(),
    dados: {
      clientes,
      veiculos,
      servicos,
      pecas,
      ordens,
      ordensServicos,
      ordensPecas,
      despesas,
      manutencao,
      agendamentos,
      diasBloqueados,
    },
  };
}

router.get("/exportar", async (_req, res) => {
  try {
    const dados = await coletarTodosDados();
    const json = JSON.stringify(dados, null, 2);
    const dataHoje = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="backup_oficina_${dataHoje}.json"`);
    res.send(json);
  } catch (err) {
    res.status(500).json({ error: "Erro ao exportar backup" });
  }
});

router.post("/salvar", async (req, res) => {
  try {
    const dados = await coletarTodosDados();
    const json = JSON.stringify(dados);
    const tipo = (req.body?.tipo as string) || "manual";
    const dataHoje = new Date().toISOString().split("T")[0];
    const nome = `Backup ${tipo === "automatico" ? "Automático" : "Manual"} - ${dataHoje}`;

    const [backup] = await db
      .insert(backupsTable)
      .values({ nome, tipo, tamanho: json.length, dados: json })
      .returning();

    const totalBackups = await db.select().from(backupsTable);
    if (totalBackups.length > 10) {
      const mais_antigo = totalBackups.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      if (mais_antigo) {
        await db.delete(backupsTable).where(sql`${backupsTable.id} = ${mais_antigo.id}`);
      }
    }

    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar backup" });
  }
});

router.get("/historico", async (_req, res) => {
  try {
    const backups = await db
      .select({
        id: backupsTable.id,
        nome: backupsTable.nome,
        tipo: backupsTable.tipo,
        tamanho: backupsTable.tamanho,
        createdAt: backupsTable.createdAt,
      })
      .from(backupsTable)
      .orderBy(sql`${backupsTable.createdAt} DESC`);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

router.get("/historico/:id/baixar", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [backup] = await db.select().from(backupsTable).where(sql`${backupsTable.id} = ${id}`);
    if (!backup) return res.status(404).json({ error: "Backup não encontrado" });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${backup.nome.replace(/ /g, "_")}.json"`);
    res.send(backup.dados);
  } catch (err) {
    res.status(500).json({ error: "Erro ao baixar backup" });
  }
});

router.delete("/historico/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(backupsTable).where(sql`${backupsTable.id} = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar backup" });
  }
});

const importSchema = z.object({
  versao: z.string(),
  dados: z.object({
    clientes: z.array(z.any()),
    veiculos: z.array(z.any()),
    servicos: z.array(z.any()),
    pecas: z.array(z.any()),
    ordens: z.array(z.any()),
    ordensServicos: z.array(z.any()),
    ordensPecas: z.array(z.any()),
    despesas: z.array(z.any()),
    manutencao: z.array(z.any()),
    agendamentos: z.array(z.any()),
    diasBloqueados: z.array(z.any()),
  }),
});

router.post("/importar", async (req, res) => {
  try {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Arquivo de backup inválido" });
    }

    const { dados } = parsed.data;

    await db.transaction(async (tx) => {
      await tx.execute(sql`SET session_replication_role = replica`);

      await tx.delete(ordensPecasTable);
      await tx.delete(ordensServicosTable);
      await tx.delete(manutencaoVeiculoTable);
      await tx.delete(agendamentosTable);
      await tx.delete(ordensTable);
      await tx.delete(despesasTable);
      await tx.delete(diasBloqueadosTable);
      await tx.delete(veiculosTable);
      await tx.delete(pecasTable);
      await tx.delete(servicosTable);
      await tx.delete(clientesTable);

      if (dados.clientes.length) await tx.insert(clientesTable).values(dados.clientes);
      if (dados.veiculos.length) await tx.insert(veiculosTable).values(dados.veiculos);
      if (dados.servicos.length) await tx.insert(servicosTable).values(dados.servicos);
      if (dados.pecas.length) await tx.insert(pecasTable).values(dados.pecas);
      if (dados.ordens.length) await tx.insert(ordensTable).values(dados.ordens);
      if (dados.ordensServicos.length) await tx.insert(ordensServicosTable).values(dados.ordensServicos);
      if (dados.ordensPecas.length) await tx.insert(ordensPecasTable).values(dados.ordensPecas);
      if (dados.despesas.length) await tx.insert(despesasTable).values(dados.despesas);
      if (dados.manutencao.length) await tx.insert(manutencaoVeiculoTable).values(dados.manutencao);
      if (dados.agendamentos.length) await tx.insert(agendamentosTable).values(dados.agendamentos);
      if (dados.diasBloqueados.length) await tx.insert(diasBloqueadosTable).values(dados.diasBloqueados);

      const tabelas = [
        ["clientes_id_seq", "clientes"],
        ["veiculos_id_seq", "veiculos"],
        ["servicos_id_seq", "servicos"],
        ["pecas_id_seq", "pecas"],
        ["ordens_id_seq", "ordens"],
        ["ordens_servicos_id_seq", "ordens_servicos"],
        ["ordens_pecas_id_seq", "ordens_pecas"],
        ["despesas_id_seq", "despesas"],
        ["manutencao_veiculo_id_seq", "manutencao_veiculo"],
        ["agendamentos_id_seq", "agendamentos"],
      ];

      for (const [seq, tabela] of tabelas) {
        await tx.execute(
          sql.raw(`SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`)
        );
      }

      await tx.execute(sql`SET session_replication_role = DEFAULT`);
    });

    res.json({ ok: true, mensagem: "Backup importado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao importar backup" });
  }
});

export async function criarBackupAutomatico() {
  try {
    const [ultimoAuto] = await db
      .select()
      .from(backupsTable)
      .where(sql`${backupsTable.tipo} = 'automatico'`)
      .orderBy(sql`${backupsTable.createdAt} DESC`)
      .limit(1);

    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    if (!ultimoAuto || new Date(ultimoAuto.createdAt) < seteDiasAtras) {
      const dados = await coletarTodosDados();
      const json = JSON.stringify(dados);
      const dataHoje = new Date().toISOString().split("T")[0];
      await db.insert(backupsTable).values({
        nome: `Backup Automático - ${dataHoje}`,
        tipo: "automatico",
        tamanho: json.length,
        dados: json,
      });
      console.log("[Backup] Backup automático criado em", dataHoje);
    }
  } catch (err) {
    console.error("[Backup] Erro ao criar backup automático:", err);
  }
}

export default router;
