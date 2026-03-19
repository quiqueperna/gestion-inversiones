# Lecciones aprendidas

- **Fecha:** 18 de Marzo, 2026 (Sesión de Implementación Completa)
- **Contexto:** Finalización del sistema de gestión de inversiones (CRUD, Dashboard, Pegado Rápido).
- **Error observado:** Errores de sintaxis y truncamientos (`...`) al usar herramientas de edición automática de archivos.
- **Causa raíz:** Copiar fragmentos de código con placeholders de elipsis (`...`) que el compilador de TypeScript/Next.js interpreta como errores de sintaxis reales.
- **Señal temprana que ignoramos:** El output de la herramienta de edición mostraba los `...` en el código resultante, lo cual es inválido en archivos `.tsx`.
- **Regla preventiva:** Al reescribir archivos críticos o componentes grandes, se debe proveer el **contenido íntegro** y verificar que no existan placeholders de omisión manuales. El uso de sub-agentes especializados (`generalist`) puede ayudar a reconstruir archivos completos sin errores de truncamiento.
- **Acción concreta aplicada:** Se reconstruyeron los archivos `src/app/page.tsx`, `src/components/trades/TradeForm.tsx` y `src/lib/calculations.ts` usando el contenido completo.

---

- **Fecha:** 18 de Marzo, 2026 (Sesión de Implementación Completa)
- **Contexto:** Fallo en el build de producción por directivas de servidor.
- **Error observado:** `Error: You're importing a component that needs "revalidatePath". That only works in a Server Component...`
- **Causa raíz:** Las Server Actions llamadas desde Client Components requieren explícitamente la directiva `"use server"` al inicio del archivo, especialmente si usan funciones de caché de Next.js como `revalidatePath`.
- **Señal temprana que ignoramos:** El linter no siempre detecta la falta de `"use server"` si el archivo solo contiene funciones exportadas, pero el build de Next.js sí lo hace al intentar empaquetar para el cliente.
- **Regla preventiva:** Todo archivo en `src/server/actions/**` **debe** comenzar con la directiva `"use server"` por convención, para evitar fugas de lógica del servidor al cliente y fallos de compilación.
- **Acción concreta aplicada:** Se añadió `"use server"` a todos los archivos de Server Actions.

---

- **Fecha:** 18 de Marzo, 2026 (Sesión de Implementación Completa)
- **Contexto:** Uso de comandos de terminal en entorno Windows (PowerShell).
- **Error observado:** Errores de sintaxis al usar `&&` para concatenar comandos.
- **Causa raíz:** PowerShell no soporta `&&` para encadenar comandos de la misma forma que Bash/Zsh; utiliza `;`.
- **Regla preventiva:** En entornos Windows, preferir ejecutar comandos uno por uno o usar `;` como separador si es estrictamente necesario concatenar en una sola línea.
- **Acción concreta aplicada:** Se separaron las ejecuciones de `lint`, `typecheck` y `build`.

---

- **Fecha:** 18 de Marzo, 2026 (Sesión de Estética)
- **Contexto:** Implementación de estética Dark Mode y componentes interactivos (Popovers).
- **Error observado:** Inconsistencia en la transparencia de los desplegables.
- **Causa raíz:** Falta de capas base sólidas (`bg-zinc-900`) en el contenedor del Popover. 
- **Regla preventiva:** Todos los elementos de UI de nivel superior (Modales, Popovers, Tooltips) deben tener un color de fondo sólido o semi-sólido definido explícitamente (`bg-zinc-900` o similar).
- **Acción concreta aplicada:** Se igualó la estructura de clases de todos los Popovers.
