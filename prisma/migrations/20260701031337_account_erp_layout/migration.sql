-- CreateTable
CREATE TABLE "ErpLayoutProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "erpSystem" TEXT NOT NULL,
    "erpVersion" TEXT,
    "originalFileName" TEXT,
    "fieldCount" INTEGER NOT NULL DEFAULT 0,
    "layoutContent" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ErpLayoutProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ErpLayoutProfile_userId_key" ON "ErpLayoutProfile"("userId");
