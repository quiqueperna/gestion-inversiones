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
* **Broker**: Texto que indica el broker (por defecto: `AMR`).
* **Atributos (Booleanos)**:
    * **Cerrada**: `true/false`
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

1. Cuadro de rendimientos por cuenta por mes y por año tipo grilla.
    a. Encabezados de cada cuadro, Saldo, PL en Usd, PL %, I/E (Ingresos/Extracciones)
    b. Footer con la suma de totales de cada columna.
2. Se deben ver los cuadros de todas las cuentas.    


