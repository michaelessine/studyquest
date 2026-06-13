-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "exerciseSetsDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exerciseSetsTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizzesDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizzesTotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ExerciseSet" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "pctSolved" INTEGER;

-- CreateIndex
CREATE INDEX "ExerciseSet_courseId_idx" ON "ExerciseSet"("courseId");
