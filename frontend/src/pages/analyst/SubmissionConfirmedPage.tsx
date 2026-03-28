import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { formatCurrency, formatDate, maskValue } from '../../lib/format'
import { useAuth } from '../../state/auth'

export function SubmissionConfirmedPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const confirmation = useAsyncData<{ snapshot: Record<string, any>; poNotificationStatus: string }>(
    () => apiRequest(`/cases/${caseId}/submission-confirmation`, session),
    [caseId, session],
  )

  if (confirmation.loading) return <LoadingState />
  if (confirmation.error || !confirmation.data) return <ErrorState message={confirmation.error ?? 'Unable to load confirmation'} />

  const snapshot = confirmation.data.snapshot
  return (
    <AppShell
      role="ANALYST"
      title="Submission Confirmed"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span>Cases</span>
          <span>›</span>
          <span className="font-medium text-copy">Submission Confirmed</span>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-5xl p-8">
        <div className="rounded-[18px] border border-green-200 bg-green-50 p-8">
          <div className="text-2xl font-semibold text-green-700">Submission succeeded</div>
          <div className="mt-2 text-sm text-green-700">
            Case {snapshot.case.caseId} is now locked for analyst edits and has been routed into the Principal Officer queue.
          </div>
        </div>
        <SectionCard title="Frozen filing summary" subtitle="Rendered from the immutable submission snapshot.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
              <div className="font-medium">{snapshot.case.customerName}</div>
              <div className="mt-2 text-muted">Masked ID: {maskValue(snapshot.case.customerId)}</div>
              <div className="mt-1 text-muted">Risk: {snapshot.case.riskLevel}</div>
              <div className="mt-1 text-muted">Value at risk: {formatCurrency(snapshot.case.valueAtRisk)}</div>
            </div>
            <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
              <div className="font-medium">Submitted by {snapshot.submittedBy.user_name}</div>
              <div className="mt-2 text-muted">Submitted at {formatDate(snapshot.submittedAt)}</div>
              <div className="mt-1 text-muted">PO notification: {confirmation.data.poNotificationStatus}</div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}
