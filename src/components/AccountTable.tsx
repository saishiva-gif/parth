import { useEffect, useMemo, useState } from 'react'
import type { AccountMetric, AlertState } from '../types'
import AlertBadge from './AlertBadge'

type SortKey = 'account' | 'mtd_usage' | 'mou_monthly' | 'pct_of_mou'
type FilterKey = AlertState | 'all'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'under', label: 'Under' },
  { key: 'on_track', label: 'On track' },
  { key: 'over', label: 'Over' },
  { key: 'no_mou', label: 'No MOU' },
]

const PAGE_SIZE = 10

export default function AccountTable({
  accounts,
  onSelect,
  selected,
}: {
  accounts: AccountMetric[]
  onSelect: (account: string) => void
  selected: string | null
}) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [activeThisMonth, setActiveThisMonth] = useState(false)
  const [activeLastMonth, setActiveLastMonth] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('pct_of_mou')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: accounts.length, under: 0, on_track: 0, over: 0, no_mou: 0 }
    for (const a of accounts) c[a.alert]++
    return c
  }, [accounts])

  const activeThisMonthCount = useMemo(() => accounts.filter((a) => a.is_active).length, [accounts])
  const activeLastMonthCount = useMemo(() => accounts.filter((a) => a.is_active_last_month).length, [accounts])

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = accounts.filter((a) => filter === 'all' || a.alert === filter)
    if (activeThisMonth) {
      rows = rows.filter((a) => a.is_active)
    }
    if (activeLastMonth) {
      rows = rows.filter((a) => a.is_active_last_month)
    }
    if (q) {
      rows = rows.filter(
        (a) => a.account.toLowerCase().includes(q) || a.databricks_username.toLowerCase().includes(q),
      )
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const an = av === null ? -Infinity : av
      const bn = bv === null ? -Infinity : bv
      if (typeof an === 'string' || typeof bn === 'string') {
        return sortDir === 'asc' ? String(an).localeCompare(String(bn)) : String(bn).localeCompare(String(an))
      }
      return sortDir === 'asc' ? (an as number) - (bn as number) : (bn as number) - (an as number)
    })
    return rows
  }, [accounts, filter, activeThisMonth, activeLastMonth, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)
  const pageRows = filteredSorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filter, activeThisMonth, activeLastMonth, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function exportCsv() {
    const header = [
      'Account',
      'Databricks username',
      'MTD usage',
      'MOU',
      '% of MOU (paced)',
      'Projected (paced)',
      'Status',
      'Trend WoW %',
      'Active this month',
      'Active last month',
    ]
    const esc = (v: string | number | null) => {
      if (v === null) return ''
      const s = String(v)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = filteredSorted.map((a) =>
      [
        a.account,
        a.databricks_username,
        a.mtd_usage,
        a.mou_monthly,
        a.pct_of_mou === null ? null : a.pct_of_mou.toFixed(1),
        a.pace_projected,
        a.alert,
        a.trend_wow_pct === null ? null : a.trend_wow_pct.toFixed(1),
        a.is_active ? 'yes' : 'no',
        a.is_active_last_month ? 'yes' : 'no',
      ]
        .map(esc)
        .join(','),
    )
    const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `accounts-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg-panel">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[220px]">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            viewBox="0 0 20 20"
            fill="none"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M17 17l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts…"
            className="w-full rounded-md border border-border bg-bg py-1.5 pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-bg-raised text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {f.label}
              <span className="ml-1 text-ink-faint">{counts[f.key]}</span>
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={() => setActiveThisMonth((v) => !v)}
            title="Usage &gt; 0 so far this month"
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeThisMonth ? 'bg-bg-raised text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${activeThisMonth ? 'bg-good' : 'bg-ink-faint'}`}
            />
            Active this month
            <span className="ml-1 text-ink-faint">{activeThisMonthCount}</span>
          </button>
          <button
            onClick={() => setActiveLastMonth((v) => !v)}
            title="Usage &gt; 0 in the previous fully completed calendar month — useful early in a new month before this month's data has caught up"
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeLastMonth ? 'bg-bg-raised text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${activeLastMonth ? 'bg-good' : 'bg-ink-faint'}`}
            />
            Active last month
            <span className="ml-1 text-ink-faint">{activeLastMonthCount}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
              <Th label="Account" onClick={() => toggleSort('account')} active={sortKey === 'account'} dir={sortDir} />
              <Th
                label="MTD Usage"
                onClick={() => toggleSort('mtd_usage')}
                active={sortKey === 'mtd_usage'}
                dir={sortDir}
                align="right"
              />
              <Th
                label="MOU"
                onClick={() => toggleSort('mou_monthly')}
                active={sortKey === 'mou_monthly'}
                dir={sortDir}
                align="right"
              />
              <Th
                label="% of MOU (paced)"
                onClick={() => toggleSort('pct_of_mou')}
                active={sortKey === 'pct_of_mou'}
                dir={sortDir}
                align="right"
              />
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right" title="% change between the last two fully completed weeks (Mon–Sun). The current, in-progress week is never included.">
                Trend (WoW)
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((a) => (
              <tr
                key={a.account}
                onClick={() => onSelect(a.account)}
                className={`cursor-pointer border-b border-border-subtle last:border-0 hover:bg-bg-raised ${
                  selected === a.account ? 'bg-bg-raised' : ''
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${a.is_active ? 'bg-good' : 'bg-ink-faint/40'}`}
                      title={a.is_active ? 'Active this month' : 'No usage yet this month'}
                    />
                    <div className="min-w-0 flex-1 truncate font-medium" title={a.account}>
                      {a.account}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{a.mtd_usage.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                  {a.mou_monthly !== null ? a.mou_monthly.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {a.pct_of_mou !== null ? `${a.pct_of_mou.toFixed(0)}%` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <AlertBadge state={a.alert} />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                  {a.trend_wow_pct !== null ? `${a.trend_wow_pct > 0 ? '+' : ''}${a.trend_wow_pct.toFixed(0)}%` : '—'}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-faint">
                  No accounts match {search ? `"${search}"` : 'this filter'}.
                </td>
              </tr>
            )}
            {pageRows.length > 0 &&
              Array.from({ length: PAGE_SIZE - pageRows.length }).map((_, i) => (
                <tr key={`filler-${i}`} aria-hidden="true">
                  <td className="px-4 py-2.5" colSpan={6}>
                    &nbsp;
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-2.5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span>
            {filteredSorted.length === 0
              ? '0 results'
              : `${(clampedPage - 1) * PAGE_SIZE + 1}–${Math.min(clampedPage * PAGE_SIZE, filteredSorted.length)} of ${filteredSorted.length}`}
          </span>
          <button
            onClick={exportCsv}
            disabled={filteredSorted.length === 0}
            title="Download all rows matching the current filters and sort as CSV"
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-ink"
          >
            Export CSV
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-ink"
          >
            Prev
          </button>
          <span className="px-1.5 tabular-nums">
            {clampedPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            className="rounded-md border border-border px-2 py-1 disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-ink"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function Th({
  label,
  onClick,
  active,
  dir,
  align = 'left',
}: {
  label: string
  onClick: () => void
  active: boolean
  dir: 'asc' | 'desc'
  align?: 'left' | 'right'
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-4 py-2.5 hover:text-ink ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {label}
      {active && <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}
