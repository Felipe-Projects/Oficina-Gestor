import { pgTable, serial, text, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const despesasTable = pgTable("despesas", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  categoria: text("categoria").notNull(),
  data: date("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDespesaSchema = createInsertSchema(despesasTable).omit({ id: true, createdAt: true });
export type InsertDespesa = z.infer<typeof insertDespesaSchema>;
export type Despesa = typeof despesasTable.$inferSelect;
