# Bitácora de Acciones

## 18 de Marzo, 2026 (Segunda Sesión)
- **Infraestructura de Datos**: Se actualizó `prisma/schema.prisma` con el modelo `Trade`, incluyendo campos financieros (entryPrice, exitPrice, etc.) e índices para optimización de consultas.
- **Backend (Server Actions)**: 
    - Se implementó un CRUD completo en `src/server/actions/trades.ts` para la gestión de operaciones.
    - Se creó la lógica de agregación en `src/server/actions/dashboard.ts` para generar el reporte de rendimientos mensuales por cuenta.
- **Cálculos Financieros**: Se actualizó `src/lib/calculations.ts` para calcular automáticamente montos, retornos, días de operación y TNA, con soporte para operaciones abiertas usando precios actuales simulados.
- **Formulario Avanzado**: Se desarrolló `src/components/trades/TradeForm.tsx` con soporte para validación Zod (`react-hook-form`), gestión de estados (Abierta/Cerrada) y un **Modo de Pegado Rápido** que parsea strings de operaciones.
- **Dashboard de Rendimientos**: Se implementó `src/components/dashboard/YieldsGrid.tsx`, una grilla de alta densidad que muestra PL USD, PL % y conteo de trades por mes y cuenta, con totales automáticos.
- **Integración y UI**: 
    - Se rediseñó `src/app/page.tsx` para integrar las nuevas Server Actions y componentes.
    - Se añadió un conmutador de vistas (Listado / Dashboard) con animaciones de transición.
    - Se refinó la tabla de alta densidad cumpliendo estrictamente con los tokens de diseño de `UI.md` y `UI-List.md`.
- **Calidad de Código**: Se resolvieron múltiples errores de compilación y linting relacionados con tipos `any`, variables no utilizadas y directivas de Server Components (`use server`).

## 18 de Marzo, 2026 (Primera Sesión)
- **Estética Dark Mode & Glassmorphism**: Se implementó una estética moderna basada en el archivo `UI.md`. Se configuró Tailwind con modo oscuro por clase y se crearon utilidades de cristal (`glass-card`, `glass-input`).
- **Arquitectura de UI (Listados)**: Se estructuró la página principal en tres bloques (Métricas, Filtros, Tabla) siguiendo `UI-List.md`.
- **Funcionalidad de Filtros**:
    - Se implementó la lógica interactiva del botón **Personalizado** mediante un Popover que permite filtrar la tabla por rango de fechas real.
    - Se añadió filtrado por texto (Símbolo) y periodos predefinidos (Hoy, Semana, etc.) usando `useMemo` para alto rendimiento.
- **Gestión de Columnas**:
    - Se creó un Popover funcional que permite ocultar/mostrar columnas dinámicamente, reconstruyendo la tabla en tiempo real.
- **Consistencia Visual**: Se ajustaron opacidades y fondos (`bg-zinc-900`) para asegurar que todos los elementos desplegables sean coherentes y legibles.
- **Corrección de Errores de Consola**: Se eliminó el warning de React sobre el atributo `selected` en elementos `<select>`, reemplazándolo por `defaultValue`.
