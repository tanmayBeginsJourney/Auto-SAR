import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { ErrorState, LoadingState, SectionCard } from '../../components/common'
import { useAsyncData } from '../../hooks/useAsyncData'
import { apiRequest } from '../../lib/api'
import { compactHash, formatCurrency, formatDate } from '../../lib/format'
import { useAuth } from '../../state/auth'
import { poSteps } from '../steps'

interface DecisionPayload {
  case: Record<string, any>
  snapshot: Record<string, any>
  bundle: {
    approvedAt: string
    artifacts: Array<{ name: string; type: string; path: string; sha256: string }>
  } | null
  review: {
    decision?: { status: string; createdAt: string; comment?: string }
  }
}

export function PoDecisionPage() {
  const { caseId = '' } = useParams()
  const { session } = useAuth()
  const decision = useAsyncData<DecisionPayload>(() => apiRequest(`/po/cases/${caseId}/decision`, session), [caseId, session])

  if (decision.loading) return <LoadingState />
  if (decision.error || !decision.data) return <ErrorState message={decision.error ?? 'Unable to load PO decision'} />

  const approve = async () => {
    await apiRequest(`/po/cases/${caseId}/approve`, session, {
      method: 'POST',
      body: JSON.stringify({ decision_note: 'Approved for export after PO review.' }),
    })
    await decision.reload()
  }

  const bundle = decision.data.bundle
  const approved = Boolean(bundle)

  return (
    <AppShell
      role="PO"
      title="PO Final Decision"
      breadcrumb={
        <div className="flex items-center gap-2">
          <span>Cases</span>
          <span>›</span>
          <span className="font-mono text-xs">{caseId}</span>
          <span>›</span>
          <span className="font-medium text-copy">Export &amp; Audit Commit</span>
        </div>
      }
      sidebarSteps={poSteps(4)}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 p-8">
        <div className={`rounded-[18px] border p-8 ${approved ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className={`text-2xl font-semibold ${approved ? 'text-green-700' : 'text-amber-700'}`}>
            {approved ? 'Case approved and export-ready' : 'Approval pending'}
          </div>
          <div className={`mt-2 text-sm ${approved ? 'text-green-700' : 'text-amber-700'}`}>
            {approved
              ? `Approved at ${formatDate(bundle?.approvedAt)}. Artifacts are generated from the immutable submission snapshot.`
              : 'Run the final approval check and generate the artifact bundle.'}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Approval Commit"
            subtitle="Approval re-validates reviewability, ledger continuity, and XML buildability before sealing the cycle."
            action={
              <button className="btn-primary" disabled={approved} onClick={approve}>
                Approve &amp; Export to FIU
              </button>
            }
          >
            <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm">
              <div className="font-medium">{decision.data.snapshot.case.customerName}</div>
              <div className="mt-2 text-muted">Case ID {decision.data.snapshot.case.caseId}</div>
              <div className="mt-1 text-muted">Value at risk {formatCurrency(decision.data.snapshot.case.valueAtRisk)}</div>
            </div>
          </SectionCard>

          <SectionCard title="Export Artifacts" subtitle="Low-risk downloadable outputs backed by persisted hashes.">
            {!bundle ? (
              <div className="text-sm text-muted">Approve the case to generate XML, PDF dossier, and ledger JSON.</div>
            ) : (
              <div className="space-y-3">
                {bundle.artifacts.map((artifact) => (
                  <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-4 text-sm" key={artifact.path}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{artifact.name}</div>
                        <div className="mt-1 font-mono text-xs text-muted">{compactHash(artifact.sha256)}</div>
                      </div>
                      <a
                        className="btn-secondary h-8 px-3 text-xs"
                        href={`http://127.0.0.1:8000/api/po/cases/${caseId}/export/${artifact.type === 'xml' ? 'xml' : artifact.type === 'pdf' ? 'audit-dossier' : 'ledger-json'}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))}
                <button
                  className="btn-secondary w-full"
                  onClick={async () => {
                    await apiRequest(`/po/cases/${caseId}/export/fiu-upload-attempt`, session, {
                      method: 'POST',
                      body: JSON.stringify({ note: 'Demo stub recorded from PO decision screen' }),
                    })
                    await decision.reload()
                  }}
                >
                  Record FIU upload attempt
                </button>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  )
}
