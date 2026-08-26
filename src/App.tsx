import { useCallback, useEffect, useState } from 'react'
import { fetchDashboardData } from './api'
import type { DashboardData, Metric } from './types'
import Tabs from './components/Tabs'
import SummaryStrip from './components/SummaryStrip'
import AccountTable from './components/AccountTable'
import AccountDetail from './components/AccountDetail'
import MouEditor from './components/MouEditor'

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Metric>('NDR_AI_AGENT_WITHOUT_VOICEMAIL')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [editingMous, setEditingMous] = useState(false)

  const reload = useCallback(() => {
    fetchDashboardData()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-bad/30 bg-bad/5 p-4 text-sm text-bad">
          Failed to load dashboard: {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-ink-muted">Loading…</div>
      </div>
    )
  }

  const block = data.metrics[tab]
  const selected = block.accounts.find((a) => a.account === selectedAccount) ?? null

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Parth Usage &amp; MOU Tracker</h1>
            <p className="mt-0.5 text-xs text-ink-faint">
              Data through {data.fetched_through ?? '—'} · generated {new Date(data.generated_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setEditingMous(true)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            Manage MOUs
          </button>
        </div>
      </div>

      {editingMous && (
        <MouEditor
          onClose={() => setEditingMous(false)}
          onSaved={() => {
            setEditingMous(false)
            reload()
          }}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs
          active={tab}
          onChange={(m) => {
            setTab(m)
            setSelectedAccount(null)
          }}
        />

        <div className="mt-6 space-y-6">
          <SummaryStrip summary={block.summary} />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <AccountTable accounts={block.accounts} onSelect={setSelectedAccount} selected={selectedAccount} />
            </div>
            <div className="xl:col-span-2">
              {selected ? (
                <AccountDetail account={selected} />
              ) : (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 text-center">
                  <p className="text-sm text-ink-muted">Select an account</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    Click a row in the table to see its month-over-month usage against MOU.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
