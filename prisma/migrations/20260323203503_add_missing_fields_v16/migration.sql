-- AlterTable
ALTER TABLE "CashFlow" ADD COLUMN     "cuenta" TEXT;

-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "exchange_rate" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TradeUnit" ADD COLUMN     "exitExecId" INTEGER;

-- AddForeignKey
ALTER TABLE "TradeUnit" ADD CONSTRAINT "TradeUnit_exitExecId_fkey" FOREIGN KEY ("exitExecId") REFERENCES "Execution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
