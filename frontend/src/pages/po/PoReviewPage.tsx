import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/format'
import { useAuth } from '../../state/auth'
import { poSteps } from '../steps'

interface ReviewResponse {
  snapshot: Record<string, any>
  poReview: { comments: Array<{ comment: string; createdAt: string }>; decision?: Record<string, unknown> }
  auditLedger: Array<{ event_id: string; event_type: string; event_hash: string }>
  paragraphTraces: Array<{ traceId: string; sectionId: string; sourceTransactionIds: string[]; sourceAlertIds: string[]; retrievedChunkIds: string[]; origin: string }>
}

export function PoReviewPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'summary' | 'kyc' | 'txn' | 'alerts' | 'media'>('summary')
  const [narrativeView, setNarrativeView] = useState<'final' | 'draft' | 'diff'>('final')
  const [comment, setComment] = useState('')
  const review = useAsyncData<ReviewResponse>(() => apiRequest(`/po/cases/${caseId}/review`, session), [caseId, session])
  const diff = useAsyncData<{ lines: string[] }>(() => apiRequest(`/po/cases/${caseId}/diff`, session), [caseId, session])

  if (review.loading) return <LoadingState />
  if (review.error || !review.data) return <ErrorState message={review.error ?? 'Unable to load PO review'} />

  const snapshot = review.data.snapshot
  const finalText = snapshot.narrative.finalText
  const aiDraft = snapshot.narrative.aiDraftText

  const requestInfo = async () => {
    await apiRequest(`/po/cases/${caseId}/request-information`, session, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
    navigate('/po/dashboard')
  }

  return (
    <AppShell
      role="PO"
      title="PO Review"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span>Cases</span>
          <span>›</span>
          <span className="font-mono text-xs">{caseId}</span>
          <span>›</span>
          <span className="font-medium text-copy">PO Review</span>
        </div>
      }
      sidebarSteps={poSteps(4)}
    >
      <div className="flex gap-4 p-4">
        <div className="flex w-[480px] flex-col gap-4">
          <SectionCard title="Immutable Review Dossier" subtitle="Tabs backed by the frozen analyst submission package.">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ['summary', 'Summary & Risk'],
                ['kyc', 'KYC Profile'],
                ['txn', 'Transactions'],
                ['alerts', 'Prior Alerts'],
                ['media', 'Adverse Media'],
              ].map(([key, label]) => (
                <button
                  className={`rounded-full px-3 py-1 text-xs font-medium ${tab === key ? 'bg-accentSoft text-accent' : 'bg-shell text-muted'}`}
                  key={key}
                  onClick={() => setTab(key as typeof tab)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'summary' ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
                  <div className="font-medium">{snapshot.case.customerName}</div>
                  <div className="mt-2 text-muted">{snapshot.case.summary}</div>
                </div>
                {snapshot.case.riskFactors.map((factor: any) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-white p-4 text-sm" key={factor.name}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{factor.name}</div>
                      <div className="text-danger">+{factor.contribution}</div>
                    </div>
                    <div className="mt-2 text-muted">{factor.factualBasis}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {tab === 'kyc' ? (
              <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
                <div>Primary account: {snapshot.case.primaryAccountNumber}</div>
                <div className="mt-2">Customer type: {snapshot.case.customerType}</div>
                <div className="mt-2">Submitted at: {formatDate(snapshot.submittedAt)}</div>
              </div>
            ) : null}
            {tab === 'txn' ? (
              <div className="space-y-3">
                {snapshot.transactions.map((txn: any) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={txn.transaction_id}>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs">{txn.transaction_id}</div>
                      <div className="font-semibold">{formatCurrency(txn.amount)}</div>
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      {txn.txn_timestamp} • {txn.direction} • {txn.fromBankName} → {txn.toBankName}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {tab === 'alerts' ? (
              <div className="space-y-3">
                {snapshot.validation.warnings.length ? (
                  snapshot.validation.warnings.map((warning: any) => (
                    <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={warning.rule}>
                      {warning.rule}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm text-muted">
                    No prior historical alerts available in demo dataset.
                  </div>
                )}
              </div>
            ) : null}
            {tab === 'media' ? (
              <div className="space-y-3">
                {snapshot.adverseMedia.map((item: any) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={item.adverse_media_id}>
                    <div className="font-medium">{item.headline}</div>
                    <div className="mt-2 text-xs text-muted">
                      {item.news_source} • {formatDate(item.article_date)} • {item.review.review_status}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <SectionCard title="Narrative Review Workspace" subtitle="Final version, raw AI draft, and diff are all backed by real backend payloads.">
            <div className="mb-4 flex gap-2">
              {[
                ['final', 'Final version'],
                ['draft', 'AI draft'],
                ['diff', 'Diff view'],
              ].map(([key, label]) => (
                <button
                  className={`rounded-full px-3 py-1 text-xs font-medium ${narrativeView === key ? 'bg-accentSoft text-accent' : 'bg-shell text-muted'}`}
                  key={key}
                  onClick={() => setNarrativeView(key as typeof narrativeView)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-[300px] rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm leading-7">
              {narrativeView === 'final' ? finalText : narrativeView === 'draft' ? aiDraft : diff.data?.lines.join('\n')}
            </div>
          </SectionCard>

          <SectionCard title="Sentence / Paragraph Rationale" subtitle="Trace why the selected paragraph exists and what it cites.">
            <div className="space-y-3">
              {review.data.paragraphTraces.map((trace) => (
                <div className="rounded-lg border border-[#F0EFE9] bg-white p-4 text-sm" key={trace.traceId}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{trace.sectionId}</div>
                    <div className="text-xs uppercase tracking-[0.08em] text-muted">{trace.origin}</div>
                  </div>
                  <div className="mt-2 text-xs text-muted">Transactions: {trace.sourceTransactionIds.join(', ')}</div>
                  <div className="mt-1 text-xs text-muted">Alerts: {trace.sourceAlertIds.join(', ')}</div>
                  <div className="mt-1 text-xs text-muted">Guidance: {trace.retrievedChunkIds.join(', ')}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="PO Comment and Decision"
            subtitle="Request information requires a non-empty comment. Approval advances to export."
            action={
              <div className="flex gap-3">
                <button className="btn-secondary" disabled={!comment.trim()} onClick={requestInfo}>
                  Request Information
                </button>
                <button className="btn-primary" onClick={() => navigate(`/po/cases/${caseId}/decision`)}>
                  Continue to Approval
                </button>
              </div>
            }
          >
            <textarea
              className="min-h-[140px] w-full rounded-lg border border-line bg-[#FAFAF8] p-4 text-sm outline-none focus:border-accent"
              placeholder="Enter PO review comments or return reason."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            {review.data.auditLedger.length ? (
              <div className="mt-4 rounded-lg bg-[#FAFAF8] p-4 text-sm">
                Latest ledger events:{' '}
                {review.data.auditLedger
                  .slice(-4)
                  .map((item) => `${item.event_type} (${item.event_hash.slice(0, 8)}...)`)
                  .join(' • ')}
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  )
}
