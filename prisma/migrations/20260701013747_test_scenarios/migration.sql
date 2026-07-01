-- CreateTable
CREATE TABLE "TestScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "transactionCode" TEXT,
    "preconditions" TEXT,
    "expectedOutcome" TEXT,
    "relatedSegments" TEXT,
    "coveredMappings" TEXT,
    "coverageStatus" TEXT NOT NULL DEFAULT 'uncovered',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "TestScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
