import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { CaseHeader } from '../../components/CaseHeader'
import { EmptyState, ErrorState, LoadingState, SectionCard, ValueRow } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { formatCurrency, formatDate, maskValue } from '../../lib/format'
import { useAuth } from '../../state/auth'
import type { AlertItem, CaseItem, TransactionItem } from '../../types'
import { analystSteps } from '../steps'

export function DataAssemblyPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [piiMasked, setPiiMasked] = useState(true)
  const [tab, setTab] = useState<'kyc' | 'txn' | 'alerts' | 'graph'>('kyc')
  const caseQuery = useAsyncData<CaseItem>(() => apiRequest(`/cases/${caseId}`, session), [caseId, session])
  const kyc = useAsyncData<Record<string, unknown>>(() => apiRequest(`/cases/${caseId}/kyc`, session), [caseId, session])
  const transactions = useAsyncData<TransactionItem[]>(() => apiRequest(`/cases/${caseId}/transactions`, session), [caseId, session])
  const alerts = useAsyncData<AlertItem[]>(() => apiRequest(`/cases/${caseId}/alerts`, session), [caseId, session])
  const priorAlerts = useAsyncData<Array<Record<string, unknown>>>(() => apiRequest(`/cases/${caseId}/prior-alerts`, session), [caseId, session])
  const graph = useAsyncData<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }>(
    () => apiRequest(`/cases/${caseId}/entity-graph`, session),
    [caseId, session],
  )
  const adverseMedia = useAsyncData<Array<Record<string, unknown>>>(() => apiRequest(`/cases/${caseId}/adverse-media`, session), [caseId, session])

  const continueFlow = async () => {
    if (!caseQuery.data?.canAnalystEdit) return
    await apiRequest(`/cases/${caseId}/data-assembly/complete-stage`, session, {
      method: 'POST',
      body: JSON.stringify({ note: 'Analyst completed data assembly review' }),
    })
    navigate(`/cases/${caseId}/str-autofill`)
  }

  if (caseQuery.loading) {
    return <LoadingState />
  }
  if (caseQuery.error || !caseQuery.data) {
    return <ErrorState message={caseQuery.error ?? 'Case not found'} />
  }

  const subject = kyc.data as Record<string, unknown> | null

  return (
    <AppShell
      role="ANALYST"
      title="Data Assembly"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span>Cases</span>
          <span>›</span>
          <span className="font-medium text-copy">Data Assembly</span>
        </div>
      }
      sidebarSteps={analystSteps(0)}
    >
      <CaseHeader caseItem={caseQuery.data} onToggleMask={() => setPiiMasked((value) => !value)} piiMasked={piiMasked} />
      <div className="flex flex-1 gap-4 p-4">
        <div className="panel flex w-[480px] flex-col overflow-hidden">
          <div className="flex border-b border-line px-4">
            {[
              ['kyc', 'KYC Profile'],
              ['txn', `Transactions (${transactions.data?.length ?? 0})`],
              ['alerts', `Prior Alerts (${priorAlerts.data?.length ?? 0})`],
              ['graph', 'Entity Graph'],
            ].map(([key, label]) => (
              <button
                className={`mr-5 border-b-2 px-1 py-3 text-sm font-medium ${tab === key ? 'border-accent text-accent' : 'border-transparent text-muted'}`}
                key={key}
                onClick={() => setTab(key as typeof tab)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'kyc' && subject ? (
              <>
                <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.05em] text-muted">Subject details</div>
                <ValueRow label="Customer Name" value={String(subject.customerName)} />
                <ValueRow label="Customer ID / PAN" value={`${piiMasked ? maskValue(String(subject.customerId)) : subject.customerId} / ${piiMasked ? maskValue(String(subject.pan)) : subject.pan}`} masked={piiMasked} />
                <ValueRow label="Occupation or Business" value={String(subject.occupationOrBusiness)} />
                <ValueRow label="Declared Income" value={String(subject.declaredIncome)} />
                <ValueRow label="Risk Tier" value={String(subject.riskTier)} />
                <ValueRow label="KYC Status" value={String(subject.kycStatus)} />
                <ValueRow label="Watchlist Status" value={String(subject.watchlistStatus)} />
                <ValueRow label="Last CDD Refresh" value={formatDate(String(subject.lastCddRefresh))} />
                <div className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-[0.05em] text-muted">Primary account</div>
                <ValueRow label="Account Number" value={piiMasked ? maskValue(String((subject.primaryAccount as Record<string, unknown>).accountNumber)) : String((subject.primaryAccount as Record<string, unknown>).accountNumber)} masked={piiMasked} />
                <ValueRow label="Account Type" value={String((subject.primaryAccount as Record<string, unknown>).accountType)} />
                <ValueRow label="Branch City" value={String((subject.primaryAccount as Record<string, unknown>).branchCity)} />
                <ValueRow label="Account Status" value={String((subject.primaryAccount as Record<string, unknown>).accountStatus)} />
              </>
            ) : null}

            {tab === 'txn' ? (
              <div className="space-y-3">
                {transactions.data?.map((txn) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-3" key={txn.transaction_id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs text-copy">{txn.transaction_id}</div>
                        <div className="mt-1 text-xs text-muted">
                          {txn.txn_timestamp} • {txn.payment_format} • {txn.direction}
                        </div>
                        <div className="mt-2 text-xs text-muted">
                          {txn.branch_city} • {txn.channel} • {txn.scenario_group}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(Math.abs(txn.signedAmount))}</div>
                        <div className="mt-1 text-xs text-muted">{txn.counterpartyLabel}</div>
                      </div>
                    </div>
                  </div>
                )) ?? <EmptyState title="No suspicious transactions" body="No linked transactions were found for this case." />}
              </div>
            ) : null}

            {tab === 'alerts' ? (
              priorAlerts.data?.length ? (
                <div className="space-y-3">
                  {priorAlerts.data.map((alert) => (
                    <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-3" key={String(alert.alert_id)}>
                      <div className="font-mono text-xs text-copy">{String(alert.alert_id)}</div>
                      <div className="mt-2 text-sm text-copy">{String(alert.alert_name)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No prior historical alerts available in demo dataset" body="The minimal SQLite build does not include a separate closed-alert history table for this subject." />
              )
            ) : null}

            {tab === 'graph' ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4">
                  <div className="text-sm font-semibold">Lightweight network preview</div>
                  <div className="mt-1 text-sm text-muted">
                    {graph.data?.nodes.length ?? 0} nodes • {graph.data?.edges.length ?? 0} edges
                  </div>
                </div>
                {graph.data?.edges.map((edge, index) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-white p-3 text-sm" key={index}>
                    {String(edge.source)} → {String(edge.target)} <span className="text-muted">({String(edge.label)})</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <SectionCard title="Adverse Media" subtitle="Review whether any matched hits are relevant before proceeding.">
            {adverseMedia.loading ? <div className="text-sm text-muted">Loading media hits...</div> : null}
            {!adverseMedia.loading && !adverseMedia.data?.length ? (
              <EmptyState title="No adverse media results available for this subject" body="The analyst can still continue once the panel has been loaded." />
            ) : null}
            <div className="space-y-3">
              {adverseMedia.data?.map((item) => {
                const review = (item.review as Record<string, unknown> | undefined) ?? { review_status: 'UNREVIEWED' }
                const reviewed = String(review.review_status) === 'RELEVANT'
                return (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4" key={String(item.adverse_media_id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{String(item.news_source)}</div>
                        <div className="mt-2 text-sm font-medium">{String(item.headline)}</div>
                        <div className="mt-2 text-xs text-muted">
                          {formatDate(String(item.article_date))} • Match confidence {String(item.match_confidence)}
                        </div>
                      </div>
                      <button
                        className={reviewed ? 'btn-secondary h-9' : 'btn-primary h-9'}
                        onClick={async () => {
                          await apiRequest(`/cases/${caseId}/adverse-media-review`, session, {
                            method: 'PUT',
                            body: JSON.stringify({
                              adverse_media_id: item.adverse_media_id,
                              review_status: reviewed ? 'NOT_RELEVANT' : 'RELEVANT',
                            }),
                          })
                          await adverseMedia.reload()
                        }}
                      >
                        {reviewed ? 'Marked Relevant' : 'Mark Relevant'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Case Readiness"
            subtitle="Continue once the subject, account, alerts, linked transactions, and adverse-media pane are all present."
            action={
              <button className="btn-primary" disabled={!caseQuery.data.canAnalystEdit} onClick={continueFlow}>
                Verified. Continue to STR Autofill
              </button>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
                <div className="font-medium">Alerts linked</div>
                <div className="mt-1 text-muted">{alerts.data?.length ?? 0} alert(s)</div>
              </div>
              <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
                <div className="font-medium">Transactions deduplicated</div>
                <div className="mt-1 text-muted">{transactions.data?.length ?? 0} transaction(s)</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  )
}
