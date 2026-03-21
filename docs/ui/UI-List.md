# Especificaciones de Diseño: Tabla o Listados

## 1. Estética y Estilo General (Look & Feel)
* **Tema:** Heredadas del modo del sistema
* **Tipografía:** Sans-serif (tipo Inter o Roboto), con uso de negritas para jerarquizar ítems principales.
* **Accents:** High-contrast semantic colors (Blue, Emerald, Orange, Purple) for metrics and status indicators.
* **Corners:** Consistent border-radius of `8px` for containers and `6px` for interactive elements.


# Especificación de Layout y Estructura de UI de los listados (Dark Mode Dashboard)

## 2. Arquitectura de la Información (Distribución Vertical)
La interfaz se divide en tres bloques horizontales principales:

### Bloque Superior: Tarjetas de Métricas (Métricas de Resumen)
* **Estructura:** Grid de N columnas de igual ancho.
* **Elementos por Tarjeta:** * Borde superior con color distintivo (Azul, Verde, Naranja, Púrpura).
    * Título en la esquina superior izquierda (Pequeño, Uppercase, 11px).
    * Valor numérico principal debajo (Grande, Bold, 20px).
    * Subtexto opcional debajo del valor para contexto adicional.

### Bloque Medio: Barra de Controles, Filtros y Navegación (Header)

## 2. Barra de Filtros
* **Fila de Filtros Temporales:** Contenedor Flex con botones tipo "Pill" (píldora). Con titulo + Icono "Período".
* **Selector de Periodo:** Fila de botones tipo "Chips" con estados *Toggle*. 
    * Opciones: `Hoy`, `Esta semana`, `Últ. 7 días`, `Este mes (Activo)`, `Mes anterior`, `Este año`, `Todo`, `Personalizado`.
    * El botón activo debe resaltar con fondo vibrante.
    * Si se activa el estado "Personalizado" debe mostrar debajo 2 calendarios para poder elegir un rango de búsqueda con un boton sin texto con Icono "aplicar".
* **Barra de Búsqueda:** Ubicado debajo del selector de periodo. Input de ancho completo (Full-width) con ícono de lupa y placeholder "Buscar..." alineado a la izquierda.. 


### Bloque Inferior: Tabla de Datos de Alta Densidad
* **Header de Metadatos:** Fila delgada que indica el conteo de registros (ej. "34 REGISTROS") y opciones de paginación/columnas a la derecha.
* **Paginación/Vista:** Selector de cantidad de filas a mostrar (`25`, `50 (Activo)`, `100`, `Todos`).
* **Componentes Funcionales:** Los botones "Columnas" y "Personalizar son componentes funcionales
   1. Implementar lógica de interacción para el boton "Personalizado". Debe abrir un sub-menú desde el boton para seleccionar rango de fechas. 
   2. Implementar lógica de interacción para el boton "Columnas". Debe abrir un sub-menú desde el boton para la gestión de columnas .
   3. Mantén consistencia visual absoluta entre todos los desplegables.
   4. Ambos botones deben tener fondo sólido y opaco (Zinc-900).
   5. Añadir lógica para que el selector de fechas actualice el rango y filtrando la tabla inmediatamente.


* **Tabla Principal:** La tabla es una grilla de datos
* **Cabeceras:** Texto ultra-compacto (10px), en mayúsculas y color atenuado con cabeceras ordenables (flechas `↕`). Si se presiona se debe ordenar el listado ascendente o descendente.

 * **Celdas:** Alineación estricta de columnas, para texto se alinea a la izquieda, numeros se alinean a la derecha, fechas se alinean centradas.
   

## * ** Columna: **
**ACCIONES:** Columna de más a la derecha de utilidad con tres íconos de acción:
    * `Mostrar` (Lupa)
    * `Editar` (Lápiz)
    * `Eliminar` (Papelera)

## Comportamiento (UX)
* **Hover State:** Las filas deben resaltar sutilmente al pasar el cursor.
* **Sortable:** Las cabeceras deben permitir el ordenamiento ascendente/descendente.


    
## 3. Estilo y Espaciado (Design Tokens)
* **Densidad:** "High Density". Espaciado vertical mínimo en filas (Padding-y: 4px)

## 4. Estructura del Data Grid (Tabla)


