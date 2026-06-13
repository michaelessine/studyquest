-- CreateTable
CREATE TABLE "FailedProblem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "courseId" TEXT,
    "skillNodeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "reason" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FailedProblem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedProblem_courseId_idx" ON "FailedProblem"("courseId");

-- CreateIndex
CREATE INDEX "FailedProblem_skillNodeId_idx" ON "FailedProblem"("skillNodeId");

-- CreateIndex
CREATE INDEX "FailedProblem_resolved_idx" ON "FailedProblem"("resolved");
