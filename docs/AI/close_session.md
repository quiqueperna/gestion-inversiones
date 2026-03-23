# AL CIERRE DE SESIÓN - INSTRUCCIONES PARA CREAR CONTEXTO

Crea AUTOMÁTICAMENTE dos archivos:

## 1. Archivo versionado (SIEMPRE con patrón de fecha + versión)

**Versiona el archivo:** `/docs/bitacora/sessions_context/YYYY-MM-DD_session_context_vXX.md`

**Contenido requerido:**
```markdown
# Contexto de Sesión - Gestión de Inversiones

## [HOY] — Estado actual tras sesión vXX (referencia para próxima sesión)

### Stack
- [Tu stack actual]

### Navegación (View type)
- [Rutas actuales]

### Terminología actual
- [Entidades principales]

### Qué funciona hoy
- [Tabla de features]

### Archivos clave
- [Tabla de archivos principales]

### Para arrancar una nueva sesión
- [Comandos setup]

### Pendientes para próxima sesión
- [P1, P2, P3]
```

## 2. Archivo LATEST (actualización automática)

**Ruta:** `/docs/bitacora/sessions_context/LATEST.md`

**Contenido (GENERA AUTOMÁTICAMENTE):**
```markdown
# ⭐ CONTEXTO ACTUAL - LEE ESTE

**Versión:** vXX  
**Fecha:** YYYY-MM-DD  
**Archivo:** `YYYY-MM-DD_session_context_vXX.md`

Ver: `/docs/bitacora/sessions_context/YYYY-MM-DD_session_context_vXX.md`