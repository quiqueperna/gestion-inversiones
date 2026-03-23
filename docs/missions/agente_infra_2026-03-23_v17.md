# Misión: Agente de Infraestructura y DB — v17
**Fecha:** 2026-03-23
**Versión:** 17
**Dependencias:** Ninguna (ejecutar primero)

## Objetivo
Agregar modelos `Broker` y `Cuenta` al schema de Prisma y crear/poblar sus tablas.

## Tareas

### 1. Agregar modelos a `prisma/schema.prisma`

```prisma
model Cuenta {
  id               Int    @id @default(autoincrement())
  nombre           String @unique
  descripcion      String?
  matchingStrategy String @default("FIFO") // FIFO|LIFO|MAX_PROFIT|MIN_PROFIT|MANUAL
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Broker {
  id          Int     @id @default(autoincrement())
  nombre      String  @unique
  descripcion String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2. Crear migración
```bash
npx prisma migrate dev --name add_broker_cuenta_v17
```

### 3. Seed de brokers y cuentas por defecto
Agregar al seed o crear un mini-seed que inserte:
- Cuentas: USA, Argentina, CRYPTO
- Brokers: Schwab, Binance, Cocos, Balanz, AMR, IOL, IBKR, PP
