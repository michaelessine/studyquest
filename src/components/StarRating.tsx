'use client'
import { useState } from 'react'

interface Props {
  value: number          // 0–5
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = { sm: 14, md: 18, lg: 24 }

const MASTERY_LABEL = ['Not started', 'Beginner', 'Learning', 'Proficient', 'Advanced', 'Mastered']
const MASTERY_COLOR = ['text-gray-500', 'text-blue-400', 'text-blue-500', 'text-purple-400', 'text-purple-500', 'text-green-400']

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: Props) {
  const [hovered, setHovered] = useState(0)
  const px = SIZE[size]
  const display = hovered || value

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            disabled={readonly}
            onClick={() => onChange?.(i === value ? 0 : i)}
            onMouseEnter={() => !readonly && setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            className={`transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
          >
            <svg width={px} height={px} viewBox="0 0 24 24" fill={i <= display ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"
              className={i <= display ? MASTERY_COLOR[display] : 'text-gray-600'}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        ))}
      </div>
      {!readonly && (
        <span className={`text-[10px] font-medium ${MASTERY_COLOR[display]}`}>
          {MASTERY_LABEL[display]}
        </span>
      )}
    </div>
  )
}
