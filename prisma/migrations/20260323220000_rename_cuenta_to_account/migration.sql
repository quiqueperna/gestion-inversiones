-- Rename table Cuenta → Account
ALTER TABLE "Cuenta" RENAME TO "Account";

-- Rename column cuenta → account in CashFlow
ALTER TABLE "CashFlow" RENAME COLUMN "cuenta" TO "account";
