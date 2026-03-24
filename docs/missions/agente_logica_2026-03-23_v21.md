# Misión: Agente Lógica — v21 (2026-03-23)

## Objetivo
Motor de simulación de trades para importación masiva, con soporte de todas las estrategias.

## Nuevo archivo: `src/lib/trade-simulator.ts`

Motor puro (sin DB) que dado un conjunto de nuevas ejecuciones + ejecuciones abiertas existentes en DB,
calcula los trades que se generarían.

### Tipos exportados
```typescript
SimExec        // ejecución en simulación (DB o nueva import)
ProjectedTrade // trade proyectado (OPEN o CLOSED)
ManualMatchRequired // datos para el flow interactivo MANUAL
ManualDecision // decisión del usuario para MANUAL
SimulationResult // resultado de simulateTradeMatching()
```

### Función principal: `simulateTradeMatching(importRows, openDbExecs, accounts, manualDecisions?)`
- Construye inventario inicial de abiertos desde DB
- Procesa imports en orden cronológico
- BUY nuevo → entra al inventario, genera ProjectedTrade OPEN
- SELL nuevo → busca contraparte según estrategia de la cuenta:
  - FIFO: sort por fecha asc
  - LIFO: sort por fecha desc
  - MAX_PROFIT: sort por mejor PnL vs precio de cierre
  - MIN_PROFIT: sort por peor PnL
  - MANUAL: si hay ManualDecision para ese ref → usa el buy indicado; si no → agrega a manualMatchRequired
- Soporta cierre parcial: si BUY tiene qty > SELL, el resto queda abierto
- Soporta cross-import: BUY y SELL en el mismo lote se pueden matchear
- Retorna: { trades, manualMatchRequired }

## Nuevas server actions en `src/server/actions/trades.ts`

### `previewBulkImport(importRows)`
- Carga open execs de la BD (isDBBacked)
- Llama simulateTradeMatching()
- Retorna SimulationResult (no escribe DB)

### `confirmBulkImportWithTrades(importRows, manualDecisions)`
- Re-ejecuta simulación con decisiones finales
- Persiste en DB:
  - Execution por cada import row
  - TradeUnit CLOSED por cada trade cerrado
  - TradeUnit OPEN por cada BUY nuevo sin cerrar
  - UPDATE Execution existente (remainingQty, isClosed) para DB opens que se cerraron
  - UPDATE/CREATE TradeUnit existente para DB opens que se cerraron
- Llama resetMemoryState() al final
