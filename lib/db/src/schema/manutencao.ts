import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { veiculosTable } from "./veiculos";

export const manutencaoVeiculoTable = pgTable("manutencao_veiculo", {
  id: serial("id").primaryKey(),
  veiculoId: integer("veiculo_id").notNull().references(() => veiculosTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  ultimaTroca: text("ultima_troca"),
  proximaTrocaData: text("proxima_troca_data"),
  proximaTrocaKm: integer("proxima_troca_km"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertManutencaoSchema = createInsertSchema(manutencaoVeiculoTable).omit({ id: true, createdAt: true });
export type InsertManutencao = z.infer<typeof insertManutencaoSchema>;
export type ManutencaoVeiculo = typeof manutencaoVeiculoTable.$inferSelect;
