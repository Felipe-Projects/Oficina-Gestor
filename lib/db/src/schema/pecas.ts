import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pecasTable = pgTable("pecas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  codigo: text("codigo"),
  quantidade: integer("quantidade").notNull().default(0),
  quantidadeMinima: integer("quantidade_minima").notNull().default(1),
  valorCusto: numeric("valor_custo", { precision: 10, scale: 2 }).notNull(),
  valorVenda: numeric("valor_venda", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPecaSchema = createInsertSchema(pecasTable).omit({ id: true, createdAt: true });
export type InsertPeca = z.infer<typeof insertPecaSchema>;
export type Peca = typeof pecasTable.$inferSelect;
