import type { AlertState } from '../types'

const STYLES: Record<AlertState, string> = {
  under: 'bg-bad/10 text-bad border-bad/20',
  over: 'bg-warn/10 text-warn border-warn/20',
  on_track: 'bg-good/10 text-good border-good/20',
  no_mou: 'bg-ink-faint/10 text-ink-faint border-ink-faint/20',
}

const LABELS: Record<AlertState, string> = {
  under: 'Under',
  over: 'Over',
  on_track: 'On track',
  no_mou: 'No MOU',
}

export default function AlertBadge({ state }: { state: AlertState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[state]}`}
    >
      {LABELS[state]}
    </span>
  )
}
