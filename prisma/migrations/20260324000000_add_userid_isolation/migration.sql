-- Add userId to all tables for multi-user data isolation

-- Execution
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "Execution_userId_idx" ON "Execution"("userId");

-- CashFlow
ALTER TABLE "CashFlow" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "CashFlow_userId_idx" ON "CashFlow"("userId");

-- TradeUnit
ALTER TABLE "TradeUnit" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "TradeUnit_userId_idx" ON "TradeUnit"("userId");

-- Account: drop old unique on nombre, add userId, add composite unique
-- Nota: el unique fue creado como INDEX (no CONSTRAINT), usar DROP INDEX
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "Account_nombre_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Account_userId_nombre_key" ON "Account"("userId", "nombre");

-- Broker: drop old unique on nombre, add userId, add composite unique
ALTER TABLE "Broker" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "Broker_nombre_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Broker_userId_nombre_key" ON "Broker"("userId", "nombre");
