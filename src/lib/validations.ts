import { z } from "zod";

export const operationTypeSchema = z.enum(["BUY", "SELL"]);

export const operationSchema = z.object({
  id: z.number().int().optional(),
  date: z.string().min(1, "La fecha es requerida"),
  symbol: z.string().min(1, "El símbolo es requerido").toUpperCase(),
  quantity: z.number({ required_error: "La cantidad es requerida" }),
  price: z.number({ required_error: "El precio es requerido" }).positive(),
  broker: z.string().min(1, "El broker es requerido").default("AMR"),
  type: operationTypeSchema,
  isFalopa: z.boolean().default(false),
  isIntra: z.boolean().default(false),
});

export type OperationInput = z.infer<typeof operationSchema>;

export const tradeSchema = z.object({
  id: z.number().int().optional(),
  symbol: z.string(),
  quantity: z.number(),
  openDate: z.date(),
  closeDate: z.date(),
  openPrice: z.number(),
  closePrice: z.number(),
  openAmount: z.number(),
  closeAmount: z.number(),
  days: z.number(),
  returnAmount: z.number(),
  returnPercent: z.number(),
  tna: z.number(),
  broker: z.string(),
  instrumentType: z.string(),
  openOperationId: z.number(),
  closeOperationId: z.number(),
});

export type TradeInput = z.infer<typeof tradeSchema>;
