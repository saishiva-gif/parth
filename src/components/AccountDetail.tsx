import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AccountMetric } from '../types'
import AlertBadge from './AlertBadge'

export default function AccountDetail({ account }: { account: AccountMetric }) {
  const chartData = account.months.map((m) => ({ month: m.month, actual: m.actual }))
  const currentMou = account.mou_monthly

  return (
    <div className="rounded-lg border border-border bg-bg-panel p-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">{account.account}</h3>
        <AlertBadge state={account.alert} />
      </div>

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
