import { useEffect, useState } from 'react'
import { fetchKnownUsernames, fetchMous, saveMous } from '../api'
import type { Metric, MouRow } from '../types'
import { METRIC_LABELS } from '../types'
import DatePicker from './DatePicker'
import UsernameAutocomplete from './UsernameAutocomplete'

const METRIC_OPTIONS: Metric[] = ['NDR_AI_AGENT_WITHOUT_VOICEMAIL', 'ORDER_CONFIRMATION_WITHOUT_VOICEMAIL']

function newRow(): MouRow {
  return {
    id: crypto.randomUUID(),
    databricks_username: '',
    metric: 'NDR_AI_AGENT_WITHOUT_VOICEMAIL',
    mou_monthly: 0,
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: null,
  }
}

export default function MouEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<MouRow[] | null>(null)
  const [usernames, setUsernames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMous()
      .then(setRows)
      .catch((e) => setError(e.message))
    fetchKnownUsernames()
      .then(setUsernames)
      .catch(() => setUsernames([]))
  }, [])

  function update(id: string | null, patch: Partial<MouRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev))
  }

  function removeRow(id: string | null) {
    setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev))
  }

  function addRow() {
    setRows((prev) => [...(prev ?? []), newRow()])
  }

  async function handleSave() {
    if (!rows) return
    setSaving(true)
    setError(null)
    try {
      const saved = await saveMous(rows)
      setRows(saved)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Manage MOUs</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {error && (
            <div className="mb-3 rounded-md border border-bad/30 bg-bad/5 px-3 py-2 text-xs text-bad">{error}</div>
          )}

          {!rows ? (
            <div className="py-8 text-center text-sm text-ink-muted">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                  <th className="py-1.5 pr-2">Databricks username</th>
                  <th className="py-1.5 pr-2">Metric</th>
                  <th className="py-1.5 pr-2 text-right">MOU / month</th>
                  <th className="py-1.5 pr-2">Effective from</th>
                  <th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0">
                    <td className="w-48 py-1.5 pr-2 align-top">
                      <UsernameAutocomplete
                        value={r.databricks_username}
                        onChange={(v) => update(r.id, { databricks_username: v })}
                        suggestions={usernames}
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <select
                        className="w-full rounded-md border border-border bg-bg px-2 py-1 text-ink outline-none focus:border-accent"
                        value={r.metric}
                        onChange={(e) => update(r.id, { metric: e.target.value as Metric })}
                      >
                        {METRIC_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {METRIC_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2 text-right align-top">
                      <input
                        type="number"
                        min={0}
                        className="w-24 rounded-md border border-border bg-bg px-2 py-1 text-right text-ink outline-none focus:border-accent"
                        value={r.mou_monthly}
                        onChange={(e) => update(r.id, { mou_monthly: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <DatePicker value={r.effective_from} onChange={(v) => update(r.id, { effective_from: v })} />
                    </td>
                    <td className="py-1.5 text-right align-top">
                      <button
                        onClick={() => removeRow(r.id)}
                        className="text-ink-faint hover:text-bad"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {rows && (
            <button
              onClick={addRow}
              className="mt-3 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-ink-muted hover:border-accent hover:text-ink"
            >
              + Add row
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="max-w-[280px] text-xs text-ink-faint">
            Username shown with an amber border isn't seen in Databricks usage yet — check for a typo.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              disabled={saving || !rows}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
