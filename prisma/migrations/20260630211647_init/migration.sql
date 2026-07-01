-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'analyst',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImplementationProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "tradingPartner" TEXT NOT NULL,
    "erpSystem" TEXT NOT NULL,
    "erpVersion" TEXT,
    "translatorTarget" TEXT NOT NULL,
    "transactions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "ImplementationProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "parsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MappingRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetSegment" TEXT NOT NULL,
    "targetElement" TEXT NOT NULL,
    "sourceField" TEXT,
    "transformation" TEXT,
    "qualifier" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0,
    "rationale" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewerId" TEXT,
    CONSTRAINT "MappingRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MappingRecommendation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpenQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "OpenQuestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assumption" TEXT NOT NULL,
    "risk" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Assumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "GeneratedArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ApprovalRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ImplementationProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
