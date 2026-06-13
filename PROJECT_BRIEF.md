# StudyQuest — Project Brief & Handoff

> Paste this into a new Claude Code chat (or tell it to read `PROJECT_BRIEF.md`) so it has full context without re-exploring the codebase.

## 1. What this is & why it exists

**StudyQuest** is a single-user, gamified personal learning tracker/dashboard built by **Michael Essine**, a university student studying **Mathematics, Computer Science, Finance, Economics, Quantum Mechanics** (plus an "Others" bucket: Physics, Business Analytics, Entrepreneurship, Management).

**Core motivation:** track, plan, and evaluate his own learning across all subjects in one place. The app deliberately **emphasizes tracking / planning / big-picture view / performance evaluation over AI content generation**. Reason: AI generation (quizzes, exercises, teaching) is costly and he can do that in free/subscription LLMs he already uses. So: *keep* the AI features but keep them cheap, and invest new effort in tracking/insight/planning. **It is for one user only — never add multi-user/auth/collaboration features.**

The mental model is an RPG-style skill tree: topics have **mastery levels (0–5 stars)**, unlock prerequisites, and feed analytics, career-readiness, and exam planning.

## 2. Tech stack & environment

- **Next.js 14 App Router**, React 18, TypeScript (strict), Tailwind CSS (dark mode, **orange** accent theme).
- **Prisma 5.22 + Neon serverless Postgres.** Local dev and Vercel **share the SAME Neon database** — so `prisma migrate dev` run locally affects "production" data too. Be careful with destructive ops.
- **Anthropic Claude SDK** (`@anthropic-ai/sdk`). Models in `lib/claude.ts`: `SONNET = 'claude-sonnet-4-6'`, `HAIKU = 'claude-haiku-4-5'`. Default to **HAIKU** for cost; it's ~3× cheaper.
- **recharts** (charts), **lucide-react** (icons), **date-fns**, **@xyflow/react v12** (skill tree).
- Platform: Windows 11, PowerShell (use PowerShell syntax). Repo is a git repo, default branch `main`.

## 3. Deployment & workflow conventions

- **Deploy = `git add -A && git commit && git push`** to `main` → Vercel auto-builds.
- `vercel.json` build command: `prisma generate && prisma migrate deploy && next build`. So **migrations apply automatically on deploy.**
- **Migrations**: created locally with `npx prisma migrate dev --name <x>` (applies to the shared Neon DB immediately), committed as folders under `prisma/migrations/`. Vercel's `migrate deploy` then sees them as already-applied.
- **Always run `npx tsc --noEmit` and `npx next build` before declaring done.** Build must be green (ESLint `no-unused-vars` / `no-unused-expressions` will fail the build).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` style co-author line.
- In replies, reference files as markdown links `[file.ts](src/file.ts)` (VSCode extension), **not** backticks.

### Env vars (set in Vercel + local `.env.local`, which is gitignored & holds real secrets — do NOT revert/expose it)
- `DATABASE_URL` — Neon pooled connection
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`, `BACKUP_EMAIL`, `CRON_SECRET`, (optional `BACKUP_FROM`) — for the weekly email-backup cron (see §8). App works fine without these; the cron just no-ops.

## 4. Critical conventions / hard-won lessons

