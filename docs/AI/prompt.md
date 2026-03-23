- ## Necesidades

renombra la tabla cuenta a account y las logica de programacion y entidades.

---
Ejecuta todo este flujo sin preguntar por confirmacion.
No me pidas confirmacion para crear archivos.

Copia la version actual de /docs/AI/new_session.md

Analiza las "Necesidades" solicitadas y genera archivos de 'Misiones' con nombre agente_YYYY-MM-DD_vXX (versiona el archivo) para cada uno de los agentes que se necesitan para la tarea, con las instrucciones exactas de lo que debe hacer.

Guarda los archivos en /docs/misions/
Una vez que terminas de generar los archivos de misiones, lee los archivos de misiones generados recientemente y empieza a implementar las funcionalidad definida.

REGLA CRÍTICA DE SALIDA: No imprimas el código fuente en la terminal al cliente. Solo detente si hay un error crítico. Ejecuta todo de forma autónoma.

Cuando terminas la implementación actualiza el documento de /docs/features/features-YYYY-MM-DD_vXX.md (versiona el archivo) con todas las funcionalidades implementadas en la interacción, especificando Fecha, hora y versión y descripciones. 

Si te quedaron cosas pendientes guardalas en /bitacora/pending-tasks/pending-task-YYYY-MM-DD_vXX.md (versiona el archivo) especificando Fecha, hora y versión y descripciones.

Sube uno a la version actual y actualizala en el archivo /docs/AI/new_session.md

Escribe un archivo en /bitacora/prompts con las necesidades que te pedi tipo bitácora, con este formato:

## 22 de Marzo, 2026 — Sesión v11

### Prompt 1
> "TEXTO DE LAS NECESIDADES"

**Resultado:** 

Escribe un archivo en /bitacora/lessons-learned.md tipo bitácora que diga si tuviste errores y qué aprendiste de ellos.  