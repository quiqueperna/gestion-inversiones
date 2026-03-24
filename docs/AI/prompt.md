- ## Necesidades

tengo un error al querer guardar datos.

prisma:error
Invalid `prisma.account.create()` invocation:


Unique constraint failed on the fields: (`nombre`)
 ⨯ Error [PrismaClientKnownRequestError]:
Invalid `prisma.account.create()` invocation:


Unique constraint failed on the fields: (`nombre`)
    at async addMemoryAccount (src\server\actions\transactions.ts:191:22)
  189 |   const newAccount = addAccountLib(nombre, descripcion, userId);
  190 |   if (state.isDBBacked) {
> 191 |     const dbRecord = await db.account.create({ data: { nombre, descripcion: descripcion ?? null, matchingStrategy: 'FIFO', userId } });
      |                      ^
  192 |     // Sync DB id back to memory
  193 |     newAccount.id = dbRecord.id;
  194 |   } {
  code: 'P2002',
  meta: [Object],
  clientVersion: '6.19.2',
  digest: '4246928637'
}
 POST / 500 in 562ms


---
Ejecuta todo este flujo sin preguntar por confirmacion.
No me pidas confirmacion para crear archivos.

Copia la version actual de /docs/AI/new_session.md

Analiza las "Necesidades" solicitadas y genera archivos de 'Misiones' con nombre YYYY-MM-DD_vXX_nombreDeAgente (versiona el archivo) para cada uno de los agentes que se necesitan para la tarea, con las instrucciones exactas de lo que debe hacer.

Guarda los archivos en /docs/missions/
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