1. **NEVER have an LLM echo back UUIDs.** Haiku mangles long opaque IDs, silently dropping rows. Instead send an **indexed list** (`[0] name`, `[1] name`) and have Claude return the **index**; map index→id in code. This pattern fixed real bugs in `exam/analyze`, `learning-path/generate`, and `quiz/generate-batch`. Apply it to any new LLM-itemizes-things feature.
2. **`export const dynamic = 'force-dynamic'` on every DB-backed server page**, or Next statically prerenders it at build and it shows frozen data forever. This caused a "mastery doesn't update" bug. Client-component pages that fetch from (dynamic) API routes are fine.
3. **No internal `fetch` from one API route to another via an absolute URL** (`localhost:3000` breaks on Vercel). Extract shared logic into a `lib/` function and call it directly (see `lib/quizGen.ts`).
4. **Cost discipline:** all Claude calls go through `claudeJSON` in `lib/claude.ts` with `cacheSystem: true`, a `route` tag (logged to `APICall`), and right-sized `maxTokens`. Deterministic results are cached in `ResponseCache` via `getCachedResponse/setCachedResponse`. Rate limits via `lib/rateLimit.ts` (`checkRateLimit`, `checkMonthlyCap`). Quiz generation is template-first (`QuizTemplate`) so most quizzes cost $0.
5. **Mastery is a float 0–5 on a 0.25 grid.** Central mutation is `applyMasteryGain` in `lib/mastery.ts` (records a `MasteryEvent`, enforces `SOFT_CAP = 4.0`, gates 4→5 behind real-exam qualification, updates node, cascades unlocks). Soft-capped gains tuned down ~50%.
6. **Unlock engine:** `cascadeUnlock()` in `lib/unlock.ts`, `UNLOCK_THRESHOLD = 3.0` (a topic unlocks when all prereqs ≥ 3.0). Returns newly-unlocked names so the UI can toast "🔓 Unlocked: …".

## 5. Key domain libraries (`src/lib/`)

- `prisma.ts` — Prisma client singleton.
- `claude.ts` — `claudeJSON`, `SONNET`, `HAIKU`, prompt/response caching, `APICall` logging.
- `mastery.ts` — `applyMasteryGain`, delta tables, `gradeToScore` (5→95, 4→85, 3→75, 2→65, 1→55, fail→45).
- `unlock.ts` — `cascadeUnlock`, `UNLOCK_THRESHOLD`.
- `spacedRepetition.ts` — SM-2 intervals (`getNextReviewDate`, `getReviewIntervalDays`, `advanceInterval` ×1.5 cap 60d).
- `xp.ts` — `SUBJECTS` (`Mathematics, ComputerScience, Finance, Economics, QuantumMechanics, Others`), `SUBJECT_LABEL`, `Subject` type.
- `careers.ts` — `CAREERS` (list of career→required-topic-names), `computeCareerProgress` (matched/mastered/recommended/allTopics, readiness, relevance, gap text).
- `evaluate.ts` — `computeEvaluation` (velocity, decay queue, efficiency, calibration).
- `examPlan.ts` — `computeExamPlan` (pure back-planned day-by-day drill schedule from weak covered topics).
- `courseGrade.ts` — `predictGrade` (blends avg mastery + exercise performance → 1–5 band + confidence).
- `workflow.ts` — `PHASES` metadata (the 4 studying-workflow phases; numbers/labels/colors/hints).
- `quizGen.ts` — `generateQuiz` (template-first, else Haiku) shared by quiz routes.
- `backup.ts` — `buildBackup` (full JSON snapshot) shared by export + cron.
- `rateLimit.ts` — `checkRateLimit`, `checkMonthlyCap`.

## 6. Data model (Prisma, key models)

Core: `Course` (+ `exerciseSetsTotal/Done`, `quizzesTotal/Done`), `SkillNode` (name, subject, category, tier, status, `masteryLevel` Float, `courseId?`, `nextReviewAt`, `reviewIntervalDays`, `masteryUpdatedAt`), `SkillDependency` (composite prereq→dependent), `Topic`, `Deadline` (courseId, type, dueDate, completed), `StudySession` (skillNodeId, durationMins, note, sourceUrl), `MasteryEvent` (eventType, score, masteryGain, timestamp).

Learning/AI: `Quiz`, `QuizResult`, `QuizTemplate`, `LearningPath` (pinned), `ConceptMap`, `DebateSession`, `TeachSession`, `SocraticSession`, `RealExam`, `ExerciseSet` (+ `courseId?`, `pctSolved?`).

