/**
 * ARCHIVO DE REFERENCIA — Server Action migrado a Supabase + Prisma
 *
 * Este archivo muestra el patrón correcto para Server Actions que combinan:
 * - Autenticación vía Supabase (validación de sesión)
 * - Acceso a datos vía Prisma (PostgreSQL Supabase)
 * - Validación de entrada con Zod
 *
 * NO está conectado a la UI actual. Sirve como plantilla para futuras features
 * que requieran autenticación real.
 */

"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { createClient } from "@/utils/supabase/server";

// ── Schema de validación Zod ─────────────────────────────────────────────────

const createCashFlowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  amount: z.number().positive("El monto debe ser positivo"),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  broker: z.string().min(1, "Broker requerido"),
  description: z.string().optional(),
});

type CreateCashFlowInput = z.infer<typeof createCashFlowSchema>;

// ── Resultado tipado ─────────────────────────────────────────────────────────

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Server Action ejemplo: getCashFlowsForUser ───────────────────────────────

/**
 * Obtiene los movimientos del usuario autenticado.
 * Patrón: validar sesión → query Prisma → retornar datos.
 */
export async function getCashFlowsForUser(): Promise<
  ActionResult<{ id: number; date: Date; amount: number; type: string; broker: string }[]>
> {
  // 1. Validar sesión con Supabase
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "No autenticado" };
  }

  // 2. Query con Prisma
  const cashFlows = await db.cashFlow.findMany({
    orderBy: { date: "desc" },
    select: { id: true, date: true, amount: true, type: true, broker: true },
  });

  return { success: true, data: cashFlows };
}

// ── Server Action ejemplo: createCashFlowForUser ─────────────────────────────

/**
 * Crea un movimiento para el usuario autenticado.
 * Patrón: validar sesión → validar input con Zod → mutación Prisma.
 */
export async function createCashFlowForUser(
  input: CreateCashFlowInput
): Promise<ActionResult<{ id: number }>> {
  // 1. Validar sesión
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "No autenticado" };
  }

  // 2. Validar input con Zod
  const parsed = createCashFlowSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // 3. Mutación con Prisma
  const cashFlow = await db.cashFlow.create({
    data: {
      date: new Date(parsed.data.date + "T12:00:00"),
      amount: parsed.data.amount,
      type: parsed.data.type,
      broker: parsed.data.broker,
      description: parsed.data.description,
    },
    select: { id: true },
  });

  return { success: true, data: cashFlow };
}
