# Starter Kit Fullstack (Next.js + TypeScript + PostgreSQL)

Plantilla base para arrancar un proyecto fullstack con foco en velocidad, calidad y mantenibilidad.

## Stack
- Next.js (App Router)
- TypeScript estricto
- PostgreSQL + Prisma
- Zod para validación
- Vitest (unit/integration) + Playwright (e2e)
- ESLint + Prettier + CI en GitHub Actions

## Arquitectura
- Modelo SaaS

## 1) Requisitos
- Node.js 22 (ver `.nvmrc`)




## 3) Scripts de calidad
```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 4) Flujo de trabajo recomendado
- Crear branch por feature.
- Implementar por slices verticales (UI + API + DB).
- No cerrar tarea sin pasar `lint + typecheck + test + build`.
- Registrar aprendizaje en `tasks/lessons.md` solo si hubo error repetible.

## 5) Estructura
```text
starter-kit/
  src/
    app/
    lib/
    server/
  prisma/
  docs/
    adr/
  tasks/
  .github/workflows/
```

## Guardrails
- Reglas aplicadas por ESLint: docs/guardrails.md

