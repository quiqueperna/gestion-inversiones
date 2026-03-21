import { z } from "zod";

export const operationTypeSchema = z.enum(["BUY", "SELL"]);

export const operationSchema = z.object({
  id: z.number().int().optional(),
  date: z.string().min(1, "La fecha es requerida"),
  symbol: z.string().min(1, "El símbolo es requerido").toUpperCase(),
  quantity: z.number({ required_error: "La cantidad es requerida" }).positive("Debe ser positivo"),
  price: z.number({ required_error: "El precio es requerido" }).positive("Debe ser positivo"),
  broker: z.string().min(1, "El broker es requerido").default("AMR"),
  type: operationTypeSchema,
  isFalopa: z.boolean().default(false),
  isIntra: z.boolean().default(false),
});

export type OperationInput = z.infer<typeof operationSchema>;

// Schema para el formulario de nueva operación (campos de UI)
export const newOperationFormSchema = z.object({
  symbol: z.string().min(1, "El símbolo es requerido"),
  entryDate: z.string().min(1, "La fecha de entrada es requerida"),
  quantity: z.number({ required_error: "La cantidad es requerida" }).positive("Debe ser positivo"),
  entryPrice: z.number({ required_error: "El precio es requerido" }).positive("Debe ser positivo"),
  broker: z.string().min(1, "El broker es requerido").default("AMR"),
  cuenta: z.string().default('USA'),
  type: z.enum(["BUY", "SELL"]).default("BUY"),
  isClosed: z.boolean().default(false),
  isFalopa: z.boolean().default(false),
  isIntra: z.boolean().default(false),
  exitPrice: z.number().positive().optional(),
  exitDate: z.string().optional(),
  instrumentType: z.enum(["STOCK", "CEDEAR", "CRYPTO"]).default("STOCK"),
});

export type NewOperationFormInput = z.infer<typeof newOperationFormSchema>;

// Kept for backward compatibility - alias to newOperationFormSchema
export const tradeSchema = newOperationFormSchema;
export type TradeInput = NewOperationFormInput;
