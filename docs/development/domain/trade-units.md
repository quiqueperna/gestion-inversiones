# ESPECIFICACIÓN TÉCNICA: MOTOR DE GESTIÓN MULTI-ACCOUNT "TRADE UNITS"

## 1. FILOSOFÍA DEL SISTEMA
El sistema permite la gestión de activos en múltiples entornos (Brokers) y su agrupación en carteras estratégicas (Accounts). El objetivo es evitar la consolidación automática de posiciones, permitiendo que un mismo activo (ej. AAPL) tenga ciclos de vida independientes según la cuenta y brokers a la que se asigne, facilitando estrategias de cobertura (hedging) y segmentación de plazos (Inversión vs. Trading).

---

## 2. ARQUITECTURA DE NIVELES (JERARQUÍA)

1. **Broker (Entorno de Ejecución):** Entidad financiera donde se realiza la operación (ej: TD Ameritrade, Balanz). Define el origen de los datos.
2. **Account (Contenedor Estratégico):** Agrupación lógica definida por el usuario (ej: "Cuenta USA", "Retiro Largo Plazo"). 
   - **Regla de Aislamiento:** Una `Execution` solo puede afectar a `Trade Units` dentro de su misma `Account` y `broker`.
3. **Trade Unit (Lote Inmutable):** La unidad mínima de tracking de rendimiento dentro de una cuenta.

---

## 3. MODELO DE DATOS (ENTIDADES)

### A. Execution (Transacción)
- `execution_id`: UUID único (Generado por tu sistema).
- `broker_id`: ID del Broker de origen.
- `account_id`: ID de la Cuenta asignada.
- `symbol`: Ticker del activo.
- `side`: `BUY` o `SELL`.
- `qty`: Cantidad ejecutada.
- `price`: Precio de ejecución (sin comisiones).
- `currency`: Moneda de la transacción (USD, ARS, etc.).
- `exchange_rate`: Tipo de cambio respecto a la moneda base del sistema (si aplica).
- `commissions`: Costo total de la operación (fees + impuestos).
- `timestamp`: Fecha y hora exacta de la ejecución.

### B. Trade Unit (Lote de Gestión)
- `unit_id`: UUID único.
- `account_id`: **Filtro primario de vinculación**.
- `broker_id`: ID del Broker de origen.
- `symbol`: Ticker asociado.
- `side`: `BUY` o `SELL`.
- `status`: `OPEN` o `CLOSED`.
- `qty`: Cantidad inmutable (sujeta a fraccionamiento).

**Atributos de Ciclo de Vida:**
- `entry_exec_id` / `entry_price` / `entry_date`: Datos de apertura.
- `exit_exec_id` / `exit_price` / `exit_date`: Datos de cierre (se completan al liquidar).

**Métricas Calculadas:**
- `entry_amount`: monto total de la inversión inicial (qty del entry_exec * entry_price).
- `exit_amount`: monto total de la inversión al cierre (qty del exit_exec * exit_price).
- `pnl_nominal`: Beneficio/Pérdida en moneda.
- `pnl_percentage`: Rendimiento porcentual.
- `duration`: días transcurridos entre la fecha de entrada y la fecha de salida.
* `TNA`: Tasa Nominal Anual de la inversión.

---

## 4. LÓGICA DEL MOTOR DE VINCULACIÓN (MATCHING ENGINE)

### I. Aislamiento por Cuenta
El motor de vinculación debe filtrar obligatoriamente por `account_id` y `broker_id`. 
- Una venta en la "Cuenta A" y "Broker 1" **no puede** cerrar una compra en la "Cuenta A" y "Broker 2", ni tampoco una compra de la "Cuenta B" aunque sea el mismo `symbol`. Esto permite mantener posiciones opuestas simultáneas en diferentes carteras y brokers.

### II. Reglas de Asignación (Configurables por Cuenta)
1. **FIFO:** Cierra la unidad más antigua de la cuenta.
2. **LIFO:** Cierra la unidad más reciente de la cuenta.
3. **Max Profit:** Cierra la unidad con mayor ganancia porcentual actual.
4. **Min Profit:** Cierra la unidad con peor rendimiento actual.
5. **Manual Match:** El usuario vincula manualmente la ejecución a una `unit_id` específica de esa cuenta.

### III. Modelo de Fraccionamiento (Splitting)
Si una ejecución de cierre es parcial respecto a la `Trade Unit` seleccionada:
- La unidad original se marca como `CLOSED` con la cantidad macheada.
- Se genera una **nueva Trade Unit (Remainder)** con el sobrante, que hereda los datos de apertura (`entry_price`, `entry_date`) y permanece `OPEN`.

### IV. Reversión de Posición (Position Flip)
Si la cantidad de cierre supera las unidades abiertas de esa cuenta:
- Se liquidan las unidades existentes.
- El excedente genera una **nueva Trade Unit** de signo opuesto dentro de la misma cuenta.

---

## 5. VISUALIZACIÓN Y UX

1. **Vista Global:** Sumatoria de todas las `Trade Units` abiertas de todos los brokers y cuentas.
2. **Vista por Cuenta (Portfolio View):** Rendimiento segregado por estrategia.
3. **Vista por Broker:** Inventario real para conciliación con el extracto bancario.
4. **Check "Group by Symbol":** Colapso visual de unidades para ver posición neta y precio promedio por cuenta o global.

### A. Vista Desagregada (Trade Units View)
Muestra una lista donde cada fila es una `Trade Unit` separada sin ningun tipo de agrupamiento. 
Permite ver el rendimiento individual de cada entrada. Es la vista para el análisis de precisión.

### B. Vista Agregada (Check "Group by Symbol" o "by Symbol y by account" o "by Symbol y by broker" o "by Symbol y broker y account" con checks multiseleccion)
Colapsa visualmente las unidades del mismo símbolo.
- **Posición Neta:** Suma de `qty` de las unidades `OPEN`.
- **Precio Promedio:** Promedio ponderado de las entradas para referencia visual contra el broker.

---
