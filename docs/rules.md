# Guardrails (enforced)

Estas reglas existen para mantener velocidad y evitar deuda estructural.

## 1) UI no toca DB
- Scope: `src/app/**`
- Prohibido importar: `@prisma/client`, `@/server/**`
- Motivo: la UI debe depender de contratos (API/casos de uso), no de infraestructura.

## 2) `lib` es puro
- Scope: `src/lib/**`
- Prohibido importar: `@prisma/client`, `@/server/**`
- Motivo: utilidades reusables y testeables sin side effects.

## Como se valida
- ESLint lo hace fallar cuando rompes una regla.
- CI ejecuta `npm run lint`.
