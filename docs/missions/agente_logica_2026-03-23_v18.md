# Misión: Agente Lógica y API — v18 (2026-03-23)

## Objetivo
Renombrar todas las referencias a `Cuenta`/`cuenta`/`cuentas` en la capa de lógica y server actions.

## Dependencia
Requiere que Agente Infra haya actualizado el schema y generado el cliente Prisma.

## Tareas

### `src/lib/data-loader.ts`
- `export interface Cuenta` → `export interface Account`
- `CashFlow.cuenta?` → `CashFlow.account?`
- `memoryState.cuentas: [] as Cuenta[]` → `accounts: [] as Account[]`
- `initializeFromDB` param `cuentas?` → `accounts?`, campo `cuenta` en cashFlows → `account`
- `initializeMemoryState`: `cuentas:` key → `accounts:`, `defaultCuentas` → `defaultAccounts`
- `getCuentas()` → `getAccounts()`
- `addCuenta()` → `addAccount()`
- `updateCuenta()` → `updateAccount()`
- `removeCuenta()` → `removeAccount()`
- `updateCuentaStrategy()` → `updateAccountStrategy()`

### `src/server/actions/transactions.ts`
- Import: `getCuentas as getCuentasLib` → `getAccounts as getAccountsLib`, etc.
- Import `Cuenta` → `Account`
- `db.cuenta.*` → `db.account.*`
- `cashFlow.cuenta` → `cashFlow.account` (todos los lugares)
- Exports: `getMemoryCuentas` → `getMemoryAccounts`
- Exports: `addMemoryCuenta` → `addMemoryAccount`
- Exports: `removeMemoryCuenta` → `removeMemoryAccount`
- Exports: `updateMemoryCuenta` → `updateMemoryAccount`
- Exports: `updateCuentaMatchingStrategy` → `updateAccountMatchingStrategy`

### `src/server/actions/dashboard.ts` y `trades.ts`
- Renombrar `cuentas` en `initializeFromDB` call si aplica
- Renombrar `db.cuenta.*` → `db.account.*` si aplica

### Tests
- `src/server/actions/__tests__/trades.test.ts`
- `src/server/actions/__tests__/dashboard.test.ts`
- Actualizar imports y referencias

## Reglas aplicables
- `isDBBacked` flag antes de cualquier mutation
- `Promise<unknown>[]` + `Promise.all()` para batch DB (no `db.$transaction` con array acumulado)
- Un solo punto de inicialización consistente en todas las server actions
