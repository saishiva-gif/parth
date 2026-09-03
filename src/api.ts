import type { DashboardData, MouRow } from './types'

export async function fetchDashboardData(): Promise<DashboardData> {
  const res = await fetch('/api/data')
  if (!res.ok) {
    throw new Error(`Failed to load dashboard data: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function fetchMous(): Promise<MouRow[]> {
  const res = await fetch('/api/mous')
  if (!res.ok) {
    throw new Error(`Failed to load MOU config: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.rows
}

export interface SyncResult {
  status: 'ok' | 'noop' | 'error'
  rows_fetched?: number
  fetched_through?: string | null
  reason?: string
  error?: string
}

export async function triggerSync(): Promise<SyncResult> {
  const res = await fetch('/api/sync')
  const data = await res.json()
  if (!res.ok || data.status === 'error') {
    throw new Error(data.error || `Sync failed: ${res.status}`)
  }
  return data
}

export async function fetchKnownUsernames(): Promise<string[]> {
  const res = await fetch('/api/usernames')
  if (!res.ok) {
    throw new Error(`Failed to load usernames: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.usernames
}

export async function saveMous(rows: MouRow[]): Promise<MouRow[]> {
  const res = await fetch('/api/mous', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Failed to save MOU config: ${res.status}`)
  }
  return data.rows
}
