'use client'
import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react'

const WORK_SECS  = 25 * 60
const BREAK_SECS = 5  * 60

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function PomodoroTimer() {
  const [mode, setMode]       = useState<'work' | 'break'>('work')
  const [seconds, setSeconds] = useState(WORK_SECS)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setRunning(false)
          const next = mode === 'work' ? 'break' : 'work'
          setMode(next)
          return next === 'break' ? BREAK_SECS : WORK_SECS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, mode])

  const reset = useCallback(() => {
    setRunning(false)
    setSeconds(mode === 'work' ? WORK_SECS : BREAK_SECS)
  }, [mode])

  const pct = mode === 'work'
    ? ((WORK_SECS - seconds) / WORK_SECS) * 100
    : ((BREAK_SECS - seconds) / BREAK_SECS) * 100

  return (
    <div className="card p-5 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        {mode === 'work'
          ? <span className="text-orange-400">Focus Session</span>
          : <span className="text-green-400 flex items-center gap-1"><Coffee size={14} /> Break</span>}
      </div>

      {/* Circular progress */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none"
            stroke={mode === 'work' ? '#ea580c' : '#16a34a'} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-mono font-bold text-gray-100">{fmt(seconds)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setRunning(r => !r)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="flex gap-3 text-xs text-gray-600">
        <button onClick={() => { setMode('work');  setRunning(false); setSeconds(WORK_SECS)  }} className={mode === 'work'  ? 'text-orange-400' : 'hover:text-gray-400'}>25 min work</button>
        <button onClick={() => { setMode('break'); setRunning(false); setSeconds(BREAK_SECS) }} className={mode === 'break' ? 'text-green-400'  : 'hover:text-gray-400'}>5 min break</button>
      </div>
    </div>
  )
}
