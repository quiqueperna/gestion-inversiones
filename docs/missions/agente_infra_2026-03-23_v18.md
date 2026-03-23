# Misión: Agente Infraestructura y DB — v18 (2026-03-23)

## Objetivo
Renombrar el modelo `Cuenta` a `Account` en Prisma y el campo `cuenta` en `CashFlow` a `account`.

## Tareas

### 1. Actualizar `prisma/schema.prisma`
- Renombrar `model Cuenta` → `model Account`
- Renombrar campo `CashFlow.cuenta String?` → `CashFlow.account String?`

### 2. Crear migración SQL
- Archivo: `prisma/migrations/TIMESTAMP_rename_cuenta_to_account/migration.sql`
- Contenido:
  ```sql
  ALTER TABLE "Cuenta" RENAME TO "Account";
  ALTER TABLE "CashFlow" RENAME COLUMN "cuenta" TO "account";
  ```

### 3. Regenerar cliente Prisma
- Ejecutar `npx prisma generate`

## Reglas aplicables
- Ver `docs/bitacora/lessons-learned.md`: en Windows, si `prisma generate` falla con EPERM, verificar que npm install ya generó el cliente.
- Los seeds legacy deben excluirse del tsconfig si referencian modelos viejos.
- El campo `directUrl` es obligatorio para migraciones (puerto 5432).
