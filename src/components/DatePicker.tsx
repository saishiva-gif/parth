import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toISODate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const selected = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  useEffect(() => {
    if (!open) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left })

    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openPicker() {
    const d = value ? new Date(value + 'T00:00:00') : new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setOpen(true)
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function shiftMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setViewMonth(m)
    setViewYear(y)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-sm text-ink outline-none hover:border-accent focus:border-accent"
      >
        <svg className="h-3.5 w-3.5 text-ink-faint" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 8h14M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {value || 'Select date'}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="z-[60] w-64 rounded-lg border border-border bg-bg-raised p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-md px-2 py-1 text-ink-muted hover:bg-bg hover:text-ink"
              >
                ‹
              </button>
              <span className="text-sm font-medium">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-md px-2 py-1 text-ink-muted hover:bg-bg hover:text-ink"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-faint">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />
                const iso = toISODate(viewYear, viewMonth, day)
                const isSelected = iso === value
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(iso)
                      setOpen(false)
                    }}
                    className={`rounded-md py-1 text-sm tabular-nums transition-colors ${
                      isSelected ? 'bg-accent text-white' : 'text-ink hover:bg-bg'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const today = new Date()
                onChange(toISODate(today.getFullYear(), today.getMonth(), today.getDate()))
                setOpen(false)
              }}
              className="mt-2 w-full rounded-md border border-border py-1 text-xs text-ink-muted hover:border-accent hover:text-ink"
            >
              Today
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
