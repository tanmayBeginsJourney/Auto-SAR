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
      <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col border-r border-sidebarBorder bg-sidebarBg py-7">
        <div className="px-6 pt-1">
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.02em]">
                <span className="text-highlight">SAR</span><span className="text-white">e</span><span className="text-success">Gamma</span>
              </div>
              <div className="text-[11px] text-sidebarText">2Big2Fail</div>
            </div>
          </div>
          <div className="mt-4 h-px bg-sidebarBorder" />
        </div>
        <nav className="space-y-2 px-3 pt-5">
          <Link
            className="mx-2 flex items-center gap-3 rounded-lg border-l-2 border-sidebarAccent bg-[rgba(0,174,239,0.12)] px-4 py-2.5 text-[13px] font-medium text-sidebarAccent"
            to={dashboardPath}
          >
            Dashboard
          </Link>
          <Link
            className="mx-2 flex items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-2.5 text-[13px] font-medium text-sidebarText"
            to={dashboardPath}
          >
            Cases
          </Link>
          <button
            className="mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-2.5 text-left text-[13px] font-medium text-sidebarText"
            onClick={switchRole}
          >
            Switch to {session?.role === 'ANALYST' ? 'PO' : 'Analyst'}
          </button>
        </nav>
        {sidebarSteps ? (
          <div className="mt-8">
            <div className="mb-1 mt-4 px-4 text-[10px] font-medium uppercase tracking-[0.22em] text-sidebarBorder">
              Case Filing Progress
            </div>
            <div className="space-y-0 px-4">
              {sidebarSteps.map((step, index) => (
                <div className="relative flex gap-3 pb-5 last:pb-0" key={step.label}>
                  {index < sidebarSteps.length - 1 ? (
                    <div
                      className={`absolute left-[9px] top-[18px] bottom-[-8px] w-px ${step.state === 'completed' ? 'bg-success' : 'bg-sidebarBorder'}`}
                    />
                  ) : null}
                  <div
                    className={`z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                      step.state === 'completed'
                        ? 'border border-success bg-success text-white'
                        : step.state === 'active'
                          ? 'border border-sidebarAccent bg-sidebarAccent text-white shadow-[0_0_0_4px_rgba(59,130,246,0.18)]'
                          : 'border border-sidebarBorder bg-sidebarBg text-sidebarText'
                    }`}
                  >
                    {step.state === 'completed' ? '\u2713' : index + 1}
                  </div>
                  <div>
                    <div
                      className={`text-[13px] ${
                        step.state === 'pending'
                          ? 'text-sidebarText'
                          : step.state === 'completed'
                            ? 'font-medium text-success'
                            : 'font-medium text-sidebarActive'
                      }`}
                    >
                      {step.label}
                    </div>
                    {step.detail ? <div className="mt-1 text-[11px] text-sidebarText">{step.detail}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-auto border-t border-sidebarBorder px-5 pt-3">
          <div>
            <div className="text-sm font-medium text-sidebarActive">{session?.userName}</div>
            <div className="text-[12px] text-sidebarText">{session?.role === 'ANALYST' ? 'L1 Analyst' : 'Principal Officer'}</div>
            <button className="mt-3 text-xs font-medium text-sidebarText underline-offset-2 hover:underline" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-15 items-center justify-between border-b border-line bg-card px-6">
          <div className="text-sm leading-6 text-muted">{breadcrumb}</div>
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
