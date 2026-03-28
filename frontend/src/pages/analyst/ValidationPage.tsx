import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../state/auth'
import { analystSteps } from '../steps'

interface ValidationResponse {
  status: string
  checks: Array<{ rule: string; passed: boolean; severity: string; explanation: string }>
  hardBlockers: Array<{ rule: string; explanation: string }>
  warnings: Array<{ rule: string; explanation: string }>
}

export function ValidationPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const validation = useAsyncData<ValidationResponse>(() => apiRequest(`/cases/${caseId}/presubmission-validation`, session), [caseId, session])
  const caseQuery = useAsyncData<{ canAnalystEdit: boolean }>(() => apiRequest(`/cases/${caseId}`, session), [caseId, session])

  if (validation.loading) return <LoadingState />
  if (validation.error || !validation.data) return <ErrorState message={validation.error ?? 'Unable to load validation'} />

  const runValidation = async () => {
    await apiRequest(`/cases/${caseId}/presubmission-validation/run`, session, { method: 'POST' })
    await validation.reload()
  }

  const submit = async () => {
    await apiRequest(`/cases/${caseId}/submit`, session, {
      method: 'POST',
      body: JSON.stringify({ analyst_notes: 'Submitted from analyst validation screen' }),
    })
    navigate(`/cases/${caseId}/submission-confirmed`)
  }

  return (
    <AppShell
      role="ANALYST"
      title="Pre-submission Validation"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span>Cases</span>
          <span>›</span>
          <span className="font-medium text-copy">Pre-submission Validation</span>
        </div>
      }
      sidebarSteps={analystSteps(3)}
    >
      <div className="space-y-4 p-4">
        <SectionCard
          title="Submission Readiness"
          subtitle="Hard blockers must clear before the case can be routed to the Principal Officer."
          action={
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={runValidation}>
                Run checks again
              </button>
              <button className="btn-primary" disabled={validation.data.hardBlockers.length > 0 || !caseQuery.data?.canAnalystEdit} onClick={submit}>
                Submit to Principal Officer
              </button>
            </div>
          }
        >
          <div className="mb-4 rounded-lg bg-[#FAFAF8] px-4 py-3 text-sm">
            Validation status: <span className="font-semibold">{validation.data.status}</span>
          </div>
          <div className="space-y-3">
            {validation.data.checks.map((check) => (
              <div className="rounded-lg border border-[#F0EFE9] bg-white p-4" key={check.rule}>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium">{check.rule}</div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${check.passed ? 'bg-green-100 text-green-700' : check.severity === 'hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {check.passed ? 'Pass' : check.severity === 'hard' ? 'Blocker' : 'Warning'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-muted">{check.explanation}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}
