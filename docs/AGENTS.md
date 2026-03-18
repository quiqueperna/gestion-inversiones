# AGENTS.md (operativo)

## 1. Planificación mínima efectiva
- Entrar en modo planificación si la tarea tiene 3 o más pasos, dependencia externa o decisión de arquitectura.
- Limitar cada plan a 5-10 pasos.
- Replanificar de inmediato si falla un supuesto clave.

## 2. Uso de agentes
- Delegar a subagentes: investigación, comparación de opciones, borradores de documentación.
- Mantener la ejecución final y validación en el agente principal.
- No dividir una tarea simple en múltiples subagentes.

## 3. Regla de verificación
- No cerrar una tarea sin evidencia ejecutable.
- Checklist obligatorio por PR: lint, typecheck, tests, build.
- Si aplica, mostrar prueba manual reproducible (pasos + resultado).

## 4. Lecciones aprendidas
- Registrar en `tasks/lessons.md` solo errores repetibles o de alto impacto.
- Cada lección debe incluir: causa raíz, señal temprana, regla preventiva.

## 5. Criterio de elegancia
- Primero: solución correcta y simple.
- Después: refactor si hay duplicación, complejidad accidental o deuda clara.
- Evitar sobre-diseño en bugs de baja complejidad.

## 6. Principios de cambio
- Impacto mínimo: tocar lo estrictamente necesario.
- Causa raíz antes que parche temporal.
- Cambios pequeños, medibles y reversibles.
