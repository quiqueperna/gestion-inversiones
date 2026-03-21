# Gestión de Inversiones

## Operaciones

Una operación es una entrada (compra/venta) de un instrumento del mercado.

### Campos de una operación:

* **ID**: número, entero, incremental comenzando de 1.
* **Fecha**: Fecha de realización de la operación.
* **Símbolo**: es el ticket del instrumento (ej: TSLA, NVDA).
* **Cantidad**: cantidad comprada (número positivo) o vendida (número negativo).
* **Precio**: precio al que se compró (si es un long) o vendió (si es un short).
* **Monto**: monto total de la inversión inicial.
* **Broker**: Texto que indica el broker (por defecto: `Schwab`).
* **Cuenta**: Texto que indica una cuenta (por defecto: `USA`).
* **Atributos (Booleanos)**:
    * **Falopa**: `true/false`
    * **Intra**: `true/false`

## Trade

Un Trade es una entrada (compra/venta) de un instrumento del mercado y el posterior cierre (venta/compra) del instrumento con la misma cantidad.
Cada vez que se entra al mercado se genera un trade, si tenemos una operacion sin contraparte el trade se mantiene abierto, cuando agregamos la contraparte (mismo simbolo, misma cantidad, operacion opuesta) el trade se cierra.

### Campos de un Trade:

* **ID**: número, entero, incremental comenzando de 1.
* **Fecha de Entrada**: Fecha de realización de la operación.
* **Símbolo**: es el ticket del instrumento (ej: TSLA, NVDA).
* **Cantidad**: cantidad comprada (número positivo) o vendida (número negativo).
* **Precio de Entrada**: precio al que se compró (si es un long) o vendió (si es un short).
* **Monto de Entrada**: monto total de la inversión inicial.
* **Precio de Salida**: precio de cierre de la operación.
* **Monto de Salida**: monto de la operación al momento del cierre.
* **Fecha de Salida**: fecha de cierre de la operación.
* **Cantidad de Días**: días transcurridos entre la fecha de entrada y la fecha de salida.
* **Rendimiento $**: Diferencia entre el monto de entrada y el monto de salida.
* **Rendimiento %**: Porcentaje de ganancia o pérdida en relación al monto invertido.
* **TNA**: Tasa Nominal Anual de la inversión.
* **Broker**: Texto que indica el broker (por defecto: `AMR`).
* **Atributos (Booleanos)**:
    * **Cerrado**: `true/false`

---

## Interfaz de Usuario de Alta de Operación

1. Hacer el **alta de una operación** mediante un formulario con dos métodos de entrada:
2. **Controles tradicionales**: Inputs, combos, datepickers, etc.
3. **Pegado de texto**: Un área de texto para procesar strings (formato a definir).
4. ** Tiene que estar todos los campos de la operación.

## Dashboard

- Grilla de rendimientos: filas = meses, columnas = cuentas + TOTAL
- Columnas por cuenta: Balance, PL USD, PL %, I/E (Ingresos/Extracciones)
- Footer con suma de totales por columna
- Selector de año (2023–2026 y todos)

## Analytics
- Tarjetas de resumen: Operaciones Abiertas, Trades Cerrados, Avg Trade Size profit  factor, win rates (de trades y de trades positivos), top 5 trades, mejor mes, mejor trades. 
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
- Selector de broker (Schwab / Binance / Cocos / Balanz)
- Selector de tipo de instrumento (STOCK / CEDEAR / CRYPTO)
- Selector de cuenta (USA / CRYPTO / Argentina)
- Modo pegado rápido: parsea texto libre (`AAPL 10 150 BUY 2024-01-15`) o formato clave=valor
- Cierre manual: cuando hay 2+ operaciones abiertas del mismo símbolo, muestra modal de selección con rendimiento proyectado de cada opción

## 7. Ingresos / Egresos (CashFlow)

- Carga manual de depósitos y retiros por broker desde la UI
- Impacta la columna I/E del Dashboard
- Listado de movimientos (fecha, monto, tipo, broker, descripción)
- Eliminar movimiento

## 8. Cuentas

- Carga manual de cuentas desde la UI
- Impacta en la matriz de rendimiento del dahsboard
  