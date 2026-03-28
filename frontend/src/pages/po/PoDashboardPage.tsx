import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { ErrorState, KpiCard, LoadingState, MetricValue, SlaPill, StatusBadge } from '../../components/common'
import { RiskWorldMap } from '../../components/RiskWorldMap'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../state/auth'
import type { CaseItem } from '../../types'

interface PoSummary {
  totalOpenCases: number
  totalValueAtRisk: number
  avgResolutionTimeHours: number
  pendingYourApproval: number
  actionRequired: Array<{ caseId: string; subject: string; analyst: string; slaRemaining: string; reason: string }>
}

interface PoCaseItem extends CaseItem {
  analystName: string
  urgencyReason: string
}

export function PoDashboardPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([])
  const summary = useAsyncData<PoSummary>(() => apiRequest('/po/dashboard/summary', session), [session])
  const queue = useAsyncData<PoCaseItem[]>(() => apiRequest(`/po/cases?search=${encodeURIComponent(search)}`, session), [search, session])
  const map = useAsyncData<{ nodes: Array<any> }>(() => apiRequest('/po/map-risk', session), [session])
  const weekly = useAsyncData<Array<{ date: string; submitted: number; approved: number }>>(
    () => apiRequest('/po/analytics/weekly-filings', session),
    [session],
  )
  const analysts = useAsyncData<Array<{ analyst: string; activeCases: number; avgTurnaroundHours: number; slaRiskCount: number }>>(
    () => apiRequest('/po/analytics/analyst-performance', session),
    [session],
  )

  const visibleQueue = useMemo(() => {
    if (!selectedCaseIds.length) {
      return queue.data ?? []
    }
    return (queue.data ?? []).filter((item) => selectedCaseIds.includes(item.caseId))
  }, [queue.data, selectedCaseIds])

  return (
    <AppShell role="PO" title="PO Dashboard" breadcrumb={<span>Dashboard</span>} search={search} setSearch={setSearch}>
      <div className="mx-auto w-full max-w-[1400px] px-8 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Compliance Overview</h1>
          <p className="mt-1 text-sm text-muted">Live metrics, filing throughput, and explainable geographic hotspots.</p>
        </div>
        {summary.loading ? <LoadingState /> : null}
        {summary.error ? <ErrorState message={summary.error} /> : null}
        {summary.data ? (
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard title="Total open cases" value={summary.data.totalOpenCases} />
            <KpiCard title="Total Value at Risk" tone="danger" value={<MetricValue amount={summary.data.totalValueAtRisk} />} />
            <KpiCard title="Avg resolution time (hrs)" value={summary.data.avgResolutionTimeHours} />
            <KpiCard title="Pending your approval" tone="warn" value={summary.data.pendingYourApproval} />
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-[15px] font-semibold">Global Risk &amp; Origination Map</h2>
                <p className="mt-1 text-xs text-muted">Bundled world geometry with deterministic city-level hotspots from linked suspicious activity.</p>
              </div>
              {selectedCaseIds.length ? (
                <button className="btn-secondary h-8 px-3 text-xs" onClick={() => setSelectedCaseIds([])}>
                  Clear map filter
                </button>
              ) : null}
            </div>
            {map.loading ? <LoadingState /> : map.data ? <RiskWorldMap nodes={map.data.nodes} onSelect={setSelectedCaseIds} /> : null}
          </div>

          <div className="space-y-6">
            <div className="panel p-5">
              <h2 className="text-[15px] font-semibold">Action Required</h2>
              <p className="mt-1 text-xs text-muted">Sorted by SLA urgency, risk score, value at risk, and submission age.</p>
              <div className="mt-4 space-y-3">
                {summary.data?.actionRequired.map((item) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={item.caseId}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-xs text-accent">{item.caseId}</div>
                        <div className="mt-1 font-medium">{item.subject}</div>
                        <div className="mt-1 text-xs text-muted">
                          {item.analyst} • {item.reason}
                        </div>
                      </div>
                      <Link className="btn-secondary h-8 px-3 text-xs" to={`/po/cases/${item.caseId}/review`}>
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="text-[15px] font-semibold">Weekly SAR Inventory</h2>
              <div className="mt-4 space-y-3">
                {weekly.data?.map((point) => (
                  <div className="grid grid-cols-[88px_1fr_1fr] items-center gap-3 text-sm" key={point.date}>
                    <div className="font-mono text-xs text-muted">{point.date}</div>
                    <div className="rounded-full bg-accentSoft">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(point.submitted * 28, 8)}px` }} />
                    </div>
                    <div className="rounded-full bg-green-100">
                      <div className="h-2 rounded-full bg-success" style={{ width: `${Math.max(point.approved * 28, 8)}px` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel overflow-hidden">
            <div className="border-b border-line bg-[#FAFAF8] px-5 py-4">
              <h2 className="text-[15px] font-semibold">Principal Officer Queue</h2>
            </div>
            <table className="w-full">
              <thead className="bg-white text-left text-[11px] uppercase tracking-[0.05em] text-muted">
                <tr className="border-b border-[#F0EFE9]">
                  <th className="px-4 py-3">Case</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Analyst</th>
                  <th className="px-3 py-3">SLA</th>
                  <th className="px-3 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.loading ? (
                  <tr>
                    <td className="px-4 py-5 text-sm text-muted" colSpan={5}>
                      Loading PO queue...
                    </td>
                  </tr>
                ) : null}
                {visibleQueue.map((item) => (
                  <tr className="border-b border-[#F0EFE9] last:border-b-0" key={item.caseId}>
                    <td className="px-4 py-4">
                      <Link className="font-mono text-xs text-accent" to={`/po/cases/${item.caseId}/review`}>
                        {item.caseId}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm font-medium">{item.customerName}</td>
                    <td className="px-3 py-4 text-sm text-muted">{item.analystName}</td>
                    <td className="px-3 py-4">
                      <SlaPill label={item.sla.display} status={item.sla.status} />
                    </td>
                    <td className="px-3 py-4 text-right">
                      <StatusBadge value={item.stage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold">Analyst Performance</h2>
            <div className="mt-4 space-y-3">
              {analysts.data?.map((row) => (
                <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={row.analyst}>
                  <div className="font-medium">{row.analyst}</div>
                  <div className="mt-2 text-xs text-muted">
                    {row.activeCases} active cases • {row.avgTurnaroundHours} hrs avg turnaround • {row.slaRiskCount} SLA-risk items
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
