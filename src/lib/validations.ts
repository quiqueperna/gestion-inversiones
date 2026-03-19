import { z } from "zod";

export const tradeSchema = z.object({
  id: z.number().int().optional(),
  entryDate: z.string().min(1, "La fecha es requerida"),
  symbol: z.string().min(1, "El símbolo es requerido").toUpperCase(),
  quantity: z.number({ required_error: "La cantidad es requerida" }),
  entryPrice: z.number({ required_error: "El precio de entrada es requerido" }).positive(),
  exitPrice: z.number().positive().nullable().optional(),
  exitDate: z.string().nullable().optional(),
  broker: z.string().min(1, "El broker es requerido").default("AMR"),
  isClosed: z.boolean().default(false),
  isFalopa: z.boolean().default(false),
  shouldFollow: z.boolean().default(false),
  isIntra: z.boolean().default(false),
});

export type TradeInput = z.infer<typeof tradeSchema>;

export const dashboardFilterSchema = z.object({
  broker: z.string().optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export type DashboardFilter = z.infer<typeof dashboardFilterSchema>;
