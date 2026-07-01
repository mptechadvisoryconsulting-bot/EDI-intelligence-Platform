-- CreateTable
CREATE TABLE "CopilotMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "CopilotMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
