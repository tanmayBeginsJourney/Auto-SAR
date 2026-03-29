import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDemoUsers, useAuth } from '../state/auth'

export function LoginPage() {
  const { session, setSession } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchDemoUsers>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      navigate(session.role === 'ANALYST' ? '/analyst/dashboard' : '/po/dashboard', { replace: true })
    }
  }, [navigate, session])

  useEffect(() => {
    void fetchDemoUsers()
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundImage: 'linear-gradient(135deg, #F8F6F1 0%, #EDF4FC 100%)' }}
    >
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-powder bg-card p-10 shadow-panel">
          <div className="mb-8 flex items-center gap-3">
            <div>
              <div className="text-xl font-semibold text-accent">
                <span className="text-white">SAR</span><span className="text-white">e</span><span className="text-white">Gamma</span>
              </div>
              <div className="text-sm text-muted">2Big2Fail</div>
            </div>
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight text-copy">
            Build a believable STR/SAR workflow demo around the real seeded Barclays cases.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
            The MVP walks from analyst queue, through deterministic STR autofill and AI-assisted grounds of
            suspicion, into Principal Officer review, approval, and export with a visible audit chain.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['Live SQLite dataset', 'CASE001, CASE002, and CASE003 are loaded directly from the supplied demo DB.'],
              ['Explainable scoring', 'Risk, SLA, validation, and crypto handling all expose plain-language reasoning.'],
              ['Immutable exports', 'Approved bundles include XML, PDF dossier, ledger JSON, and persisted hashes.'],
            ].map(([title, body]) => (
              <div className="tile-cream" key={title}>
                <div className="text-sm font-semibold text-copy">{title}</div>
                <div className="mt-2 text-xs leading-6 text-muted">{body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="self-center rounded-2xl border border-line bg-card p-8 shadow-panel">
          <div className="text-lg font-semibold">Choose a seeded demo role</div>
          <p className="mt-2 text-sm text-muted">Routes and actions are protected. You can switch later from the sidebar.</p>
          {error ? <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-danger">{error}</div> : null}
          <div className="mt-8 space-y-4">
            <button
              className="w-full rounded-xl border border-powder bg-card p-5 text-left transition hover:border-highlight hover:bg-powderSoft hover:shadow-[0_0_0_3px_#E6F7FD]"
              disabled={!users}
              onClick={() => {
                if (!users) return
                setSession({
                  role: 'ANALYST',
                  userId: users.analyst.user_id,
                  userName: users.analyst.user_name,
                })
                navigate('/analyst/dashboard')
              }}
            >
              <div className="text-[15px] font-semibold text-copy">L1 Analyst</div>
              <div className="mt-1 text-[13px] text-muted">Review case queue, assemble data, autofill STR, draft narrative, validate, submit.</div>
            </button>
            <button
              className="w-full rounded-xl border border-powder bg-card p-5 text-left transition hover:border-highlight hover:bg-powderSoft hover:shadow-[0_0_0_3px_#E6F7FD]"
              disabled={!users}
              onClick={() => {
                if (!users) return
                setSession({
                  role: 'PO',
                  userId: users.po.user_id,
                  userName: users.po.user_name,
                })
                navigate('/po/dashboard')
              }}
            >
              <div className="text-[15px] font-semibold text-copy">Principal Officer</div>
              <div className="mt-1 text-[13px] text-muted">Review immutable package, inspect audit evidence, request information, approve, and export.</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
