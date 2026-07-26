-- CreateTable
CREATE TABLE IF NOT EXISTS "TransactionInterfaceDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transactionCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "layoutType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "description" TEXT,
  "erpSystem" TEXT,
  "originalFileName" TEXT,
  "fieldCount" INTEGER NOT NULL DEFAULT 0,
  "definitionContent" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "TransactionInterfaceDefinition_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TransactionInterfaceDefinition_userId_transactionCode_version_key"
  ON "TransactionInterfaceDefinition"("userId", "transactionCode", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransactionInterfaceDefinition_userId_transactionCode_status_idx"
  ON "TransactionInterfaceDefinition"("userId", "transactionCode", "status");

-- AlterTable
ALTER TABLE "ImplementationProject" ADD COLUMN "interfaceDefinitionId" TEXT
  REFERENCES "TransactionInterfaceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
