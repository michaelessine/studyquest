# StudyQuest

A personal gamified learning tracker for university students. Track mastery across subjects, plan exams, log study sessions, and see your progress through an RPG-style skill tree.

## Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **Prisma 5** + **Neon** serverless Postgres
- **Anthropic Claude** (Haiku by default) for AI features
- **Recharts** · **@xyflow/react** (skill tree) · **lucide-react**

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and ANTHROPIC_API_KEY
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon pooled connection string |
| `ANTHROPIC_API_KEY` | ✅ | For AI features (quiz, learning paths, chat) |
| `RESEND_API_KEY` | optional | Weekly email backup |
| `BACKUP_EMAIL` | optional | Recipient for weekly backup |
| `CRON_SECRET` | optional | Vercel cron auth header |

## Key features

- **Skill tree** — 250+ topics across Mathematics, CS, Finance, Economics, Quantum Mechanics, and Others; unlock prerequisites as you progress
- **Mastery tracking** — 0–5★ in 0.25 increments with spaced-repetition review queue
- **Today command center** — urgency-scored daily priority list (overdue deadlines, upcoming exams, reviews due)
- **Exam planner** — back-planned drill schedule from weak topics linked to an upcoming exam
- **Exercises & mistakes** — upload PDFs, log % solved, capture missed problems and re-practice them
- **Analytics** — study hours, mastery growth, career alignment radar, method-effectiveness insights, phase activity trends
- **Studying workflow** — four-phase framework (Info Gathering → Core Trick → Homework → Active Recall) with per-topic phase logging
- **AI features** — quiz generation, learning paths, concept maps, Socratic sessions, AI chat (all cost-gated via monthly cap)
- **Data backup** — JSON export/import + weekly automated email via Resend

## Project structure

```
src/
  app/          # Next.js pages and API routes
  components/   # React client components
  lib/          # Shared logic (mastery, unlock, careers, XP, backup…)
prisma/
  schema.prisma
  migrations/
  seed.ts       # Full skill tree seed
```

## Deployment

Push to `main` → Vercel auto-builds. The build command runs `prisma migrate deploy && next build`, so migrations apply automatically on deploy.

> **Note:** local dev and Vercel share the same Neon database. Running `prisma migrate dev` locally affects production data immediately.
