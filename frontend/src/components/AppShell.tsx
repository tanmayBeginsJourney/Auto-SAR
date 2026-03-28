import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import type { Role } from '../types'

interface StepItem {
  label: string
  detail?: string
  state: 'completed' | 'active' | 'pending'
}

export function AppShell({
  role,
  title,
  breadcrumb,
  search,
  setSearch,
  sidebarSteps,
  children,
}: {
  role: Role
  title: string
  breadcrumb: ReactNode
  search?: string
  setSearch?: (value: string) => void
  sidebarSteps?: StepItem[]
  children: ReactNode
}) {
  const { session, logout, setSession } = useAuth()
  const navigate = useNavigate()
  const dashboardPath = role === 'ANALYST' ? '/analyst/dashboard' : '/po/dashboard'

  const switchRole = () => {
    if (!session) return
    if (session.role === 'ANALYST') {
      setSession({ role: 'PO', userId: 'EMP003', userName: 'Ritu Sharma' })
      navigate('/po/dashboard')
    } else {
      setSession({ role: 'ANALYST', userId: 'EMP001', userName: 'Naina Kapoor' })
      navigate('/analyst/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen bg-shell">
      <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-line bg-white py-6">
        <div className="px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
              S
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-[-0.02em] text-accent">Auto-SAR</div>
              <div className="text-[11px] text-muted">Hackathon MVP</div>
            </div>
          </div>
          <div className="mt-4 h-px bg-line" />
        </div>
        <nav className="space-y-1 px-3 pt-4">
          <Link className="flex items-center gap-3 rounded-md bg-accentSoft px-3 py-2 text-sm font-medium text-accent" to={dashboardPath}>
            Dashboard
          </Link>
          <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted" to={dashboardPath}>
            Cases
          </Link>
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-muted" onClick={switchRole}>
            Switch to {session?.role === 'ANALYST' ? 'PO' : 'Analyst'}
          </button>
        </nav>
        {sidebarSteps ? (
          <div className="mt-6 px-4">
            <div className="mb-4 px-2 text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
              Case Filing Progress
            </div>
            <div className="space-y-0">
              {sidebarSteps.map((step, index) => (
                <div className="relative flex gap-3 pb-5 last:pb-0" key={step.label}>
                  {index < sidebarSteps.length - 1 ? (
                    <div className={`absolute left-[9px] top-[18px] bottom-[-8px] w-px ${step.state === 'completed' ? 'bg-success' : 'bg-line'}`} />
                  ) : null}
                  <div
                    className={`z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                      step.state === 'completed'
                        ? 'border border-success bg-success text-white'
                        : step.state === 'active'
                          ? 'border border-accent bg-accent text-white shadow-[0_0_0_4px_#EEF2FF]'
                          : 'border border-line bg-shell text-muted'
                    }`}
                  >
                    {step.state === 'completed' ? '✓' : index + 1}
                  </div>
                  <div>
                    <div className={`text-[13px] ${step.state === 'pending' ? 'text-muted' : step.state === 'completed' ? 'font-medium text-success' : 'font-medium text-copy'}`}>
                      {step.label}
                    </div>
                    {step.detail ? <div className="mt-1 text-[11px] text-muted">{step.detail}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-auto px-3">
          <div className="rounded-lg border border-[#F0EFE9] bg-[#FAFAF8] p-3">
            <div className="text-sm font-medium">{session?.userName}</div>
            <div className="text-xs text-muted">{session?.role === 'ANALYST' ? 'L1 Analyst' : 'Principal Officer'}</div>
            <button className="mt-3 text-xs font-medium text-muted underline-offset-2 hover:underline" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-15 items-center justify-between border-b border-line bg-white/90 px-6 backdrop-blur">
          <div className="text-sm text-muted">{breadcrumb}</div>
          <div className="flex items-center gap-4">
            {setSearch ? (
              <input
                className="input w-72 border-0 bg-shell"
                placeholder="Search cases, customers..."
                value={search ?? ''}
                onChange={(event) => setSearch(event.target.value)}
              />
            ) : null}
            <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{title}</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
