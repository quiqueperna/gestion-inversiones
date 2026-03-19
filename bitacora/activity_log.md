# Bitácora de Acciones

## 18 de Marzo, 2026
- **Estética Dark Mode & Glassmorphism**: Se implementó una estética moderna basada en el archivo `UI.md`. Se configuró Tailwind con modo oscuro por clase y se crearon utilidades de cristal (`glass-card`, `glass-input`).
- **Arquitectura de UI (Listados)**: Se estructuró la página principal en tres bloques (Métricas, Filtros, Tabla) siguiendo `UI-List.md`.
- **Funcionalidad de Filtros**:
    - Se implementó la lógica interactiva del botón **Personalizado** mediante un Popover que permite filtrar la tabla por rango de fechas real.
    - Se añadió filtrado por texto (Símbolo) y periodos predefinidos (Hoy, Semana, etc.) usando `useMemo` para alto rendimiento.
- **Gestión de Columnas**:
    - Se creó un Popover funcional que permite ocultar/mostrar columnas dinámicamente, reconstruyendo la tabla en tiempo real.
- **Consistencia Visual**: Se ajustaron opacidades y fondos (`bg-zinc-900`) para asegurar que todos los elementos desplegables sean coherentes y legibles.
- **Corrección de Errores de Consola**: Se eliminó el warning de React sobre el atributo `selected` en elementos `<select>`, reemplazándolo por `defaultValue`.
