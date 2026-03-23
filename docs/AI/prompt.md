- ## Necesidades

Contexto: Quiero migrar a Supabase y desplegar en Vercel (Serverless).

Objetivo: Necesito un plan de migración técnica y el código base para adaptar mi arquitectura actual a un entorno Serverless sin romper la lógica de negocio ni el tipado estricto.

Instrucciones Técnicas Obligatorias:

Data Layer (Prisma + Supabase): Configura el schema.prisma para usar el Connection Pooling de Supabase (puerto 6543 en modo Transaction) para evitar el agotamiento de conexiones en las Lambdas de Vercel.

Auth Integration: Sustituye el sistema de autenticación actual por @supabase/ssr. Crea el middleware.ts para el manejo de sesiones en App Router y la utilidad utils/supabase/server.ts y client.ts.

Types & Validation: Mantén la integración de Zod para validación de entrada. Asegúrate de que los tipos generados por Prisma sigan siendo compatibles con los schemas de Zod existentes.

Infraestructura Serverless: Configura las variables de entorno necesarias para Vercel (POSTGRES_PRISMA_URL para pooling y POSTGRES_URL_NON_POOLING para migraciones).

Testing Preservation: Ajusta la configuración de Vitest y Playwright para que utilicen un entorno de pruebas (mocking de Supabase Auth o uso de Supabase Local CLI). No quiero perder la cobertura de tests actual.

CI/CD: Actualiza el workflow de GitHub Actions para que incluya la generación del cliente de Prisma y la validación de tipos antes del despliegue en Vercel.

Formato de Respuesta:

Primero, un Checklist paso a paso de los cambios en los archivos.

Segundo, el código para el Middleware y el Singleton de Prisma optimizado para Serverless.

Tercero, un ejemplo de un Server Action migrado que use la sesión de Supabase y Prisma simultáneamente.

Restricción: No modifiques los componentes de la UI ni la lógica interna de las funciones de negocio, solo la capa de acceso a datos y autenticación.

El Singleton de Prisma: En Vercel, es vital que tu cliente de Prisma esté en un archivo separado (ej. lib/db.ts) para que no se instancien múltiples clientes en desarrollo, lo cual saturaría a Supabase rápido.


---
Ejecuta todo este flujo sin preguntar por confirmacion.

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