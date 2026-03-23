-- CreateTable
CREATE TABLE "Execution" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "broker" TEXT NOT NULL DEFAULT 'AMR',
    "account" TEXT NOT NULL DEFAULT 'USA',
    "side" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "remainingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlow" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeUnit" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "entryAmount" DOUBLE PRECISION NOT NULL,
    "exitAmount" DOUBLE PRECISION,
    "days" INTEGER NOT NULL,
    "pnlNominal" DOUBLE PRECISION NOT NULL,
    "pnlPercent" DOUBLE PRECISION NOT NULL,
    "tna" DOUBLE PRECISION NOT NULL,
    "broker" TEXT NOT NULL,
    "account" TEXT NOT NULL DEFAULT 'USA',
    "instrumentType" TEXT NOT NULL DEFAULT 'STOCK',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "side" TEXT NOT NULL DEFAULT 'BUY',
    "entryExecId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Execution_symbol_idx" ON "Execution"("symbol");

-- CreateIndex
CREATE INDEX "Execution_date_idx" ON "Execution"("date");

-- CreateIndex
CREATE INDEX "Execution_broker_idx" ON "Execution"("broker");

-- CreateIndex
CREATE INDEX "CashFlow_date_idx" ON "CashFlow"("date");

-- CreateIndex
CREATE INDEX "CashFlow_broker_idx" ON "CashFlow"("broker");

-- CreateIndex
CREATE INDEX "TradeUnit_symbol_idx" ON "TradeUnit"("symbol");

-- CreateIndex
CREATE INDEX "TradeUnit_exitDate_idx" ON "TradeUnit"("exitDate");

-- CreateIndex
CREATE INDEX "TradeUnit_broker_idx" ON "TradeUnit"("broker");

-- AddForeignKey
ALTER TABLE "TradeUnit" ADD CONSTRAINT "TradeUnit_entryExecId_fkey" FOREIGN KEY ("entryExecId") REFERENCES "Execution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
