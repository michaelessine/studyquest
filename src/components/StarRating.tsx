'use client'

interface Props {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = { sm: 13, md: 17, lg: 22 }

function masteryLabel(ml: number): string {
  if (ml === 0)   return 'Not started'
  if (ml <= 0.5)  return 'Just started'
  if (ml <= 1)    return 'Beginner'
  if (ml <= 1.5)  return 'Early learner'
  if (ml <= 2)    return 'Learning'
  if (ml <= 2.5)  return 'Intermediate'
  if (ml <= 3)    return 'Proficient'
  if (ml <= 3.5)  return 'Good'
  if (ml <= 4)    return 'Advanced'
  if (ml <= 4.5)  return 'Near mastery'
  return 'Mastered'
}

function masteryColor(ml: number): string {
  if (ml >= 5)  return 'text-green-400'
  if (ml >= 3)  return 'text-orange-400'
  if (ml >= 1)  return 'text-blue-400'
  return 'text-gray-500'
}

const STAR_PATH = 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z'

type FillType = 'full' | 'half' | 'empty'

function StarIcon({ fill, px, color, id }: { fill: FillType; px: number; color: string; id: string }) {
  if (fill === 'empty') {
    return (
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
        <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
      </svg>
    )
  }
  if (fill === 'full') {
    return (
      <svg width={px} height={px} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" className={color}>
        <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
      </svg>
    )
  }
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" className={color}>
      <defs>
        <clipPath id={`half-${id}`}><rect x="0" y="0" width="12" height="24" /></clipPath>
      </defs>
      <path d={STAR_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600" />
      <path d={STAR_PATH} fill="currentColor" stroke="none" clipPath={`url(#half-${id})`} />
    </svg>
  )
}

function getFill(starIndex: number, value: number): FillType {
  if (value >= starIndex)       return 'full'
  if (value >= starIndex - 0.5) return 'half'
  return 'empty'
}

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: Props) {
  const px = SIZE[size]
  const color = masteryColor(value)

  function step(delta: number) {
    if (!onChange) return
    const next = Math.round((value + delta) * 4) / 4
    onChange(Math.max(0, Math.min(5, next)))
  }

  const stars = (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon key={i} fill={getFill(i, value)} px={px} color={color} id={String(i)} />
      ))}
    </div>
  )

  if (readonly) return stars

  const btnCls = `w-8 h-7 rounded border text-xs font-bold transition-colors select-none
    bg-gray-800 border-gray-700 text-gray-300 hover:border-orange-600 hover:text-orange-300
    disabled:opacity-30 disabled:cursor-not-allowed`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {stars}
        <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}★</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => step(-0.25)} disabled={value <= 0} className={btnCls}>−¼</button>
        <button onClick={() => step( 0.25)} disabled={value >= 5} className={btnCls}>+¼</button>
        {value > 0 && (
          <span className={`text-[10px] font-medium ${color}`}>{masteryLabel(value)}</span>
        )}
      </div>
    </div>
  )
}
