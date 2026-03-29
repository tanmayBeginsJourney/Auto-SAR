import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../lib/format'

export function LoadingState() {
  return <div className="panel p-6 text-sm leading-6 text-muted">Loading...</div>
}

export function ErrorState({ message }: { message: string }) {
  return <div className="panel border-danger/30 p-6 text-sm leading-6 text-danger">{message}</div>
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-[10px] border border-dashed border-powder bg-cardAlt p-8 text-center">
      <div className="text-[13px] font-semibold text-copy">{title}</div>
      <div className="mt-1 max-w-[36ch] text-[12px] leading-5 text-muted">{body}</div>
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
  tone?: 'default' | 'danger' | 'warn' | 'info'
}) {
  const toneClasses =
    tone === 'info'
      ? 'border border-highlightBorder border-l-[3px] border-l-highlight bg-powderSoft'
      : tone === 'danger'
        ? 'border border-red-200 border-l-[3px] border-l-danger bg-red-50'
      : tone === 'warn'
        ? 'border border-amber-200 border-l-[3px] border-l-warn bg-amber-50'
        : 'border border-powder border-l-[3px] border-l-powder bg-card'
  const valueClasses =
    tone === 'info' ? 'text-highlight' : tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-copy'
  return (
    <div className={`rounded-xl px-5 py-5 shadow-tile ${toneClasses}`} data-kpi-card>
      <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">{title}</div>
      <div className={`text-[30px] font-bold leading-none ${valueClasses}`}>{value}</div>
    </div>
  )
}

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === 'PO_APPROVED'
      ? 'border-green-700/30 bg-green-50 text-green-700'
      : value === 'PENDING_REVIEW' || value === 'SUBMITTED'
        ? 'border-blue-700/30 bg-blue-50 text-blue-700'
        : value === 'RFI_REQUESTED'
          ? 'border-amber-700/30 bg-amber-50 text-amber-700'
          : 'border-slate-600/30 bg-slate-100 text-slate-600'
  return <span className={`badge border ${tone}`}>{value.replaceAll('_', ' ')}</span>
}

export function SlaPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === 'BREACHED'
      ? 'border-red-700/30 bg-red-50 text-red-700'
      : status === 'AT_RISK'
        ? 'border-amber-700/30 bg-amber-50 text-amber-700'
        : 'border-green-700/30 bg-green-50 text-green-700'
  return <span className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`}>{label}</span>
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
    <section className="panel overflow-hidden bg-card" data-stack-card>
      <div className="flex items-start justify-between px-5 py-5">
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 border-b border-line pb-3 text-[13px] font-semibold text-copy">{title}</h2>
          {subtitle ? <p className="text-[12px] leading-5 text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

export function ValueRow({ label, value, masked = false }: { label: string; value: React.ReactNode; masked?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-powderSoft py-2.5 last:border-b-0">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className={`text-right text-[13px] ${masked ? 'rounded bg-cardAlt px-2 py-1 font-mono text-[11px] text-muted' : 'font-medium text-copy'}`}>
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
  return <span className="font-mono text-[14px] font-semibold text-copy">{formatCurrency(amount)}</span>
}
