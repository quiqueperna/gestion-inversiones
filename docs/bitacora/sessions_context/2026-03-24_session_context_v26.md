# Contexto de Sesión - Gestión de Inversiones

## 24 de Marzo, 2026 — Estado actual tras sesión v26 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Prisma** con Supabase local (PostgreSQL)
- **Supabase SSR** (`@supabase/ssr ^0.9`) para autenticación
- **Vitest** para tests (42 tests)

### Autenticación
- Login/signup con email+contraseña y Google OAuth (`/login`)
- Middleware protege todas las rutas privadas → redirige a `/login` si no hay sesión
- Callback OAuth: `/auth/callback`
- Logout: botón "Salir" en navbar (llama Server Action `logout()`)

### Aislamiento de datos por usuario
- **Todos los modelos Prisma tienen `userId`**: Execution, TradeUnit, CashFlow, Account, Broker
- **memoryState per-usuario**: `Map<userId, MemState>` en `data-loader.ts` (key `'_test_'` para tests)
- **Queries filtradas**: todas las queries DB usan `where: { userId }`
- **Writes con userId**: todos los `db.*.create()` incluyen `userId`
- Helper: `src/server/actions/get-user.ts` → `getCurrentUserId()`

### Terminología actual
| Término | Descripción |
|---|---|
| Execution | Una compra o venta individual (BUY/SELL) |
| TradeUnit | Par apertura-cierre (el "trade" completo) |
| CashFlow | Depósito o retiro de fondos |
| Account | Cuenta de inversión (ej: "USA", "Argentina") |
| Broker | Intermediario (ej: "IBKR", "IOL") |

### Navegación (View)
`dashboard` | `analytics` | `transactions` | `trade-units` | `cuentas` | `brokers` | `nueva-trans` | `ie` | `movimientos` | `configuraciones` | `importar-csv`

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Auth email/password + Google OAuth | ✅ |
| Protección de rutas (middleware) | ✅ |
| Aislamiento de datos por userId | ✅ |
| Dashboard con métricas y gráficos | ✅ |
| CRUD Ejecuciones | ✅ |
| TradeUnits (FIFO/LIFO/MAX_PROFIT/MIN_PROFIT/MANUAL) | ✅ |
| Importación masiva CSV con simulación de trades | ✅ |
| CashFlow (depósitos/retiros) | ✅ |
| CRUD Cuentas y Brokers | ✅ |
| Cierre manual de trades | ✅ |
| Exportación CSV | ✅ |
| Precios en tiempo real (open positions) | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/app/page.tsx` | App principal (SPA, ~900 líneas) |
| `src/app/login/page.tsx` | Formulario de login/signup + Google |
| `src/app/auth/callback/route.ts` | Handler OAuth callback |
| `src/middleware.ts` | Protección de rutas + refresco de sesión |
| `src/server/actions/auth.ts` | login, signup, logout, loginWithGoogle |
| `src/server/actions/get-user.ts` | getCurrentUserId() |
| `src/server/actions/trades.ts` | Ejecuciones, TradeUnits, Bulk Import |
| `src/server/actions/transactions.ts` | CashFlow, Accounts, Brokers |
| `src/server/actions/dashboard.ts` | Métricas, yields, equity curve |
| `src/lib/data-loader.ts` | memoryState Map<userId, MemState> |
| `src/lib/trade-simulator.ts` | Motor de simulación FIFO/LIFO/etc |
| `src/lib/csv-import.ts` | Parser CSV cliente |
| `src/utils/supabase/server.ts` | Cliente Supabase SSR server |
| `src/utils/supabase/client.ts` | Cliente Supabase browser |
| `prisma/schema.prisma` | Schema con userId en todos los modelos |

### Para arrancar una nueva sesión
```bash
supabase start
taskkill /IM node.exe /F
npx prisma generate   # si no se ejecutó aún (DLL bloqueado en Windows)
npm run dev
npx tsc --noEmit      # debe dar 0 errores
npm run test          # debe dar 42 tests passing
```

### Configuración requerida en Supabase Dashboard (manual, una vez)
1. Authentication > Providers > Google → habilitar con Client ID y Secret
2. Authentication > URL Configuration → agregar `http://localhost:3000/auth/callback`

### Pendientes para próxima sesión
| Prioridad | Tarea |
|---|---|
| P3 | Sidebar lateral de navegación |
