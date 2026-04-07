import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { CaseHeader } from '../../components/CaseHeader'
import { ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { formatCurrency, maskValue } from '../../lib/format'
import { useAuth } from '../../state/auth'
import type { CaseItem } from '../../types'
import { analystSteps } from '../steps'

interface StrAutofillResponse {
  caseId: string
  sections: Record<string, Record<string, unknown>>
  updatedAt: string
  updatedBy: string
}

export function StrAutofillPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [piiMasked, setPiiMasked] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [continuing, setContinuing] = useState(false)
  const caseQuery = useAsyncData<CaseItem>(() => apiRequest(`/cases/${caseId}`, session), [caseId, session])
  const autofill = useAsyncData<StrAutofillResponse>(() => apiRequest(`/cases/${caseId}/str-autofill`, session), [caseId, session])
  const [draft, setDraft] = useState<StrAutofillResponse | null>(null)

  const activeDraft = useMemo(() => draft ?? autofill.data, [autofill.data, draft])

  const save = async () => {
    if (!activeDraft) return
    setActionError(null)
    const saved = await apiRequest<StrAutofillResponse>(`/cases/${caseId}/str-autofill`, session, {
      method: 'PUT',
      body: JSON.stringify({ values: activeDraft }),
    })
    setDraft(saved)
  }

  const continueFlow = async () => {
    setContinuing(true)
    setActionError(null)
    try {
      if (caseQuery.data?.canAnalystEdit) {
        await save()
        await apiRequest(`/cases/${caseId}/str-autofill/complete-stage`, session, {
          method: 'POST',
          body: JSON.stringify({ note: 'Analyst saved STR autofill draft' }),
        })
      }
      navigate(`/cases/${caseId}/grounds-of-suspicion`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to continue to grounds of suspicion')
    } finally {
      setContinuing(false)
    }
  }

  if (caseQuery.loading || autofill.loading) return <LoadingState />
  if (caseQuery.error || autofill.error || !caseQuery.data || !activeDraft) {
    return <ErrorState message={caseQuery.error ?? autofill.error ?? 'Unable to load STR autofill'} />
  }

  return (
    <AppShell
      role="ANALYST"
      title="STR Autofill"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted">Cases</span>
          <span className="text-[12px] text-muted">›</span>
          <span className="text-[12px] font-medium text-copy">STR Autofill</span>
        </div>
      }
      sidebarSteps={analystSteps(1)}
    >
      <CaseHeader caseItem={caseQuery.data} onToggleMask={() => setPiiMasked((value) => !value)} piiMasked={piiMasked} />
      <div className="space-y-4 p-4">
        {Object.entries(activeDraft.sections).map(([part, values]) => (
          <SectionCard key={part} title={part.toUpperCase().replace('PART', 'Part ')}>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(values).map(([key, value]) => {
                const editable = part === 'part3' && key === 'branchCode' || (part === 'part7' && key === 'groundsSummary')
                if (Array.isArray(value)) {
                  return (
                    <div className="md:col-span-2" key={key}>
                      <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted">{key}</div>
                      <div className="space-y-2">
                        {value.map((row, index) => (
                          <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-3 text-sm" key={index}>
                            {Object.entries(row as Record<string, unknown>).map(([field, fieldValue]) => (
                              <div className="flex items-center justify-between border-b border-[#F0EFE9] py-2 last:border-b-0" key={field}>
                                <span className="text-xs text-muted">{field}</span>
                                <span className="text-sm font-medium">
                                  {field.toLowerCase().includes('pan') || field.toLowerCase().includes('account')
                                    ? piiMasked
                                      ? maskValue(String(fieldValue))
                                      : String(fieldValue)
                                    : field.toLowerCase().includes('amount')
                                      ? formatCurrency(Number(fieldValue))
                                      : String(fieldValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <label className="block" key={key}>
                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted">{key}</div>
                    {editable ? (
                      <input
                        className="input w-full"
                        value={String(value ?? '')}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...(current ?? activeDraft),
                            sections: {
                              ...(current ?? activeDraft).sections,
                              [part]: {
                                ...(current ?? activeDraft).sections[part],
                                [key]: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    ) : (
                      <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] px-3 py-2 text-sm font-medium">
                        {String(value)}
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </SectionCard>
        ))}
        <div className="flex justify-end gap-3">
          <button className="btn-success" onClick={save} type="button">
            Save Draft
          </button>
          <button className="btn-primary" disabled={continuing} onClick={continueFlow} type="button">
            {continuing ? 'Continuing...' : 'Continue to Grounds of Suspicion'}
          </button>
        </div>
        {actionError ? <div className="text-sm text-danger">{actionError}</div> : null}
      </div>
    </AppShell>
  )
}
