import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../lib/format'

export function LoadingState() {
  return <div className="panel p-6 text-sm text-muted">Loading live case data...</div>
}

export function ErrorState({ message }: { message: string }) {
  return <div className="panel border-danger/30 p-6 text-sm text-danger">{message}</div>
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel p-6">
      <div className="text-sm font-medium text-copy">{title}</div>
      <div className="mt-1 text-sm text-muted">{body}</div>
    </div>
  )
}

export function KpiCard({
  title,
  value,
  tone = 'default',
}: {
  title: string
  value: ReactNode
  tone?: 'default' | 'danger' | 'warn'
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-danger/25 bg-red-50 text-danger'
      : tone === 'warn'
        ? 'border-warn/25 bg-amber-50 text-warn'
        : 'border-line bg-card text-copy'
  return (
    <div className={`rounded-[10px] border px-5 py-4 shadow-panel ${toneClasses}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted">{title}</div>
    </div>
  )
}

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === 'PO_APPROVED'
      ? 'bg-green-100 text-green-700'
      : value === 'PENDING_REVIEW' || value === 'SUBMITTED'
        ? 'bg-blue-100 text-blue-700'
        : value === 'RFI_REQUESTED'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600'
  return <span className={`badge ${tone}`}>{value.replaceAll('_', ' ')}</span>
}

export function SlaPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === 'BREACHED'
      ? 'bg-red-100 text-red-700'
      : status === 'AT_RISK'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700'
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>
}

export function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between border-b border-line bg-[#FAFAF8] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function ValueRow({ label, value, masked = false }: { label: string; value: React.ReactNode; masked?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F0EFE9] py-3 last:border-b-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-right text-sm ${masked ? 'rounded bg-[#F0EFE9] px-2 py-1 font-mono text-xs text-[#73736F]' : 'font-medium text-copy'}`}>
        {value}
      </span>
    </div>
  )
}

export function ActionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link className="text-sm font-medium text-accent hover:underline" to={to}>
      {children}
    </Link>
  )
}

export function MetricValue({ amount }: { amount: number }) {
  return <span className="font-mono">{formatCurrency(amount)}</span>
}
