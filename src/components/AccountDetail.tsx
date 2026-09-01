import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AccountMetric } from '../types'
import AlertBadge from './AlertBadge'

function formatWeek(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString('en-US', withMonth ? { month: 'short', day: 'numeric' } : { day: 'numeric' })
  const sameMonth = s.getMonth() === e.getMonth()
  return `${fmt(s, true)}–${fmt(e, !sameMonth)}`
}

function TrendExplainer({ account }: { account: AccountMetric }) {
  const detail = account.trend_wow_detail

  if (!detail) {
    return (
      <div className="mt-4 rounded-md border border-border bg-bg px-3 py-2 text-xs text-ink-faint">
        Trend (WoW): not enough history yet — needs at least two fully completed weeks (Mon–Sun).
      </div>
    )
  }

  const { previous_week: prev, latest_week: latest, pct } = detail
  const delta = latest.total - prev.total

  return (
    <div className="mt-4 rounded-md border border-border bg-bg px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between text-ink-muted">
        <span>Trend (WoW) — last two fully completed weeks</span>
        {pct !== null && (
          <span className={`font-semibold tabular-nums ${pct > 0 ? 'text-good' : pct < 0 ? 'text-bad' : 'text-ink'}`}>
            {pct > 0 ? '+' : ''}
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 tabular-nums text-ink">
        <span>
          {formatWeek(prev.start, prev.end)}: <span className="font-medium">{prev.total.toLocaleString()}</span>
        </span>
        <span className="text-ink-faint">→</span>
        <span>
          {formatWeek(latest.start, latest.end)}: <span className="font-medium">{latest.total.toLocaleString()}</span>
        </span>
      </div>
      <div className="mt-1 text-ink-faint">
        {pct !== null ? (
          <>
            ({latest.total.toLocaleString()} − {prev.total.toLocaleString()}) ÷ {prev.total.toLocaleString()} × 100 ={' '}
            {pct > 0 ? '+' : ''}
            {pct.toFixed(1)}%
          </>
        ) : (
          <>
            Previous week had 0 usage, so % change is undefined — raw change is{' '}
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString()}.
          </>
        )}
      </div>
    </div>
  )
}

export default function AccountDetail({ account }: { account: AccountMetric }) {
  const chartData = account.months.map((m) => ({ month: m.month, actual: m.actual }))
  const currentMou = account.mou_monthly

  return (
    <div className="rounded-lg border border-border bg-bg-panel p-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">{account.account}</h3>
        <AlertBadge state={account.alert} />
      </div>

      <TrendExplainer account={account} />

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#737373" fontSize={12} tickLine={false} axisLine={{ stroke: '#262626' }} />
            <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={{ stroke: '#262626' }} />
            <Tooltip
              contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#ededed' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="actual" name="Actual usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            {currentMou !== null && (
              <ReferenceLine
                y={currentMou}
                stroke="#eab308"
                strokeDasharray="4 4"
                label={{ value: 'MOU', position: 'right', fill: '#eab308', fontSize: 12 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
              <th className="py-1.5 pr-3">Month</th>
              <th className="py-1.5 pr-3 text-right">Actual</th>
              <th className="py-1.5 pr-3 text-right">MOU</th>
              <th className="py-1.5 text-right">% of MOU</th>
            </tr>
          </thead>
          <tbody>
            {[...account.months].reverse().map((m) => {
              const pct = m.mou ? Math.round((m.actual / m.mou) * 1000) / 10 : null
              return (
                <tr key={m.month} className="border-b border-border-subtle last:border-0">
                  <td className="py-1.5 pr-3">{m.month}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{m.actual.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-ink-muted">
                    {m.mou !== null ? m.mou.toLocaleString() : '—'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{pct !== null ? `${pct}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
