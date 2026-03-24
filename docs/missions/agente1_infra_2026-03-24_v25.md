# Agente 1 — Infraestructura y DB
**Sesión:** v25 | **Fecha:** 2026-03-24

## Objetivo
Agregar campo `userId` a todos los modelos de Prisma para aislar datos por usuario.

## Archivos a modificar
- `prisma/schema.prisma`

## Cambios al schema

Para cada modelo agregar:
```prisma
userId String @default("")
```

Y agregar índice:
```prisma
@@index([userId])
```

Modelos afectados: Execution, TradeUnit, CashFlow

Para Account y Broker: cambiar constraint única de `nombre @unique` a compuesta:
```prisma
nombre String  // remover @unique
userId String @default("")
@@unique([userId, nombre])
```

## Migración
Ejecutar:
```bash
npx prisma migrate dev --name add_userid_isolation
npx prisma generate
```

## Reglas
- `@default("")` en todos los campos userId para no romper datos existentes
- Los índices en userId son críticos para performance de queries filtradas

## Dependencias
Ninguna. Va primero.
