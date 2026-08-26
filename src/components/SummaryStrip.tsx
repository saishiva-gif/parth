import type { MetricSummary } from '../types'

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bad' : 'text-ink'
  return (
    <div className="flex-1 rounded-lg border border-border bg-bg-panel px-4 py-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function SummaryStrip({ summary }: { summary: MetricSummary }) {
  const totalAccounts = summary.under + summary.on_track + summary.over + summary.no_mou
  const pctOfMou = summary.total_mou > 0 ? Math.round((summary.total_mtd_usage / summary.total_mou) * 1000) / 10 : null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <StatTile label="Accounts" value={totalAccounts} />
      <StatTile label="Active this month" value={summary.active} />
      <StatTile label="Under-consuming" value={summary.under} tone={summary.under > 0 ? 'bad' : undefined} />
      <StatTile label="On track" value={summary.on_track} tone="good" />
      <StatTile label="Over-consuming" value={summary.over} tone={summary.over > 0 ? 'warn' : undefined} />
      <StatTile label="MTD usage (agg.)" value={summary.total_mtd_usage.toLocaleString()} />
      <StatTile label="% of aggregate MOU" value={pctOfMou !== null ? `${pctOfMou}%` : '—'} />
    </div>
  )
}
