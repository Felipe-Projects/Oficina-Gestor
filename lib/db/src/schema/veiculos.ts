import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientesTable } from "./clientes";

export const veiculosTable = pgTable("veiculos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clientesTable.id),
  placa: text("placa").notNull(),
  modelo: text("modelo").notNull(),
  marca: text("marca").notNull(),
  ano: integer("ano").notNull(),
  km: integer("km"),
  cor: text("cor"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVeiculoSchema = createInsertSchema(veiculosTable).omit({ id: true, createdAt: true });
export type InsertVeiculo = z.infer<typeof insertVeiculoSchema>;
export type Veiculo = typeof veiculosTable.$inferSelect;
