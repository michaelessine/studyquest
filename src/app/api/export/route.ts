// GET /api/export — download all personal study data as a single JSON file.
import { NextResponse } from 'next/server'
import { buildBackup } from '@/lib/backup'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await buildBackup()
  const stamp = new Date().toISOString().split('T')[0]
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="studyquest-backup-${stamp}.json"`,
    },
  })
}
