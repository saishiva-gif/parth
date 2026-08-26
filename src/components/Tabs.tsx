import type { Metric } from '../types'
import { METRIC_LABELS } from '../types'

const ORDER: Metric[] = ['NDR_AI_AGENT_WITHOUT_VOICEMAIL', 'ORDER_CONFIRMATION_WITHOUT_VOICEMAIL']

export default function Tabs({ active, onChange }: { active: Metric; onChange: (m: Metric) => void }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {ORDER.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            active === m
              ? 'border-b-2 border-accent text-ink'
              : 'border-b-2 border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {METRIC_LABELS[m]}
        </button>
      ))}
    </div>
  )
}
