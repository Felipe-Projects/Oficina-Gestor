import { pgTable, serial, text, integer, numeric, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";
import { veiculosTable } from "./veiculos";
import { servicosTable } from "./servicos";
import { pecasTable } from "./pecas";

export const statusOrdemEnum = pgEnum("status_ordem", ["orcamento", "em_andamento", "finalizado", "entregue"]);

export const ordensTable = pgTable("ordens", {
  id: serial("id").primaryKey(),
  numero: text("numero").notNull().unique(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  veiculoId: integer("veiculo_id").notNull().references(() => veiculosTable.id),
  responsavel: text("responsavel").notNull(),
  status: statusOrdemEnum("status").notNull().default("orcamento"),
  dataEntrada: timestamp("data_entrada").notNull(),
  dataPrevisao: timestamp("data_previsao"),
  dataFinalizacao: timestamp("data_finalizacao"),
  observacoes: text("observacoes"),
  checklistEntrada: jsonb("checklist_entrada"),
  checklistEntrega: jsonb("checklist_entrega"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ordensServicosTable = pgTable("ordens_servicos", {
  id: serial("id").primaryKey(),
  ordemId: integer("ordem_id").notNull().references(() => ordensTable.id, { onDelete: "cascade" }),
  servicoId: integer("servico_id").notNull().references(() => servicosTable.id),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
});

export const ordensPecasTable = pgTable("ordens_pecas", {
  id: serial("id").primaryKey(),
  ordemId: integer("ordem_id").notNull().references(() => ordensTable.id, { onDelete: "cascade" }),
  pecaId: integer("peca_id").notNull().references(() => pecasTable.id),
  quantidade: integer("quantidade").notNull(),
  valorUnitario: numeric("valor_unitario", { precision: 10, scale: 2 }).notNull(),
  proximaTrocaData: text("proxima_troca_data"),
  proximaTrocaKm: integer("proxima_troca_km"),
});

export const insertOrdemSchema = createInsertSchema(ordensTable).omit({ id: true, createdAt: true, numero: true });
export type InsertOrdem = z.infer<typeof insertOrdemSchema>;
export type Ordem = typeof ordensTable.$inferSelect;
export type OrdemServico = typeof ordensServicosTable.$inferSelect;
export type OrdemPeca = typeof ordensPecasTable.$inferSelect;