Newer (added across recent sessions — each has its own migration):
- `UpcomingExam` (name, subject, examDate, skillNodeIds Json) — exam planner.
- `PhaseLog` (skillNodeId, phase 1–4, note?, durationMins?, source, timestamp) — **repeatable** studying-workflow activity. A **Phase-2 log with a `note` = a captured "Core Trick"**.
- `FailedProblem` (courseId?, skillNodeId?, source, sourceRef?, title, details?, reason?, resolved, timestamps) — the Mistake Log.

Infra/cost: `APICall`, `ResponseCache`, `RateLimitLog`, `AppSetting`, `APIUsage`. Personal-growth: `LearningAbility`, `SelfImprovementGoals`, `CareerPathProgress`, `Achievement`, `SessionLog` (legacy).

## 7. Feature inventory (what exists today)

**Dashboard (`/`)** — `TodayCenter` command center at top: prioritized daily list (overdue deadlines → upcoming exams w/ weak-topic counts → deadlines due soon → reviews due → stale topics → mistakes to redo), each a one-click link. Plus `QuickLog` (with optional workflow-phase tagging), pinned learning path, subject progress, due-for-review cards, recent exams, active topics, upcoming deadlines.

**Skill tree (`/skills`)** — React Flow. Custom **`FastZoom`** cursor-anchored wheel zoom (the built-in d3 zoom was too slow), min/max zoom 0.15–2.5. Click a node → side panel: `StarRating`, resource links, `TechniqueTips`, `WorkflowPanel` (phase counters + core tricks), `MistakeList` (problems to redo), `QuizPanel`, `LearningToolsPanel`, a one-line link to `/workflow`.

**Topics (`/topics`)** — `TopicsClient`, Title-Cased names, star rating with unlock toasts. Nav badge for review-due count.

