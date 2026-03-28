import { formatDate, maskValue } from '../lib/format'
import type { CaseItem } from '../types'
import { StatusBadge } from './common'

export function CaseHeader({
  caseItem,
  piiMasked,
  onToggleMask,
}: {
  caseItem: CaseItem
  piiMasked: boolean
  onToggleMask: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted">{caseItem.caseId}</span>
        <span className="text-[15px] font-medium text-copy">{caseItem.customerName}</span>
        <span className="badge bg-slate-100 text-slate-600">{caseItem.customerType === 'ENTITY' ? 'ENT' : 'PERS'}</span>
        <StatusBadge value={caseItem.stage} />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-secondary h-8 px-3 text-xs" onClick={onToggleMask}>
          {piiMasked ? 'PII Masking Active' : `PII Unmasked • ${maskValue(caseItem.customerId)}`}
        </button>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-danger">
          {caseItem.sla.display} SLA
        </span>
        <span className="text-xs text-muted">Deadline {formatDate(caseItem.sla.deadline)}</span>
      </div>
    </div>
  )
}
