-- Merge SessionLog into StudySession
-- 1. Add new columns to StudySession
ALTER TABLE "StudySession" ADD COLUMN "courseId" TEXT;
ALTER TABLE "StudySession" ADD COLUMN "rawNote" TEXT;
ALTER TABLE "StudySession" ADD COLUMN "xpEarned" INTEGER NOT NULL DEFAULT 0;

-- 2. Add FK constraint for courseId
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Copy SessionLog rows into StudySession
INSERT INTO "StudySession" (id, "courseId", "startTime", "durationMins", source, "rawNote", "xpEarned")
SELECT id, "courseId", "loggedAt", "durationMins", 'session_log', "rawNote", "xpEarned"
FROM "SessionLog";

-- 4. Drop the now-redundant SessionLog table
DROP TABLE "SessionLog";