**Courses (`/courses`, `/courses/[id]`)** — list cards with progress bars + per-card **delete button** (`DeleteCourseButton`). `AddCourseModal` (manual w/ # exercise sets & quizzes, or PDF transcript upload). Detail page (`CourseDetailClient`): editable progress steppers, **grade predictor**, **topic-linking modal** (assigns `SkillNode.courseId`), **deadlines** CRUD incl. **repeat-weekly** generator, **Workflow Activity** phase stats, **Problems to Redo** (MistakeList), linked-topics list, delete. Course DELETE cleans up FK dependents (topics/deadlines deleted, nodes/sessions/exercise-sets/mistakes unlinked).

**Quiz (`/quiz`)** — `QuizPageClient` 20-q subject exams; `QuizPanel` practice quizzes (template-first via `lib/quizGen.ts`). `/api/quiz/exam` and `/api/quiz/generate-batch` both index-based & resilient.

**Exercises (`/exercises`)** — upload PDF/image → `/api/exercise/analyze` (Claude extracts topics) → report % solved → `/api/exercise/apply` applies mastery, **tags a course (auto-advances its exercise-set progress)**, and lets you **log missed problems** to the Mistake Log.

**Real Exam (`/real-exam`)** — log a 1–5 graded exam, auto-detect covered topics from an upload, **deterministic** index-based mastery gains, post-exam **consolidation path**, and a **Retrospective** card (logged mistakes on the covered topics, tick to resolve). Only a grade-5 real exam pushes 4.0→5.0.

**Exam Planner (`/planner`)** — `UpcomingExam`s with countdown + pure back-planned **drill schedule** (`computeExamPlan`). **Prefill from a course** (loads its linked topics). Surfaces **logged mistakes** for covered topics.

**Learning Paths (`/learning-paths`)** — Haiku-generated, response-cached, index-based; one path can be **pinned** (shown on dashboard).

**Schedule (`/schedule`)** — weekly calendar of deadlines + study sessions; "Log Session" opens `QuickLog`.

**Analytics (`/analytics`)** — single tab with 3 sub-tabs (`AnalyticsClient`): **Overview** (streak/momentum/active-days/avg-session/stars/mastered stat cards, hours charts, mastery distribution, hours-by-subject, **Studying Workflow Balance** w/ weakest-phase nudge), **Progress & Career** (`ProgressClient`: mastery growth, **career radar** w/ custom wrapping tick labels, weekly advancement), **Evaluation** (`EvaluateClient`: velocity, decay, efficiency, calibration). The old standalone `/progress` and `/evaluate` routes were removed and merged here.

**Career (`/career`)** — `CareerClient`: readiness/relevance rings, gap analysis, **All Required Topics** collapsible list color-coded by mastery (incl. "not in your tree" dashed chips).

**Transcript (`/transcript`)** — courses grouped by term, GPA, **projected GPA** (real grades + predicted grades).

**Studying Workflow (`/workflow`)** — static 4-phase reference (1 Information Gathering, 2 Proofs/Core Trick, 3 Homework/15-min struggle + Socratic AI prompts, 4 Exam Prep/Active Recall). Reminders link from dashboard + topic panel. The **phase tracking** (PhaseLog) is the active companion: per-topic repeatable counters + core-trick capture (`WorkflowPanel`), phase tagging in `QuickLog`, per-course phase stats, and the analytics workflow-balance card.

**Mistake Log (`/mistakes`)** — `FailedProblem` collection (`MistakeList` component, reused in exercises/course/topic/exam contexts). Capture problem → annotate **why** you missed it → **Practice this topic** (opens `/practice/[id]` reusing `QuizPanel`) → mark **resolved**. Nav badge for open count.

**Library (`/library`)** — aggregates all `StudySession` notes + source links grouped by topic, searchable.

**Mobile Quick Log (`/log`)** — stripped-down big-tap logger. `BottomNav` (mobile): Home / Log / Topics / Quiz / Stats, with a review-due dot on Topics.

**Review queue (`/review`)** — spaced-repetition due topics; re-rate (same rating ×1.5 interval via `/api/review-done`; changed rating reschedules). Nav badge.

**Settings (`/settings`)** — cost dashboard (est. monthly spend, cache hit rates, per-route cost), monthly cap, **Data & Backup**: download JSON export + **Restore from backup** (`/api/import`, upsert-by-id merge).

### Nav badges (desktop `Nav.tsx`)
Review-due (orange, on `/topics`, → `/review`), deadlines-due-within-7d (red, on `/schedule`), mistakes-to-redo (gray, on `/mistakes`). All refetch on navigation.

## 8. Durability / backup

- `/api/export` → full JSON (`lib/backup.ts`, version 2, includes phase logs / mistakes / upcoming exams).
- `/api/import` → restore: upsert-by-id, FK-ordered, per-row try/catch (skips orphans), merges (never deletes).
- `/api/cron/backup` → emails the backup via **Resend**; scheduled by `vercel.json` cron `0 6 * * 1` (Mon 06:00 UTC). Needs `RESEND_API_KEY` + `BACKUP_EMAIL` (+ `CRON_SECRET`). Default sender `onboarding@resend.dev` works to the account owner's own inbox.

## 9. Current state & candidate next steps

The app is **feature-complete and stable** (build green). Recently finished: course-delete fix, Today command center, stale-topic alerts, mistake nav badge, import/restore + weekly email backup, mistake→practice loop, post-exam retrospective.

**The two biggest remaining levers (not yet done):**
1. **Consolidate the navigation** — the sidebar is ~22 items; group into collapsible sections (Study / Plan / Review / Insight / Reference). Highest daily-usability payoff, low effort.
2. **Method-effectiveness insights** — correlate `PhaseLog` activity with `MasteryEvent` velocity to show *"topics where you did Active Recall climbed faster"*. The standout novel feature still on the table; data is already being logged.

Smaller ideas floated: a "to-redo → generate quiz" is done; could add an Analytics-wide cross-subject phase trend over time; "add to my tree" action on career "not in tree" chips; QA/hardening pass (empty states, mobile, error boundaries).

**Style of working the user likes:** build the requested thing end-to-end, verify with tsc+build, then give a tight summary and the `git push` commands. He often replies "yes" / picks an option to proceed. Don't over-ask; make reasonable default choices and mention them. He cares about credit/cost efficiency.
