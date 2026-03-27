import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicosTable = pgTable("servicos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  valorPadrao: numeric("valor_padrao", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServicoSchema = createInsertSchema(servicosTable).omit({ id: true, createdAt: true });
export type InsertServico = z.infer<typeof insertServicoSchema>;
export type Servico = typeof servicosTable.$inferSelect;
