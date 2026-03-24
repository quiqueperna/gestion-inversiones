# Agente 1 — Infraestructura y DB
**Sesión:** v24 | **Fecha:** 2026-03-24

## Objetivo
Verificar y completar la configuración de clientes Supabase SSR para autenticación.

## Estado previo
- `src/utils/supabase/server.ts` — ✅ ya implementado con `createServerClient`
- `src/utils/supabase/client.ts` — ✅ ya implementado con `createBrowserClient`

## Tareas
1. Confirmar que `@supabase/ssr` está instalado.
2. Documentar las variables de entorno requeridas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Verificar que el cliente server maneja correctamente el ciclo de cookies SSR.
4. Habilitar Google OAuth en Supabase Dashboard (instrucción al usuario).

## Reglas
- No importar `@prisma/client` desde `src/utils/`.
- Clientes son utilitarios puros (sin side effects).

## Dependencias
Ninguna. Puede ejecutarse primero.
