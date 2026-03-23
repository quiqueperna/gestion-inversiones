# Arquitectura base

## Arquitectura
- Modelo SaaS

## Objetivo
Entregar features de negocio en ciclos cortos, sin deuda crítica acumulada.

## Capas
- `src/app`: UI, rutas y handlers HTTP.
- `src/lib`: utilidades puras (sin side effects de infraestructura).
- `src/server`: acceso a base de datos e integraciones externas.
- `prisma`: modelo de datos y migraciones.
- `docs`: documentación del proyecto.
- `docs/UI`: documentación de la UI.
