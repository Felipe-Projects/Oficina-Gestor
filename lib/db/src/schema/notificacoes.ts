import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";

export const notificacoesConfigTable = pgTable("notificacoes_config", {
  id: serial("id").primaryKey(),
  diasAntecedencia: integer("dias_antecedencia").notNull().default(7),
  ativo: boolean("ativo").notNull().default(true),
  numeroRemetente: text("numero_remetente"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificacoesLogTable = pgTable("notificacoes_log", {
  id: serial("id").primaryKey(),
  manutencaoId: integer("manutencao_id").notNull(),
  clienteNome: text("cliente_nome").notNull(),
  numero: text("numero").notNull(),
  mensagem: text("mensagem").notNull(),
  status: text("status").notNull(),
  erro: text("erro"),
  enviadoEm: timestamp("enviado_em").defaultNow().notNull(),
});
