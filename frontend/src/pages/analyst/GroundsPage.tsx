import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { CaseHeader } from '../../components/CaseHeader'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { compactHash } from '../../lib/format'
import { useAuth } from '../../state/auth'
import type { CaseItem } from '../../types'
import { analystSteps } from '../steps'

interface GroundsResponse {
  case: CaseItem
  narrative: {
    finalText: string
    aiDraftText: string
    sections: Array<{ id: string; title: string; text: string }>
    retrievedGuidance: Array<{ chunkId: string; source: string; excerpt: string }>
    paragraphTraces: Array<{ traceId: string; sectionId: string; sourceTransactionIds: string[]; sourceAlertIds: string[]; retrievedChunkIds: string[]; origin: string }>
    complianceCheck?: { passed: boolean; checks: Array<{ rule: string; pass: boolean }> }
  }
  dossier: {
    risk: { riskFactors: Array<{ name: string; contribution: number; factualBasis: string }> }
    alerts: Array<{ alert_id: string; alert_name: string }>
    transactions: Array<{ transaction_id: string; txn_timestamp: string; amount: number }>
  }
}

export function GroundsPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [piiMasked, setPiiMasked] = useState(true)
  const [copilotQuestion, setCopilotQuestion] = useState('Why is this suspicious?')
  const [copilotAnswer, setCopilotAnswer] = useState('')
  const grounds = useAsyncData<GroundsResponse>(() => apiRequest(`/cases/${caseId}/grounds`, session), [caseId, session])
  const [draftText, setDraftText] = useState('')
  const narrativeAudit = useAsyncData<{
    promptVersion?: string
    retrievedGuidance: Array<{ chunkId: string; source: string; excerpt: string }>
    paragraphTraces: Array<{ traceId: string; sectionId: string; sourceTransactionIds: string[]; sourceAlertIds: string[]; retrievedChunkIds: string[]; origin: string }>
  }>(() => apiRequest(`/cases/${caseId}/narrative/audit`, session), [caseId, session, grounds.data?.narrative.finalText])

  const finalText = draftText || grounds.data?.narrative.finalText || ''

  const save = async () => {
    if (!caseItem?.canAnalystEdit) return
    const saved = await apiRequest<GroundsResponse['narrative']>(`/cases/${caseId}/narrative`, session, {
      method: 'PUT',
      body: JSON.stringify({ final_text: finalText, sections: [], edit_reason: 'Analyst review edit' }),
    })
    setDraftText(saved.finalText)
    await grounds.reload()
    await narrativeAudit.reload()
  }

  const generate = async () => {
    if (!caseItem?.canAnalystEdit) return
    const generated = await apiRequest<GroundsResponse['narrative']>(`/cases/${caseId}/narrative/generate`, session, {
      method: 'POST',
      body: JSON.stringify({ regenerate: false }),
    })
    setDraftText(generated.finalText)
    await grounds.reload()
    await narrativeAudit.reload()
  }

  const regenerateConclusion = async () => {
    if (!caseItem?.canAnalystEdit) return
    const regenerated = await apiRequest<GroundsResponse['narrative']>(`/cases/${caseId}/narrative/regenerate-section`, session, {
      method: 'POST',
      body: JSON.stringify({ section_id: 'conclusion', instruction: 'Tighten the closing rationale without changing facts.' }),
    })
    setDraftText(regenerated.finalText)
    await grounds.reload()
    await narrativeAudit.reload()
  }

  const continueFlow = async () => {
    if (!caseItem?.canAnalystEdit) return
    await save()
    await apiRequest(`/cases/${caseId}/narrative/compliance-check`, session, { method: 'POST' })
    await apiRequest(`/cases/${caseId}/narrative/complete-stage`, session, {
      method: 'POST',
      body: JSON.stringify({ note: 'Narrative complete' }),
    })
    navigate(`/cases/${caseId}/pre-submission-validation`)
  }

  if (grounds.loading) return <LoadingState />
  if (grounds.error || !grounds.data) return <ErrorState message={grounds.error ?? 'Unable to load grounds'} />

  const caseItem = grounds.data.case

  return (
    <AppShell
      role="ANALYST"
      title="Grounds of Suspicion"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted">Cases</span>
          <span className="text-[12px] text-muted">›</span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{caseItem.caseId}</span>
          <span className="text-[12px] text-muted">›</span>
          <span className="text-[12px] font-medium text-copy">Grounds of Suspicion</span>
        </div>
      }
      sidebarSteps={analystSteps(2)}
    >
      <CaseHeader caseItem={caseItem} onToggleMask={() => setPiiMasked((value) => !value)} piiMasked={piiMasked} />
      <div className="flex gap-4 p-4">
        <div className="flex w-[480px] flex-col gap-4">
          <SectionCard title="Summary & Risk" subtitle="Structured dossier facts that anchor the narrative.">
            <div className="space-y-4">
              {grounds.data.dossier.risk.riskFactors.map((factor) => (
                <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4" key={factor.name}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{factor.name}</div>
                    <div className="text-sm font-semibold text-danger">+{factor.contribution}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted">{factor.factualBasis}</div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Narrative Trace Audit" subtitle="Prompt lineage, retrieved local guidance, and paragraph provenance.">
            {!narrativeAudit.data?.paragraphTraces.length ? (
              <EmptyState title="No narrative trace yet" body="Generate a draft to populate the audit panel." />
            ) : (
              <div className="space-y-3">
                {narrativeAudit.data.paragraphTraces.map((trace) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={trace.traceId}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{trace.sectionId}</div>
                      <div className="text-xs uppercase tracking-[0.08em] text-muted">{trace.origin}</div>
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      Transactions: {trace.sourceTransactionIds.join(', ')} • Alerts: {trace.sourceAlertIds.join(', ')}
                    </div>
                    <div className="mt-2 font-mono text-xs text-muted">
                      Guidance chunks: {trace.retrievedChunkIds.map(compactHash).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <SectionCard
            title="Narrative Draft"
            subtitle="Generate, edit, and selectively regenerate the grounds-of-suspicion narrative."
            action={
              <div className="flex gap-2">
                <button className="btn-success" disabled={!caseItem.canAnalystEdit} onClick={generate}>
                  Generate Draft
                </button>
                <button className="btn-highlight" disabled={!caseItem.canAnalystEdit} onClick={regenerateConclusion}>
                  Regenerate conclusion
                </button>
              </div>
            }
          >
            <textarea
              className="min-h-[360px] w-full rounded-lg border border-line bg-[#FAFAF8] p-4 text-sm leading-7 outline-none focus:border-accent"
              disabled={!caseItem.canAnalystEdit}
              placeholder="Generate the draft to start editing."
              value={finalText}
              onChange={(event) => setDraftText(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button className="btn-success" disabled={!caseItem.canAnalystEdit} onClick={save}>
                Save draft
              </button>
              <button className="btn-primary" disabled={!caseItem.canAnalystEdit} onClick={continueFlow}>
                Continue to validation
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Analyst Copilot" subtitle="Thin factual Q&A routed to the backend dossier.">
            <div className="flex gap-3">
              <input className="input flex-1" value={copilotQuestion} onChange={(event) => setCopilotQuestion(event.target.value)} />
              <button
                className="btn-secondary"
                onClick={async () => {
                  const reply = await apiRequest<{ answer: string }>(`/cases/${caseId}/narrative/copilot`, session, {
                    method: 'POST',
                    body: JSON.stringify({ question: copilotQuestion }),
                  })
                  setCopilotAnswer(reply.answer)
                }}
              >
                Ask
              </button>
            </div>
            {copilotAnswer ? <div className="mt-4 rounded-lg bg-[#FAFAF8] p-4 text-sm text-copy">{copilotAnswer}</div> : null}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  )
}
