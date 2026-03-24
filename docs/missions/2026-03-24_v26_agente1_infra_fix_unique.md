# Agente 1 — Fix Unique Constraint Account/Broker
**Sesión:** v26 | **Fecha:** 2026-03-24

## Problema
El constraint `nombre @unique` en Account y Broker no fue eliminado correctamente en la migración v25.
La DB sigue teniendo el constraint `nombre_key` original, causando P2002 al crear una cuenta con un nombre que ya existe para otro userId.

## Fix
Aplicar directamente en la DB:
```sql
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_nombre_key";
ALTER TABLE "Broker" DROP CONSTRAINT IF EXISTS "Broker_nombre_key";
```

Verificar que ya exista el constraint compuesto:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'Account';
SELECT indexname FROM pg_indexes WHERE tablename = 'Broker';
```

Si no existe el compuesto, crearlo:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "Account_userId_nombre_key" ON "Account"("userId", "nombre");
CREATE UNIQUE INDEX IF NOT EXISTS "Broker_userId_nombre_key" ON "Broker"("userId", "nombre");
```

## Verificar schema.prisma
Confirmar que Account y Broker NO tienen `nombre String @unique` sino `@@unique([userId, nombre])`.
