## Idioma
- Toda la información se debe mostrar en español.
- La UI debe estar internacionalizada y se debe poder configurar el idioma en la pantalla de configuraciones.


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


## Reglas de Arquitectura
- Validar entradas con Zod en borde de API.
- No acceder DB desde componentes de UI.
- Un caso de uso por módulo en capa server cuando crezca el dominio.
- Feature flags para cambios de alto riesgo.

    ### Calidad mínima de merge
    - Lint, typecheck, tests y build en verde.
    - PR con alcance acotado y rollback claro.