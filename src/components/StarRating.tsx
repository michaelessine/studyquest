'use client'
import { useState } from 'react'

interface Props {
  value: number            // 0–5 in 0.5 increments
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = { sm: 14, md: 18, lg: 24 }

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
  // Half star — clip left half only
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

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: Props) {
  const [hovered, setHovered] = useState<number>(0)
  const px      = SIZE[size]
  const display = hovered > 0 ? hovered : value

  function getFill(starIndex: number): FillType {
    if (display >= starIndex)          return 'full'
    if (display >= starIndex - 0.5)    return 'half'
    return 'empty'
  }

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>, starIndex: number) {
    if (readonly) return
    const rect = e.currentTarget.getBoundingClientRect()
    const isLeft = e.clientX - rect.left < rect.width / 2
    setHovered(isLeft ? starIndex - 0.5 : starIndex)
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>, starIndex: number) {
    if (readonly || !onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const isLeft = e.clientX - rect.left < rect.width / 2
    const clicked = isLeft ? starIndex - 0.5 : starIndex
    // Clicking the current value resets to 0
    onChange(clicked === value ? 0 : clicked)
  }

  const color = masteryColor(display)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            disabled={readonly}
            onMouseMove={e => handleMouseMove(e, i)}
            onMouseLeave={() => setHovered(0)}
            onClick={e => handleClick(e, i)}
            className={`transition-transform select-none ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Rate ${i} stars`}
          >
            <StarIcon fill={getFill(i)} px={px} color={color} id={`${i}`} />
          </button>
        ))}
      </div>
      {!readonly && display > 0 && (
        <span className={`text-[10px] font-medium ${color}`}>
          {masteryLabel(display)} ({display}★)
        </span>
      )}
    </div>
  )
}
