export type Metric = 'NDR_AI_AGENT_WITHOUT_VOICEMAIL' | 'ORDER_CONFIRMATION_WITHOUT_VOICEMAIL'

export type AlertState = 'under' | 'on_track' | 'over' | 'no_mou'

export interface MonthUsage {
  month: string // "2026-07"
  actual: number
  mou: number | null
}

export interface AccountMetric {
  account: string
  databricks_username: string
  mou_monthly: number | null
  mtd_usage: number
  is_active: boolean
  pace_projected: number
  pct_of_mou: number | null
  alert: AlertState
  trend_wow_pct: number | null
  months: MonthUsage[]
}

export interface MetricSummary {
  under: number
  on_track: number
  over: number
  no_mou: number
  active: number
  total_mtd_usage: number
  total_mou: number
}

export interface MetricBlock {
  summary: MetricSummary
  accounts: AccountMetric[]
}

export interface DashboardData {
  generated_at: string
  fetched_through: string | null
  thresholds: { under_pct: number; over_pct: number }
  metrics: Record<Metric, MetricBlock>
}

export const METRIC_LABELS: Record<Metric, string> = {
  NDR_AI_AGENT_WITHOUT_VOICEMAIL: 'NDR',
  ORDER_CONFIRMATION_WITHOUT_VOICEMAIL: 'Order Confirmation',
}

export interface MouRow {
  id: string | null
  databricks_username: string
  metric: Metric
  mou_monthly: number
  effective_from: string
  effective_to: string | null
}
