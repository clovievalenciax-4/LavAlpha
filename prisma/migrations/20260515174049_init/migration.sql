-- CreateTable
CREATE TABLE "Caller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'x',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "score" REAL NOT NULL DEFAULT 0,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "correctCalls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AlphaCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tweetId" TEXT,
    "callerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokenName" TEXT,
    "chain" TEXT,
    "contractAddress" TEXT,
    "priceAtMention" REAL,
    "priceNow" REAL,
    "priceChange" REAL,
    "tweetUrl" TEXT,
    "mentionedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT,
    "sentiment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlphaCall_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "Caller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScrapeTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScrapedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Caller_username_key" ON "Caller"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AlphaCall_tweetId_key" ON "AlphaCall"("tweetId");

-- CreateIndex
CREATE INDEX "AlphaCall_callerId_idx" ON "AlphaCall"("callerId");

-- CreateIndex
CREATE INDEX "AlphaCall_tokenName_idx" ON "AlphaCall"("tokenName");

-- CreateIndex
CREATE INDEX "AlphaCall_chain_idx" ON "AlphaCall"("chain");

-- CreateIndex
CREATE INDEX "AlphaCall_mentionedAt_idx" ON "AlphaCall"("mentionedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapeTarget_username_key" ON "ScrapeTarget"("username");
