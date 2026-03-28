import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const diasBloqueadosTable = pgTable("dias_bloqueados", {
  id: serial("id").primaryKey(),
  data: text("data").notNull().unique(),
  motivo: text("motivo"),
});

export const insertDiaBloqueadoSchema = createInsertSchema(diasBloqueadosTable).omit({ id: true });
export type InsertDiaBloqueado = z.infer<typeof insertDiaBloqueadoSchema>;
export type DiaBloqueado = typeof diasBloqueadosTable.$inferSelect;
