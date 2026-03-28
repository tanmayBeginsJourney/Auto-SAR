import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { EmptyState, ErrorState, KpiCard, LoadingState, MetricValue, SlaPill, StatusBadge } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../state/auth'
import type { AlertItem, CaseItem } from '../../types'

interface DashboardSummary {
  openAlerts: number
  breachingSla: number
  inProgress: number
  pendingPoReview: number
  activeCaseCount: number
  subtitle: string
}

export function AnalystDashboardPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const summary = useAsyncData<DashboardSummary>(() => apiRequest('/dashboard/summary', session), [session])
  const cases = useAsyncData<CaseItem[]>(
    () =>
      apiRequest(
        `/cases?search=${encodeURIComponent(search)}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}`,
        session,
      ),
    [search, session, statusFilter],
  )

  const alertMap = useAsyncData<Record<string, AlertItem[]>>(
    async () => {
      const result: Record<string, AlertItem[]> = {}
      const items = cases.data ?? []
      await Promise.all(
        items.map(async (item) => {
          result[item.caseId] = expanded.includes(item.caseId)
            ? await apiRequest(`/cases/${item.caseId}/alerts`, session)
            : []
        }),
      )
      return result
    },
    [expanded, cases.data, session],
  )

  const filtered = useMemo(() => cases.data ?? [], [cases.data])

  return (
    <AppShell
      role="ANALYST"
      title="Analyst Queue"
      breadcrumb={<span>Dashboard</span>}
      search={search}
      setSearch={setSearch}
    >
      <div className="w-full max-w-[1400px] px-6 py-6">
        {summary.loading ? <LoadingState /> : null}
        {summary.error ? <ErrorState message={summary.error} /> : null}
        {summary.data ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard title="Open alerts" value={summary.data.openAlerts} />
              <KpiCard title="Breaching SLA" tone="danger" value={summary.data.breachingSla} />
              <KpiCard title="In progress" value={summary.data.inProgress} />
              <KpiCard title="Pending PO review" value={summary.data.pendingPoReview} />
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <h1 className="text-lg font-semibold">My Dashboard</h1>
                <p className="mt-1 text-sm text-muted">{summary.data.subtitle}</p>
              </div>
              <select className="input bg-white text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="RFI_REQUESTED">RFI requested</option>
              </select>
            </div>
          </>
        ) : null}

        <div className="panel mt-5 overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#F0EFE9] text-left text-[11px] uppercase tracking-[0.05em] text-muted">
                <th className="w-10 px-4 py-3" />
                <th className="px-3 py-3">Case ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3 text-center">Total Alerts</th>
                <th className="px-3 py-3 text-right">Total Amount</th>
                <th className="px-3 py-3">Max Risk</th>
                <th className="px-3 py-3">SLA Remaining</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {cases.loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted" colSpan={8}>
                    Loading analyst queue...
                  </td>
                </tr>
              ) : null}
              {!cases.loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={8}>
                    <EmptyState title="No cases match the current filters" body="Try clearing search or status filters." />
                  </td>
                </tr>
              ) : null}
              {filtered.map((item) => {
                const isOpen = expanded.includes(item.caseId)
                const alerts = alertMap.data?.[item.caseId] ?? []
                return (
                  <Fragment key={item.caseId}>
                    <tr
                      className="cursor-pointer border-b border-[#F0EFE9] hover:bg-[#FAFAF8]"
                      onClick={() =>
                        setExpanded((current) =>
                          current.includes(item.caseId) ? current.filter((value) => value !== item.caseId) : [...current, item.caseId],
                        )
                      }
                    >
                      <td className="px-4 py-4 text-center text-muted">{isOpen ? '−' : '+'}</td>
                      <td className="px-3 py-4">
                        <Link className="font-mono text-sm font-medium text-accent" to={`/cases/${item.caseId}/data-assembly`}>
                          {item.caseId}
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-sm font-medium">{item.customerName}</td>
                      <td className="px-3 py-4 text-center text-sm">{item.totalAlerts}</td>
                      <td className="px-3 py-4 text-right text-sm">
                        <MetricValue amount={item.totalAmount} />
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 text-xs font-semibold">{item.riskScore}</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F0EFE9]">
                            <div className="h-full rounded-full bg-danger" style={{ width: `${item.riskScore}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <SlaPill label={item.sla.display} status={item.sla.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge value={item.stage} />
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="bg-[#FAFAF8]">
                        <td colSpan={8} className="px-12 py-4">
                          <div className="rounded-lg border border-line bg-white p-4">
                            {alerts.map((alert) => (
                              <div className="mb-5 last:mb-0" key={alert.alert_id}>
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="rounded-md bg-red-50 px-3 py-1 text-[11px] font-medium text-danger">
                                    Alert: {alert.alert_name}
                                  </span>
                                  <span className="font-mono text-[11px] text-muted">{alert.alert_id}</span>
                                </div>
                                <div className="mb-2 text-sm text-copy">{alert.explanation}</div>
                                <table className="w-full text-sm">
                                  <tbody>
                                    {alert.transactions.map((txn) => (
                                      <tr className="border-b border-[#F0EFE9] last:border-b-0" key={`${alert.alert_id}-${txn.transaction_id}`}>
                                        <td className="py-2 font-mono text-xs text-copy">{txn.transaction_id}</td>
                                        <td className="py-2 text-xs text-muted">
                                          {txn.txn_timestamp} • {txn.payment_format} • {txn.scenario_group}
                                        </td>
                                        <td className="py-2 text-right text-sm font-medium">
                                          <MetricValue amount={Math.abs(txn.signedAmount)} />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
