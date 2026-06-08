-- CreateTable
CREATE TABLE "APICall" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationInputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadInputTokens" INTEGER NOT NULL DEFAULT 0,
    "responseMs" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APICall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseCache" (
    "id" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizTemplate" (
    "id" TEXT NOT NULL,
    "skillNodeId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Intermediate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "routeName" TEXT NOT NULL,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "monthlyCapUsd" DOUBLE PRECISION NOT NULL DEFAULT 5,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "APICall_route_idx" ON "APICall"("route");

-- CreateIndex
CREATE INDEX "APICall_createdAt_idx" ON "APICall"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseCache_inputHash_key" ON "ResponseCache"("inputHash");

-- CreateIndex
CREATE INDEX "ResponseCache_routeName_idx" ON "ResponseCache"("routeName");

-- CreateIndex
CREATE INDEX "QuizTemplate_skillNodeId_idx" ON "QuizTemplate"("skillNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitLog_userId_routeName_key" ON "RateLimitLog"("userId", "routeName");

-- AddForeignKey
ALTER TABLE "QuizTemplate" ADD CONSTRAINT "QuizTemplate_skillNodeId_fkey" FOREIGN KEY ("skillNodeId") REFERENCES "SkillNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
