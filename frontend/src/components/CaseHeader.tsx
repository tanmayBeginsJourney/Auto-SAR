import { formatDate, maskValue } from '../lib/format'
import type { CaseItem } from '../types'
import { SlaPill, StatusBadge } from './common'

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
    <div className="flex items-center justify-between border-b border-line bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{caseItem.caseId}</span>
        <span className="text-[16px] font-semibold text-copy">{caseItem.customerName}</span>
        <span className="badge border border-highlightBorder bg-highlightSoft text-highlight">{caseItem.customerType === 'ENTITY' ? 'ENT' : 'PERS'}</span>
        <StatusBadge value={caseItem.stage} />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-secondary h-8 px-3 text-xs" onClick={onToggleMask}>
          {piiMasked ? 'PII Masking Active' : `PII Unmasked • ${maskValue(caseItem.customerId)}`}
        </button>
        <SlaPill label={caseItem.sla.display} status={caseItem.sla.status} />
        <span className="text-xs text-muted">Deadline {formatDate(caseItem.sla.deadline)}</span>
      </div>
    </div>
  )
}
