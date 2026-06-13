-- CreateTable
CREATE TABLE "UpcomingExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "skillNodeIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpcomingExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpcomingExam_examDate_idx" ON "UpcomingExam"("examDate");
