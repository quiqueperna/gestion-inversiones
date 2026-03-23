-- AlterTable
ALTER TABLE "Account" RENAME CONSTRAINT "Cuenta_pkey" TO "Account_pkey";

-- RenameIndex
ALTER INDEX "Cuenta_nombre_key" RENAME TO "Account_nombre_key";
