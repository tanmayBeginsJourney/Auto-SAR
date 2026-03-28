import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { AnalystDashboardPage } from './pages/analyst/AnalystDashboardPage'
import { DataAssemblyPage } from './pages/analyst/DataAssemblyPage'
import { GroundsPage } from './pages/analyst/GroundsPage'
import { SubmissionConfirmedPage } from './pages/analyst/SubmissionConfirmedPage'
import { StrAutofillPage } from './pages/analyst/StrAutofillPage'
import { ValidationPage } from './pages/analyst/ValidationPage'
import { PoDashboardPage } from './pages/po/PoDashboardPage'
import { PoDecisionPage } from './pages/po/PoDecisionPage'
import { PoReviewPage } from './pages/po/PoReviewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/analyst/dashboard"
        element={
          <ProtectedRoute role="ANALYST">
            <AnalystDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:caseId/data-assembly"
        element={
          <ProtectedRoute role="ANALYST">
            <DataAssemblyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:caseId/str-autofill"
        element={
          <ProtectedRoute role="ANALYST">
            <StrAutofillPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:caseId/grounds-of-suspicion"
        element={
          <ProtectedRoute role="ANALYST">
            <GroundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:caseId/pre-submission-validation"
        element={
          <ProtectedRoute role="ANALYST">
            <ValidationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:caseId/submission-confirmed"
        element={
          <ProtectedRoute role="ANALYST">
            <SubmissionConfirmedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/po/dashboard"
        element={
          <ProtectedRoute role="PO">
            <PoDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/po/cases/:caseId/review"
        element={
          <ProtectedRoute role="PO">
            <PoReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/po/cases/:caseId/decision"
        element={
          <ProtectedRoute role="PO">
            <PoDecisionPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
