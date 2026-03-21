## Stack
- Next.js (App Router)
- TypeScript estricto
- PostgreSQL + Prisma
- Zod para validación
- Vitest (unit/integration) + Playwright (e2e)
- ESLint + Prettier + CI en GitHub Actions

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

## Guardrails
- Reglas aplicadas por ESLint: docs/guardrails.md

