import { z } from "zod";

export const operationTypeSchema = z.enum(["BUY", "SELL"]);

export const transactionSchema = z.object({
  id: z.number().int().optional(),
  date: z.string().min(1, "La fecha es requerida"),
  symbol: z.string().min(1, "El símbolo es requerido").toUpperCase(),
  qty: z.number({ required_error: "La cantidad es requerida" }).positive("Debe ser positivo"),
  price: z.number({ required_error: "El precio es requerido" }).positive("Debe ser positivo"),
  broker: z.string().min(1, "El broker es requerido").default("AMR"),
  account: z.string().default('USA'),
  side: operationTypeSchema,
  currency: z.string().default('USD'),
  commissions: z.number().default(0),
  exchange_rate: z.number().default(1),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// Schema para el formulario de nueva transacción (campos de UI)
export const newTransactionFormSchema = z.object({
  symbol: z.string().min(1, "El símbolo es requerido"),
  entryDate: z.string().min(1, "La fecha de entrada es requerida"),
  qty: z.number({ required_error: "La cantidad es requerida" }).positive("Debe ser positivo"),
  entryPrice: z.number({ required_error: "El precio es requerido" }).positive("Debe ser positivo"),
  broker: z.string().min(1, "El broker es requerido").default("AMR"),
  account: z.string().default('USA'),
  side: z.enum(["BUY", "SELL"]).default("BUY"),
  isClosed: z.boolean().default(false),
  exitPrice: z.number().positive().optional(),
  exitDate: z.string().optional(),
  currency: z.string().default('USD'),
  commissions: z.number().default(0),
  exchange_rate: z.number().default(1),
});

export type NewTransactionFormInput = z.infer<typeof newTransactionFormSchema>;

// Backward compat aliases
export const operationSchema = transactionSchema;
export type OperationInput = TransactionInput;
export const executionSchema = transactionSchema;
export type ExecutionInput = TransactionInput;
export const tradeSchema = newTransactionFormSchema;
export type TradeInput = NewTransactionFormInput;
export const newExecutionFormSchema = newTransactionFormSchema;
export type NewExecutionFormInput = NewTransactionFormInput;
export const newOperationFormSchema = newTransactionFormSchema;
export type NewOperationFormInput = NewTransactionFormInput;
