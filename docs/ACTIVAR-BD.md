# Cómo activar la Base de Datos

Por defecto el proyecto corre en **Modo Demo** (datos en memoria desde CSV).
Sigue estos pasos para activar la persistencia real con Prisma.

## Requisitos
- SQLite (incluido) o PostgreSQL instalado

## Pasos

### 1. Configurar .env
```
# SQLite (más simple para desarrollo local)
DATABASE_URL="file:./dev.db"

# PostgreSQL (producción)
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/inversiones"
```

### 2. Aplicar migraciones
```bash
npx prisma migrate dev --name "init"
```

### 3. Ejecutar seed con datos de prueba
```bash
npm run db:seed
```

### 4. Activar el flag USE_DB
En `.env` o `.env.local`:
```
USE_DB=true
```

### 5. Las server actions detectan el flag y usan Prisma automáticamente

## Volver al Modo Demo
Eliminar o poner `USE_DB=false` en `.env`.
