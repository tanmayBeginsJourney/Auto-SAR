import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AnalystDashboardPage } from '../pages/analyst/AnalystDashboardPage'
import { StrAutofillPage } from '../pages/analyst/StrAutofillPage'
import { ValidationPage } from '../pages/analyst/ValidationPage'
import { AuthProvider } from '../state/auth'

const analystSession = {
  role: 'ANALYST',
  userId: 'EMP001',
  userName: 'Naina Kapoor',
}

function setSession() {
  localStorage.setItem('autosar-demo-session', JSON.stringify(analystSession))
}

function jsonResponse(payload: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('frontend MVP flows', () => {
  beforeEach(() => {
    localStorage.clear()
    setSession()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders key analyst dashboard data states', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/dashboard/summary')) {
        return jsonResponse({
          openAlerts: 8,
          breachingSla: 1,
          inProgress: 2,
          pendingPoReview: 1,
          activeCaseCount: 3,
          subtitle: '3 Active Cases (8 Alerts) · Sorted by SLA deadline',
        })
      }
      if (url.includes('/cases?')) {
        return jsonResponse([
          {
            caseId: 'CASE001',
            customerId: 'IND003',
            customerName: 'Amit Verma',
            customerType: 'INDIVIDUAL',
            primaryAccountNumber: 'AC1003',
            assignedEmployee: { employeeId: 'EMP001', name: 'Naina Kapoor', level: 'ANALYST' },
            stage: 'IN_PROGRESS',
            startTime: '2022-09-16 09:15:00',
            summary: 'Summary',
            totalAlerts: 3,
            totalAmount: 5136000,
            riskScore: 100,
            riskLevel: 'CRITICAL',
            riskExplanation: 'Explanation',
            riskFactors: [],
            branchCity: 'Pune',
            sla: { status: 'BREACHED', remainingHours: -10, display: 'Breached by 10h', deadline: '', explanation: '' },
            valueAtRisk: 5136000,
            calculation: 'calc',
            isCryptoCase: false,
            workflow: { current_stage: 'IN_PROGRESS', locked_for_analyst: false },
            canAnalystEdit: true,
          },
        ])
      }
      if (url.includes('/alerts')) {
        return jsonResponse([])
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter>
        <AuthProvider>
          <AnalystDashboardPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('My Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Amit Verma')).toBeInTheDocument()
    expect(screen.getByText('CASE001')).toBeInTheDocument()
  })

  it('shows validation blockers from the backend', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/presubmission-validation')) {
        return jsonResponse({
          status: 'BLOCKED',
          checks: [{ rule: 'Narrative draft exists', passed: false, severity: 'hard', explanation: 'No narrative draft' }],
          hardBlockers: [{ rule: 'Narrative draft exists', explanation: 'No narrative draft' }],
          warnings: [],
        })
      }
      if (url.endsWith('/api/cases/CASE001')) {
        return jsonResponse({ canAnalystEdit: true })
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE001/pre-submission-validation']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/pre-submission-validation" element={<ValidationPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Submission Readiness')).toBeInTheDocument()
    expect(screen.getByText('Narrative draft exists')).toBeInTheDocument()
    expect(screen.getByText('Blocker')).toBeInTheDocument()
  })

  it('renders locked analyst drafts as non-editable', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/api/cases/CASE002')) {
        return jsonResponse({
          caseId: 'CASE002',
          customerId: 'ENT001',
          customerName: 'Vertex Exports Pvt Ltd',
          customerType: 'ENTITY',
          primaryAccountNumber: 'AC2001',
          assignedEmployee: { employeeId: 'EMP001', name: 'Naina Kapoor', level: 'ANALYST' },
          stage: 'PENDING_REVIEW',
          startTime: '',
          summary: '',
          totalAlerts: 3,
          totalAmount: 6402000,
          riskScore: 100,
          riskLevel: 'CRITICAL',
          riskExplanation: '',
          riskFactors: [],
          branchCity: 'Mumbai',
          sla: { status: 'WITHIN_SLA', remainingHours: 10, display: '10 hrs', deadline: '', explanation: '' },
          valueAtRisk: 6402000,
          calculation: '',
          isCryptoCase: false,
          workflow: { current_stage: 'PENDING_REVIEW', locked_for_analyst: true },
          canAnalystEdit: false,
        })
      }
      if (url.endsWith('/api/cases/CASE002/str-autofill')) {
        return jsonResponse({
          caseId: 'CASE002',
          sections: {
            part3: { branchCity: 'Mumbai', branchCode: 'BAR-IND-MVP', reportingLocation: 'Mumbai' },
            part4: { individuals: [] },
          },
          updatedAt: '',
          updatedBy: 'system',
        })
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE002/str-autofill']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/str-autofill" element={<StrAutofillPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Part 3')).toBeInTheDocument()
    expect(screen.getByDisplayValue('BAR-IND-MVP')).toBeDisabled()
    expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled()
  })

  it('continues from STR autofill to grounds of suspicion', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/cases/CASE001')) {
        return jsonResponse({
          caseId: 'CASE001',
          customerId: 'IND003',
          customerName: 'Amit Verma',
          customerType: 'INDIVIDUAL',
          primaryAccountNumber: 'AC1003',
          assignedEmployee: { employeeId: 'EMP001', name: 'Naina Kapoor', level: 'ANALYST' },
          stage: 'IN_PROGRESS',
          startTime: '',
          summary: '',
          totalAlerts: 3,
          totalAmount: 5136000,
          riskScore: 100,
          riskLevel: 'CRITICAL',
          riskExplanation: '',
          riskFactors: [],
          branchCity: 'Pune',
          sla: { status: 'WITHIN_SLA', remainingHours: 10, display: '10 hrs', deadline: '', explanation: '' },
          valueAtRisk: 5136000,
          calculation: '',
          isCryptoCase: false,
          workflow: { current_stage: 'IN_PROGRESS', locked_for_analyst: false },
          canAnalystEdit: true,
        })
      }
      if (url.endsWith('/api/cases/CASE001/str-autofill') && !init?.method) {
        return jsonResponse({
          caseId: 'CASE001',
          sections: {
            part3: { branchCity: 'Pune', branchCode: 'BAR-IND-MVP', reportingLocation: 'Pune' },
            part7: { groundsSummary: 'Initial summary' },
          },
          updatedAt: '',
          updatedBy: 'system',
        })
      }
      if (url.endsWith('/api/cases/CASE001/str-autofill') && init?.method === 'PUT') {
        expect(init.body).toBe(
          JSON.stringify({
            values: {
              caseId: 'CASE001',
              sections: {
                part3: { branchCity: 'Pune', branchCode: 'BAR-IND-MVP', reportingLocation: 'Pune' },
                part7: { groundsSummary: 'Initial summary' },
              },
              updatedAt: '',
              updatedBy: 'system',
            },
          }),
        )
        return jsonResponse({
          caseId: 'CASE001',
          sections: {
            part3: { branchCity: 'Pune', branchCode: 'BAR-IND-MVP', reportingLocation: 'Pune' },
            part7: { groundsSummary: 'Initial summary' },
          },
          updatedAt: '',
          updatedBy: 'Naina Kapoor',
        })
      }
      if (url.endsWith('/api/cases/CASE001/str-autofill/complete-stage') && init?.method === 'POST') {
        return jsonResponse({ current_stage: 'IN_PROGRESS', locked_for_analyst: false })
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE001/str-autofill']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/str-autofill" element={<StrAutofillPage />} />
            <Route path="/cases/:caseId/grounds-of-suspicion" element={<div>Grounds Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Part 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue to grounds of suspicion/i }))

    expect(await screen.findByText('Grounds Page')).toBeInTheDocument()
  })

  it('protects routes by role', async () => {
    render(
      <MemoryRouter initialEntries={['/po/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/po/dashboard"
              element={
                <ProtectedRoute role="PO">
                  <div>PO Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/analyst/dashboard" element={<div>Analyst Home</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Analyst Home')).toBeInTheDocument()
    })
  })
})
