# Misión: Agente Lógica — v19 (2026-03-23)

## Objetivo
Implementar importación masiva de ejecuciones desde CSV.

## Tareas

### 1. Parser CSV cliente (`src/lib/csv-import.ts`)
Crear función `parseImportCSV(text: string): ParsedRow[]` que:
- Lee TSV/CSV con separador tab o coma (autodetectar)
- Ignora la primera fila (header)
- Parsea columnas: Exec Time, Side, Qty, Symbol, Net Price, Broker, Account
- Fecha: formato `mm/dd/yy hh:mm:ss` → objeto Date
- Qty: strip prefijo `+` o `-`, convertir a número (negativo si SELL)
- Devuelve array de `{ date, side, qty, symbol, price, broker, account, rawDate }`
- `rawDate`: string original para mostrar en preview

### 2. Server action `bulkImportExecutions` en `src/server/actions/trades.ts`
- Acepta `rows: { date: string; side: string; qty: number; symbol: string; price: number; broker: string; account: string }[]`
- Llama `ensureDataLoaded()`
- Usa `Promise.all` para crear todas las executions en DB
- Actualiza memoria
- Llama `resetMemoryState()` al final para forzar recarga en próximas requests
- Retorna `{ imported: number, errors: string[] }`

## Tipos de salida
```typescript
export interface ParsedRow {
  rawDate: string;
  date: Date;
  side: 'BUY' | 'SELL';
  qty: number;
  symbol: string;
  price: number;
  broker: string;
  account: string;
  error?: string;
}
```
