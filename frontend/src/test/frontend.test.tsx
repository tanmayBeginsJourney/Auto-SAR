import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AnalystDashboardPage } from '../pages/analyst/AnalystDashboardPage'
import { DataAssemblyPage } from '../pages/analyst/DataAssemblyPage'
import { GroundsPage } from '../pages/analyst/GroundsPage'
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

describe('frontend flows', () => {
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

  it('keeps locked STR autofill drafts editable', async () => {
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
    expect(screen.getByDisplayValue('BAR-IND-MVP')).toBeEnabled()
    expect(screen.getByRole('button', { name: /save draft/i })).toBeEnabled()
  })

  it('continues from data assembly to STR autofill even for locked cases', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/cases/CASE003')) {
        return jsonResponse({
          caseId: 'CASE003',
          customerId: 'IND011',
          customerName: 'Pooja Iyer',
          customerType: 'INDIVIDUAL',
          primaryAccountNumber: 'AC1011',
          assignedEmployee: { employeeId: 'EMP001', name: 'Naina Kapoor', level: 'ANALYST' },
          stage: 'PENDING_REVIEW',
          startTime: '',
          summary: '',
          totalAlerts: 2,
          totalAmount: 1545000,
          riskScore: 85,
          riskLevel: 'CRITICAL',
          riskExplanation: '',
          riskFactors: [],
          branchCity: 'Bengaluru',
          sla: { status: 'WITHIN_SLA', remainingHours: 10, display: '10 hrs', deadline: '', explanation: '' },
          valueAtRisk: 1545000,
          calculation: '',
          isCryptoCase: true,
          workflow: { current_stage: 'PENDING_REVIEW', locked_for_analyst: true },
          canAnalystEdit: false,
        })
      }
      if (url.endsWith('/api/cases/CASE003/kyc')) {
        return jsonResponse({
          customerName: 'Pooja Iyer',
          customerId: 'IND011',
          pan: 'ADHPI5508C',
          occupationOrBusiness: 'Compliance Officer',
          declaredIncome: 'INR 1900000 p.a.',
          riskTier: 'HIGH',
          kycStatus: 'Current',
          watchlistStatus: 'Possible PEP Match',
          lastCddRefresh: '2022-09-18',
          primaryAccount: {
            accountNumber: 'AC1011',
            accountType: 'Deposit - Savings',
            branchCity: 'Bengaluru',
            accountStatus: 'Active - Under Review',
          },
        })
      }
      if (url.endsWith('/api/cases/CASE003/transactions')) {
        return jsonResponse([])
      }
      if (url.endsWith('/api/cases/CASE003/alerts')) {
        return jsonResponse([])
      }
      if (url.endsWith('/api/cases/CASE003/prior-alerts')) {
        return jsonResponse([])
      }
      if (url.endsWith('/api/cases/CASE003/entity-graph')) {
        return jsonResponse({ nodes: [], edges: [] })
      }
      if (url.endsWith('/api/cases/CASE003/adverse-media')) {
        return jsonResponse([])
      }
      if (url.endsWith('/api/cases/CASE003/data-assembly/complete-stage')) {
        throw new Error(`Should not complete stage for locked case: ${init?.method}`)
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE003/data-assembly']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/data-assembly" element={<DataAssemblyPage />} />
            <Route path="/cases/:caseId/str-autofill" element={<div>STR Autofill Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Case Readiness')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /verified\. continue to str autofill/i }))
    expect(await screen.findByText('STR Autofill Page')).toBeInTheDocument()
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

  it('continues from STR autofill to grounds even for locked cases', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
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
          riskScore: 84,
          riskLevel: 'HIGH',
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
      if (url.endsWith('/api/cases/CASE002/str-autofill') && !init?.method) {
        return jsonResponse({
          caseId: 'CASE002',
          sections: {
            part3: { branchCity: 'Mumbai', branchCode: 'BAR-IND-MVP', reportingLocation: 'Mumbai' },
            part7: { groundsSummary: 'Initial summary' },
          },
          updatedAt: '',
          updatedBy: 'system',
        })
      }
      if (url.endsWith('/api/cases/CASE002/str-autofill/complete-stage')) {
        throw new Error(`Should not complete stage for locked case: ${init?.method}`)
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE002/str-autofill']}>
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

  it('applies copilot suggestions into the narrative draft', async () => {
    const user = userEvent.setup()
    let auditCalls = 0
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/cases/CASE001/grounds')) {
        return jsonResponse({
          case: {
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
            riskExplanation: 'Suspicious because the pattern does not match the profile.',
            riskFactors: [{ name: 'Structuring', contribution: 45, factualBasis: 'Repeated near-threshold cash deposits.' }],
            branchCity: 'Pune',
            sla: { status: 'WITHIN_SLA', remainingHours: 10, display: '10 hrs', deadline: '', explanation: '' },
            valueAtRisk: 5136000,
            calculation: '',
            isCryptoCase: false,
            workflow: { current_stage: 'IN_PROGRESS', locked_for_analyst: false },
            canAnalystEdit: true,
          },
          narrative: {
            finalText: 'Original narrative draft.',
            aiDraftText: 'Original narrative draft.',
            sections: [{ id: 'body', title: 'Body', text: 'Original narrative draft.' }],
            retrievedGuidance: [],
            paragraphTraces: [],
          },
          dossier: {
            risk: { riskFactors: [{ name: 'Structuring', contribution: 45, factualBasis: 'Repeated near-threshold cash deposits.' }] },
            alerts: [{ alert_id: 'AL001', alert_name: 'Structuring' }],
            transactions: [{ transaction_id: 'T001', txn_timestamp: '2022-09-14', amount: 975000 }],
          },
        })
      }
      if (url.endsWith('/api/cases/CASE001/narrative/audit')) {
        auditCalls += 1
        if (auditCalls === 1) {
          return jsonResponse({
            promptVersion: 'autosar-v1',
            ledgerEntries: [
              {
                eventId: 'evt_1',
                occurredAt: '2026-03-29T11:05:00Z',
                heading: 'Initial draft generated',
                description: 'Generated the first narrative draft using gpt-5.4.',
              },
            ],
          })
        }
        if (auditCalls === 2) {
          return jsonResponse({
            promptVersion: 'autosar-v1',
            ledgerEntries: [
              {
                eventId: 'evt_1',
                occurredAt: '2026-03-29T11:05:00Z',
                heading: 'Initial draft generated',
                description: 'Generated the first narrative draft using gpt-5.4.',
              },
              {
                eventId: 'evt_2',
                occurredAt: '2026-03-29T11:06:00Z',
                heading: 'Copilot asked',
                description: 'User asked "Rewrite this to sound more formal."',
              },
            ],
          })
        }
        return jsonResponse({
          promptVersion: 'autosar-v1',
          ledgerEntries: [
            {
              eventId: 'evt_1',
              occurredAt: '2026-03-29T11:05:00Z',
              heading: 'Initial draft generated',
              description: 'Generated the first narrative draft using gpt-5.4.',
            },
            {
              eventId: 'evt_2',
              occurredAt: '2026-03-29T11:06:00Z',
              heading: 'Copilot asked',
              description: 'User asked "Rewrite this to sound more formal."',
            },
            {
              eventId: 'evt_3',
              occurredAt: '2026-03-29T11:07:00Z',
              heading: 'Copilot applied',
              description: 'Applied the copilot suggestion from query "Rewrite this to sound more formal." to the draft editor.',
            },
          ],
        })
      }
      if (url.endsWith('/api/cases/CASE001/narrative/copilot') && init?.method === 'POST') {
        expect(init.body).toBe(
          JSON.stringify({
            question: 'Rewrite this to sound more formal.',
            current_draft: 'Original narrative draft.',
          }),
        )
        return jsonResponse({
          answer: 'I tightened the tone and made the chronology more formal.',
          suggestedText: 'Updated formal narrative draft.',
          model: 'gpt-5.4',
        })
      }
      if (url.endsWith('/api/cases/CASE001/narrative/copilot/apply') && init?.method === 'POST') {
        expect(init.body).toBe(
          JSON.stringify({
            question: 'Rewrite this to sound more formal.',
            suggested_text: 'Updated formal narrative draft.',
            model: 'gpt-5.4',
          }),
        )
        return jsonResponse({ status: 'ok' })
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE001/grounds-of-suspicion']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/grounds-of-suspicion" element={<GroundsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    const copilotPrompt = await screen.findByPlaceholderText(/ask for a rewrite/i)
    await user.clear(copilotPrompt)
    await user.type(copilotPrompt, 'Rewrite this to sound more formal.')
    await user.click(screen.getByRole('button', { name: /ask ai compliance agent/i }))

    expect(await screen.findByText(/tightened the tone/i)).toBeInTheDocument()
    expect(await screen.findByText(/User asked "Rewrite this to sound more formal."/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /apply to draft/i }))

    expect(screen.getByPlaceholderText('Generate the draft to start editing.')).toHaveValue('Updated formal narrative draft.')
    expect(await screen.findByText(/Applied the copilot suggestion from query/i)).toBeInTheDocument()
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

  it('keeps grounds save and continue available for locked cases', async () => {
    const user = userEvent.setup()
    let savedDraft = false
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/api/cases/CASE002/grounds')) {
        return jsonResponse({
          case: {
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
            riskScore: 84,
            riskLevel: 'HIGH',
            riskExplanation: 'Unusual activity.',
            riskFactors: [{ name: 'Screening alert', contribution: 20, factualBasis: 'Adverse screening hit.' }],
            branchCity: 'Mumbai',
            sla: { status: 'WITHIN_SLA', remainingHours: 10, display: '10 hrs', deadline: '', explanation: '' },
            valueAtRisk: 6402000,
            calculation: '',
            isCryptoCase: false,
            workflow: { current_stage: 'PENDING_REVIEW', locked_for_analyst: true },
            canAnalystEdit: false,
          },
          narrative: {
            finalText: 'Locked narrative draft.',
            aiDraftText: 'Locked narrative draft.',
            sections: [{ id: 'body', title: 'Body', text: 'Locked narrative draft.' }],
            retrievedGuidance: [],
            paragraphTraces: [],
          },
          dossier: {
            risk: { riskFactors: [{ name: 'Screening alert', contribution: 20, factualBasis: 'Adverse screening hit.' }] },
            alerts: [{ alert_id: 'AL004', alert_name: 'Screening alert' }],
            transactions: [{ transaction_id: 'T023', txn_timestamp: '2022-09-21 10:00:00', amount: 780000 }],
          },
        })
      }
      if (url.endsWith('/api/cases/CASE002/narrative') && init?.method === 'PUT') {
        savedDraft = true
        return jsonResponse({
          finalText: 'Locked narrative draft.',
          aiDraftText: 'Locked narrative draft.',
          sections: [{ id: 'body', title: 'Body', text: 'Locked narrative draft.' }],
          retrievedGuidance: [],
          paragraphTraces: [],
        })
      }
      if (url.endsWith('/api/cases/CASE002/narrative/compliance-check') && init?.method === 'POST') {
        return jsonResponse({ passed: true, checks: [] })
      }
      if (url.endsWith('/api/cases/CASE002/narrative/complete-stage')) {
        throw new Error(`Should not complete stage for locked case: ${init?.method}`)
      }
      if (url.endsWith('/api/cases/CASE002/narrative/audit')) {
        return jsonResponse({ ledgerEntries: [] })
      }
      if (url.endsWith('/api/cases/CASE002/narrative/copilot') || url.endsWith('/api/cases/CASE002/narrative/copilot/apply')) {
        throw new Error(`Unexpected copilot call ${url}`)
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE002/grounds-of-suspicion']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/grounds-of-suspicion" element={<GroundsPage />} />
            <Route path="/cases/:caseId/pre-submission-validation" element={<div>Validation Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Narrative Draft')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Generate the draft to start editing.')).toBeEnabled()
    expect(screen.getByRole('button', { name: /generate draft/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /regenerate conclusion/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /save draft/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /continue to validation/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /save draft/i }))
    await waitFor(() => expect(savedDraft).toBe(true))

    await user.click(screen.getByRole('button', { name: /continue to validation/i }))
    expect(await screen.findByText('Validation Page')).toBeInTheDocument()
  })

  it('keeps validation submit available for locked cases when checks pass', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/cases/CASE002/presubmission-validation')) {
        return jsonResponse({
          status: 'PASS',
          checks: [{ rule: 'Narrative draft exists', passed: true, severity: 'hard', explanation: 'Narrative present' }],
          hardBlockers: [],
          warnings: [],
        })
      }
      if (url.endsWith('/api/cases/CASE002/submit')) {
        return jsonResponse({ status: 'submitted' })
      }
      throw new Error(`Unhandled fetch ${url}`)
    })

    render(
      <MemoryRouter initialEntries={['/cases/CASE002/pre-submission-validation']}>
        <AuthProvider>
          <Routes>
            <Route path="/cases/:caseId/pre-submission-validation" element={<ValidationPage />} />
            <Route path="/cases/:caseId/submission-confirmed" element={<div>Submission Confirmed</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Submission Readiness')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit to principal officer/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /submit to principal officer/i }))
    expect(await screen.findByText('Submission Confirmed')).toBeInTheDocument()
  })
})
