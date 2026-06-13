-- CreateTable
CREATE TABLE "PhaseLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "skillNodeId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "note" TEXT,
    "durationMins" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'panel',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhaseLog_skillNodeId_idx" ON "PhaseLog"("skillNodeId");

-- CreateIndex
CREATE INDEX "PhaseLog_phase_idx" ON "PhaseLog"("phase");
