export type Metric = 'NDR_AI_AGENT_WITHOUT_VOICEMAIL' | 'ORDER_CONFIRMATION_WITHOUT_VOICEMAIL'

export type AlertState = 'under' | 'on_track' | 'over' | 'no_mou'

export interface MonthUsage {
  month: string // "2026-07"
  actual: number
  mou: number | null
}

export interface WeekUsage {
  start: string // "2026-08-17"
  end: string // "2026-08-23"
  total: number
}

export interface TrendDetail {
  previous_week: WeekUsage
  latest_week: WeekUsage
  pct: number | null // null when previous_week.total is 0 (undefined % change)
}

export interface AccountMetric {
  account: string
  databricks_username: string
  mou_monthly: number | null
  mtd_usage: number
  is_active: boolean
  is_active_last_month: boolean
  pace_projected: number
  pct_of_mou: number | null
  alert: AlertState
  trend_wow_pct: number | null
  trend_wow_detail: TrendDetail | null
  months: MonthUsage[]
}

export interface MetricSummary {
  under: number
  on_track: number
  over: number
  no_mou: number
  active: number
  active_last_month: number
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
