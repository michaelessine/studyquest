// POST /api/cascade-unlock — manual full cascade unlock (admin action)
import { NextResponse } from 'next/server'
import { cascadeUnlock } from '@/lib/unlock'

export async function POST() {
  const unlocked = await cascadeUnlock()
  return NextResponse.json({ unlocked })
}
