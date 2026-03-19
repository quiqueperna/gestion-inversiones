# Lecciones aprendidas

## Plantilla
- Fecha:
- Contexto:
- Error observado:
- Causa raíz:
- Señal temprana que ignoramos:
- Regla preventiva:
- Acción concreta aplicada:

## Entradas

- **Fecha:** 18 de Marzo, 2026
- **Contexto:** Implementación de estética Dark Mode y componentes interactivos (Popovers).
- **Error observado:** Inconsistencia en la transparencia de los desplegables; el de "Personalizado" se veía transparente mientras el de "Columnas" era opaco.
- **Causa raíz:** Falta de capas base sólidas (`bg-zinc-900`) en el contenedor del Popover. Al depender solo de `backdrop-blur` y transparencia de borde, el contenido debajo afectaba la legibilidad de forma desigual.
- **Señal temprana que ignoramos:** El usuario mencionó "Glassmorphism sutil", pero no definimos una "capa base de seguridad" para evitar que el ruido visual de la tabla interfiriera con los menús superiores.
- **Regla preventiva:** Todos los elementos de UI de nivel superior (Modales, Popovers, Tooltips) deben tener un color de fondo sólido o semi-sólido definido explícitamente (`bg-zinc-900` o similar) para garantizar la legibilidad, independientemente del efecto de cristal exterior.
- **Acción concreta aplicada:** Se igualó la estructura de clases de todos los Popovers usando `bg-zinc-900` y capas internas `bg-white/5` para consistencia absoluta.
