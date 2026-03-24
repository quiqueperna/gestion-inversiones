# Misión: Agente Lógica — v20 (2026-03-23)

## Objetivo
Extender el parser CSV para validar broker y cuenta contra listas de la BD.

## Cambios en `src/lib/csv-import.ts`
- Agregar parámetros opcionales `validBrokers?: string[]` y `validAccounts?: string[]` a `parseImportCSV`
- Si se pasan, validar que `row.broker` esté en `validBrokers` y `row.account` en `validAccounts`
- Error específico: `"Broker '{X}' no existe"` / `"Cuenta '{X}' no existe"`
- Combinar con errores de formato existentes (puede haber múltiples razones)
