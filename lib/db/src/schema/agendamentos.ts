import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agendamentosTable = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  clienteNome: text("cliente_nome").notNull(),
  clienteTelefone: text("cliente_telefone").notNull(),
  veiculoPlaca: text("veiculo_placa").notNull(),
  veiculoModelo: text("veiculo_modelo").notNull(),
  servicoId: integer("servico_id"),
  servicoNome: text("servico_nome"),
  dataAgendamento: text("data_agendamento").notNull(),
  horario: text("horario").notNull(),
  duracaoDias: integer("duracao_dias").notNull().default(1),
  status: text("status").notNull().default("pendente"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgendamentoSchema = createInsertSchema(agendamentosTable).omit({ id: true, createdAt: true });
export type InsertAgendamento = z.infer<typeof insertAgendamentoSchema>;
export type Agendamento = typeof agendamentosTable.$inferSelect;
