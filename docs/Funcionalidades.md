# Funcionalidades Implementadas — Gestión de Inversiones

> Documento requerido por `docs/domain/core.md`. Última actualización: 2026-03-20.

## 1. Dashboard Principal

- Grilla de rendimientos: filas = meses, columnas = brokers + TOTAL
- Columnas por broker: PL USD, PL %, I/E (Ingresos/Extracciones)
- Footer con suma de totales por columna
- Selector de año (2023–2026)
- 4 tarjetas de resumen: Operaciones Abiertas, Trades Cerrados, Win Rate, Avg Trade Size
- Top 5 Trades por P&L $
- Mejor Mes (mes con mayor retorno acumulado)
- Mejor Trade (mayor rendimiento % individual)

## 2. Analytics — 15+ Métricas configurables por período

| Métrica | Descripción |
|---|---|
| Net Profit | Ganancia neta total en el período |
| Gross Profit / Gross Loss | Suma de ganancias y pérdidas brutas |
| Win Rate % | Porcentaje de trades positivos |
| Profit Factor | Gross Profit / Gross Loss |
| Payoff Ratio | Avg Win / Avg Loss |
| Max Drawdown $ | Caída máxima desde el pico de equity |
| Recovery Factor | Net Profit / Max Drawdown |
| Sharpe Ratio | Retorno ajustado por riesgo (anualizado) |
| Sortino Ratio | Sharpe penalizando solo retornos negativos |
| SQN | System Quality Number |
| Kelly Criterion % | Fracción óptima de capital a arriesgar |
| Avg Win / Avg Loss | Promedio de ganancia y pérdida por trade |
| Max Win / Max Loss | Trade individual más ganador y más perdedor |
| Max Win Streak / Max Loss Streak | Rachas máximas consecutivas |
| Avg Holding Time | Promedio de días de duración de un trade |
| Expectancy $ | Retorno esperado por trade |
| Rendimiento por instrumento | P&L separado por STOCK / CEDEAR / CRYPTO |
| Curva de Equity | Serie temporal del rendimiento acumulado |

## 3. Listado de Operaciones

- Todos los campos: ID, Fecha, Símbolo, Tipo (BUY/SELL), Cantidad, Precio, Monto, Broker, Estado, Falopa, Intra
- Precio de salida: real (Yahoo Finance con cache 5 min) si está abierta, precio de cierre si está cerrada
- Fecha de salida: hoy si está abierta, fecha de cierre si está cerrada
- Ordenamiento ↕ por cualquier columna
- Paginación: 25 / 50 / 100 / Todos
- Filtro rápido por período (Hoy / Semana / 7d / Mes / Mes anterior / Año / Todo / Personalizado)
- Filtro por Estado (Todas / Abiertas / Cerradas)
- Filtro por Broker (Todos / AMR / IOL / IBKR)
- Búsqueda libre por símbolo o broker
- Exportar como CSV
- Acciones: Ver detalle / Editar / Eliminar

## 4. Listado de Trades

- Todos los campos: ID, F.Entrada, F.Salida, Símbolo, Cantidad, P.Entrada, P.Salida, M.Entrada, M.Salida, Días, Rdto $, Rdto %, TNA, Broker
- Colores semánticos: verde = positivo, rojo = negativo
- Filtro por tipo de instrumento (STOCK / CEDEAR / CRYPTO)
- Mismo sistema de filtros temporales y búsqueda que Operaciones
- Exportar como CSV
- Acciones: Ver detalle / Eliminar

## 5. Posiciones Abiertas

- Operaciones BUY sin contraparte SELL
- Precio actual vía Yahoo Finance (caché de 5 min, fallback silencioso)
- P&L latente en $ y % calculado sobre precio actual
- Días transcurridos desde apertura

## 6. Alta de Operación

- Formulario completo con todos los campos requeridos
- Toggle visual BUY / SELL (verde / rojo)
- Selector de broker (AMR / IOL / IBKR / PP)
- Selector de tipo de instrumento (STOCK / CEDEAR / CRYPTO)
- Modo pegado rápido: parsea texto libre (`AAPL 10 150 BUY 2024-01-15`) o formato clave=valor
- Cierre manual: cuando hay 2+ operaciones abiertas del mismo símbolo, muestra modal de selección con rendimiento proyectado de cada opción

## 7. Ingresos / Egresos (CashFlow)

- Carga manual de depósitos y retiros por broker desde la UI
- Impacta la columna I/E del Dashboard
- Listado de movimientos (fecha, monto, tipo, broker, descripción)
- Eliminar movimiento

## 8. Datos de Demo

- CSV con 238 operaciones en rango 2024–2026
- ~110 trades cerrados + 18 posiciones abiertas
- Mix de símbolos: AAPL, TSLA, NVDA, MSFT, GOOGL, META, AMZN, MELI, GGAL, YPF, BBAR
- Brokers: IBKR, AMR, IOL
- Matching FIFO en memoria al inicio de la aplicación

## 9. Calidad y Estándares

- ESLint guardrails: UI y lib no pueden importar Prisma ni server actions directamente
- TypeScript strict mode sin errores
- Tests unitarios: calculations (5), operation-parser (8+), prices (4)
- Tests de integración: dashboard stats, closeTradeManually
- Tests E2E Playwright: dashboard, operaciones, trades
- CI GitHub Actions: lint → typecheck → test → build → e2e
