import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton de Prisma optimizado para Serverless (Vercel).
 *
 * - En producción se crea una nueva instancia por Lambda invocation,
 *   pero el connection pooler de Supabase (puerto 6543, modo Transaction)
 *   gestiona el pool externamente, evitando el agotamiento de conexiones.
 * - En desarrollo, el patrón globalForPrisma evita instancias duplicadas
 *   por el hot-reload de Next.js.
 *
 * Variables de entorno requeridas:
 *   POSTGRES_PRISMA_URL       → Supabase pooler (puerto 6543)
 *   POSTGRES_URL_NON_POOLING  → Conexión directa (puerto 5432) para migraciones
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.POSTGRES_PRISMA_URL,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
