// GET /api/cron/backup — emails a JSON backup. Triggered by Vercel Cron (weekly).
// Required env vars:
//   RESEND_API_KEY  — from resend.com (free tier is plenty)
//   BACKUP_EMAIL    — where to send the backup
//   CRON_SECRET     — (optional) Vercel sets this; we verify it when present
// Sender defaults to Resend's shared onboarding address (works to your own inbox);
// set BACKUP_FROM to a verified-domain address if you have one.
import { NextRequest, NextResponse } from 'next/server'
import { buildBackup } from '@/lib/backup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify the caller is Vercel Cron (when CRON_SECRET is configured)
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.BACKUP_EMAIL
  if (!apiKey || !to) {
    return NextResponse.json({ error: 'Email backup not configured (set RESEND_API_KEY and BACKUP_EMAIL)' }, { status: 200 })
  }

  const payload = await buildBackup()
  const stamp = new Date().toISOString().split('T')[0]
  const json = JSON.stringify(payload)
  const base64 = Buffer.from(json).toString('base64')
  const c = payload.counts

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.BACKUP_FROM || 'StudyQuest <onboarding@resend.dev>',
      to: [to],
      subject: `StudyQuest backup — ${stamp}`,
      text: `Your weekly StudyQuest backup is attached.\n\n${c.skillNodes} topics · ${c.masteryEvents} mastery events · ${c.studySessions} study sessions · ${c.realExams} exams · ${c.failedProblems} logged mistakes.\n\nKeep this file safe — you can restore it from Settings → Data & Backup.`,
      attachments: [{ filename: `studyquest-backup-${stamp}.json`, content: base64 }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('Backup email failed:', res.status, detail)
    return NextResponse.json({ error: 'Email send failed', status: res.status }, { status: 500 })
  }
  return NextResponse.json({ ok: true, sentTo: to, counts: c })
}
