import { useMemo, useState } from 'react'

export default function UsernameAutocomplete({
  value,
  onChange,
  suggestions,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
}) {
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return suggestions.slice(0, 8)
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8)
  }, [value, suggestions])

  const exactMatch = suggestions.some((s) => s.toLowerCase() === value.trim().toLowerCase())

  return (
    <div className="relative">
      <input
        className={`w-full rounded-md border bg-bg px-2 py-1 text-ink outline-none focus:border-accent ${
          value && !exactMatch ? 'border-warn/50' : 'border-border'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="e.g. bluestone"
        title={value && !exactMatch ? "No exact match in Databricks usage — check for a typo" : undefined}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-bg-raised shadow-lg">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s)
                setOpen(false)
              }}
              className="block w-full truncate px-2.5 py-1.5 text-left text-sm text-ink hover:bg-bg"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
