-- CreateTable
CREATE TABLE "RealExam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "skillNodeIds" JSONB NOT NULL,
    "examName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performanceNotes" TEXT NOT NULL DEFAULT '',
    "grade" TEXT NOT NULL DEFAULT '',
    "masteryImpact" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "skillNodeIds" JSONB NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masteryImpact" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3),

    CONSTRAINT "ExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasteryEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "skillNodeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "masteryGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasteryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAbility" (
    "userId" TEXT NOT NULL DEFAULT 'default',
    "focusScore" INTEGER NOT NULL DEFAULT 5,
    "recoveryScore" INTEGER NOT NULL DEFAULT 5,
    "mentalHealthScore" INTEGER NOT NULL DEFAULT 5,
    "stressLevel" INTEGER NOT NULL DEFAULT 5,
    "neuroplasticityTips" JSONB NOT NULL DEFAULT '[]',
    "focusTips" TEXT NOT NULL DEFAULT '',
    "recoveryTips" TEXT NOT NULL DEFAULT '',
    "mentalHealthTips" TEXT NOT NULL DEFAULT '',
    "avoidances" TEXT NOT NULL DEFAULT '',
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningAbility_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SelfImprovementGoals" (
    "userId" TEXT NOT NULL DEFAULT 'default',
    "books" JSONB NOT NULL DEFAULT '[]',
    "disciplineHabits" JSONB NOT NULL DEFAULT '[]',
    "healthHabits" JSONB NOT NULL DEFAULT '[]',
    "spiritualGrowth" JSONB NOT NULL DEFAULT '[]',
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfImprovementGoals_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CareerPathProgress" (
    "userId" TEXT NOT NULL DEFAULT 'default',
    "interestAreas" JSONB NOT NULL DEFAULT '[]',
    "progressByArea" JSONB NOT NULL DEFAULT '{}',
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPathProgress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "APIUsage" (
    "userId" TEXT NOT NULL DEFAULT 'default',
    "creditsRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRefresh" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIUsage_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "MasteryEvent_skillNodeId_idx" ON "MasteryEvent"("skillNodeId");

-- CreateIndex
CREATE INDEX "MasteryEvent_eventType_idx" ON "MasteryEvent"("eventType");
