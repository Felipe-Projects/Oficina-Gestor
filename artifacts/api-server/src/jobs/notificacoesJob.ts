import { db } from "@workspace/db";
import {
  manutencaoVeiculoTable,
  veiculosTable,
  clientesTable,
  notificacoesConfigTable,
  notificacoesLogTable,
} from "@workspace/db/schema";
import { eq, and, isNotNull, lte, gte } from "drizzle-orm";
import { getTwilioClient, getTwilioFromNumber } from "../lib/twilioClient";

async function getConfig() {
  const [config] = await db.select().from(notificacoesConfigTable).limit(1);
  if (!config) {
    const [created] = await db.insert(notificacoesConfigTable).values({}).returning();
    return created;
  }
  return config;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

export async function runNotificacoesJob(forcarReenvio = false): Promise<{ enviados: number; erros: number; ignorados: number }> {
  const config = await getConfig();

  if (!config.ativo && !forcarReenvio) {
    return { enviados: 0, erros: 0, ignorados: 0 };
  }

  const hoje = new Date();
  const limite = new Date();
  limite.setDate(hoje.getDate() + config.diasAntecedencia);

  const hojeStr = hoje.toISOString().split("T")[0];
  const limiteStr = limite.toISOString().split("T")[0];

  const itens = await db
    .select({
      id: manutencaoVeiculoTable.id,
      nome: manutencaoVeiculoTable.nome,
      proximaTrocaData: manutencaoVeiculoTable.proximaTrocaData,
      veiculoModelo: veiculosTable.modelo,
      veiculoMarca: veiculosTable.marca,
      veiculoPlaca: veiculosTable.placa,
      clienteNome: clientesTable.nome,
      clienteWhatsapp: clientesTable.whatsapp,
      clienteTelefone: clientesTable.telefone,
    })
    .from(manutencaoVeiculoTable)
    .innerJoin(veiculosTable, eq(manutencaoVeiculoTable.veiculoId, veiculosTable.id))
    .innerJoin(clientesTable, eq(veiculosTable.clienteId, clientesTable.id))
    .where(
      and(
        isNotNull(manutencaoVeiculoTable.proximaTrocaData),
        gte(manutencaoVeiculoTable.proximaTrocaData, hojeStr),
        lte(manutencaoVeiculoTable.proximaTrocaData, limiteStr)
      )
    );

  // Se não for reenvio forçado, pula quem já foi notificado com sucesso
  let itensPendentes = itens;
  let jaIgnorados = 0;

  if (!forcarReenvio) {
    const jaNotificadosResult = await db
      .select({ manutencaoId: notificacoesLogTable.manutencaoId })
      .from(notificacoesLogTable)
      .where(eq(notificacoesLogTable.status, "enviado"));

    const jaNotificadosSet = new Set(jaNotificadosResult.map((r) => r.manutencaoId));
    itensPendentes = itens.filter((item) => !jaNotificadosSet.has(item.id));
    jaIgnorados = itens.length - itensPendentes.length;
  }

  let enviados = 0;
  let erros = 0;
  let ignorados = jaIgnorados;

  for (const item of itensPendentes) {
    const numero = item.clienteWhatsapp || item.clienteTelefone;
    if (!numero || numero.trim() === "") {
      ignorados++;
      continue;
    }

    const formattedNumber = formatPhone(numero);
    const dataFormatada = item.proximaTrocaData
      ? new Date(item.proximaTrocaData + "T12:00:00").toLocaleDateString("pt-BR")
      : "em breve";

    const mensagem =
      `Olá, ${item.clienteNome}! 👋\n\n` +
      `A manutenção *${item.nome}* do seu veículo *${item.veiculoMarca} ${item.veiculoModelo}* (placa ${item.veiculoPlaca}) ` +
      `está prevista para *${dataFormatada}*.\n\n` +
      `Entre em contato conosco para agendar. Oficina Mecânica — sua segurança em primeiro lugar! 🔧`;

    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromNumber();

      const remetente = config.numeroRemetente || fromNumber;
      if (!remetente) throw new Error("Número remetente Twilio não configurado");

      await client.messages.create({
        from: `whatsapp:${remetente}`,
        to: `whatsapp:${formattedNumber}`,
        body: mensagem,
      });

      await db.insert(notificacoesLogTable).values({
        manutencaoId: item.id,
        clienteNome: item.clienteNome,
        numero: formattedNumber,
        mensagem,
        status: "enviado",
      });

      enviados++;
    } catch (err: any) {
      await db.insert(notificacoesLogTable).values({
        manutencaoId: item.id,
        clienteNome: item.clienteNome,
        numero: formattedNumber,
        mensagem,
        status: "erro",
        erro: err.message,
      });
      erros++;
    }
  }

  return { enviados, erros, ignorados };
}

export function startNotificacoesScheduler() {
  const INTERVALO_MS = 60 * 60 * 1000; // 1 hora

  async function tick() {
    try {
      const result = await runNotificacoesJob();
      if (result.enviados > 0 || result.erros > 0) {
        console.log(`[Notificações WhatsApp] Enviados: ${result.enviados}, Erros: ${result.erros}, Ignorados: ${result.ignorados}`);
      }
    } catch (err) {
      console.error("[Notificações WhatsApp] Erro no job:", err);
    }
  }

  tick();
  setInterval(tick, INTERVALO_MS);
  console.log("[Notificações WhatsApp] Scheduler iniciado — verificação a cada hora");
}
