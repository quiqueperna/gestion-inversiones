# Agente 2 — Lógica y API
**Sesión:** v24 | **Fecha:** 2026-03-24

## Objetivo
Implementar Server Actions de autenticación y actualizar el Middleware para proteger rutas.

## Archivos a crear/modificar
1. **`src/server/actions/auth.ts`** — Server Actions: `login`, `signup`, `logout`
2. **`src/middleware.ts`** — Agregar redirección a `/login` si no hay sesión activa

## Especificaciones

### auth.ts
- `login(formData: FormData)`: `supabase.auth.signInWithPassword({ email, password })`
- `signup(formData: FormData)`: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`
- `logout()`: `supabase.auth.signOut()` + `redirect('/')`
- `loginWithGoogle()`: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
- Todas retornan errores como `{ error: string }` o hacen redirect al éxito.
- Usar `'use server'` al inicio del archivo.

### middleware.ts
- Después de `supabase.auth.getUser()`, verificar si `user` es null.
- Rutas públicas: `/login`, `/auth/callback`, archivos estáticos.
- Si no hay usuario y la ruta no es pública → `NextResponse.redirect(new URL('/login', request.url))`.

## Reglas
- No acceder a DB (Prisma) desde este módulo.
- Validar con Zod en borde si se necesita.
- Todas las functions de server actions usan `use server`.

## Dependencias
- Agente 1 debe haber completado la configuración de clientes.
