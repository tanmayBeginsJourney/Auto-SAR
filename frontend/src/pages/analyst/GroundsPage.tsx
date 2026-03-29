import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { CaseHeader } from '../../components/CaseHeader'
import { EmptyState, ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
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

interface CopilotResponse {
  answer: string
  suggestedText: string
  question?: string
  model?: string
  rawResponseId?: string
}

export function GroundsPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [piiMasked, setPiiMasked] = useState(true)
  const [copilotQuestion, setCopilotQuestion] = useState('Why is this suspicious?')
  const [copilotResult, setCopilotResult] = useState<CopilotResponse | null>(null)
  const [copilotError, setCopilotError] = useState<string | null>(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const grounds = useAsyncData<GroundsResponse>(() => apiRequest(`/cases/${caseId}/grounds`, session), [caseId, session])
  const [draftText, setDraftText] = useState('')
  const narrativeAudit = useAsyncData<{
    promptVersion?: string
    ledgerEntries: Array<{ eventId: string; occurredAt: string; heading: string; description: string }>
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
          <span>Cases</span>
          <span>›</span>
          <span className="font-mono text-xs">{caseItem.caseId}</span>
          <span>›</span>
          <span className="font-medium text-copy">Grounds of Suspicion</span>
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
          <SectionCard title="Narrative Trace Audit" subtitle="Chronological audit ledger for draft creation and copilot activity.">
            {!narrativeAudit.data?.ledgerEntries.length ? (
              <EmptyState title="No audit entries yet" body="The first draft entry appears automatically when the page opens." />
            ) : (
              <div className="space-y-3">
                {narrativeAudit.data.ledgerEntries.map((entry) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={entry.eventId}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-copy">{entry.heading}</div>
                      <div className="text-xs uppercase tracking-[0.08em] text-muted">
                        {new Date(entry.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="mt-2 whitespace-pre-line text-sm text-muted">{entry.description}</div>
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
                <button className="btn-secondary" disabled={!caseItem.canAnalystEdit} onClick={generate}>
                  Generate Draft
                </button>
                <button className="btn-secondary" disabled={!caseItem.canAnalystEdit} onClick={regenerateConclusion}>
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
              <button className="btn-secondary" disabled={!caseItem.canAnalystEdit} onClick={save}>
                Save draft
              </button>
              <button className="btn-primary" disabled={!caseItem.canAnalystEdit} onClick={continueFlow}>
                Continue to validation
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Analyst Copilot" subtitle="Freeform LLM assistance that can suggest updates to the current draft.">
            <div className="space-y-3">
              <textarea
                className="min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="Ask for a rewrite, stronger conclusion, clearer chronology, or any other drafting help."
                value={copilotQuestion}
                onChange={(event) => setCopilotQuestion(event.target.value)}
              />
              <div className="flex gap-3">
                <button
                  className="btn-secondary"
                  disabled={copilotLoading || !copilotQuestion.trim()}
                  onClick={async () => {
                    setCopilotLoading(true)
                    setCopilotError(null)
                    try {
                      const reply = await apiRequest<CopilotResponse>(`/cases/${caseId}/narrative/copilot`, session, {
                        method: 'POST',
                        body: JSON.stringify({ question: copilotQuestion, current_draft: finalText }),
                      })
                      setCopilotResult({ ...reply, question: copilotQuestion })
                      await narrativeAudit.reload()
                    } catch (error) {
                      setCopilotError(error instanceof Error ? error.message : 'Copilot request failed')
                    } finally {
                      setCopilotLoading(false)
                    }
                  }}
                >
                  {copilotLoading ? 'Thinking...' : 'Ask Copilot'}
                </button>
                <button
                  className="btn-primary"
                  disabled={!caseItem.canAnalystEdit || !copilotResult?.suggestedText}
                  onClick={async () => {
                    if (!copilotResult?.suggestedText) return
                    await apiRequest(`/cases/${caseId}/narrative/copilot/apply`, session, {
                      method: 'POST',
                      body: JSON.stringify({
                        question: copilotResult.question ?? copilotQuestion,
                        suggested_text: copilotResult.suggestedText,
                        model: copilotResult.model,
                        raw_response_id: copilotResult.rawResponseId,
                      }),
                    })
                    setDraftText(copilotResult.suggestedText)
                    await narrativeAudit.reload()
                  }}
                >
                  Apply to Draft
                </button>
              </div>
            </div>
            {copilotError ? <div className="mt-4 text-sm text-danger">{copilotError}</div> : null}
            {copilotResult ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-[#FAFAF8] p-4 text-sm text-copy">{copilotResult.answer}</div>
                <div className="rounded-lg border border-[#F0EFE9] bg-white p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-muted">
                    <span>Suggested Draft Update</span>
                    <span>{copilotResult.model ?? 'local'}</span>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-copy">{copilotResult.suggestedText}</div>
                </div>
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  )
}
