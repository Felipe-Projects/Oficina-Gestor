import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientesTable = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  whatsapp: text("whatsapp"),
  email: text("email"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClienteSchema = createInsertSchema(clientesTable).omit({ id: true, createdAt: true });
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientesTable.$inferSelect;
