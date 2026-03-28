export type Role = 'ANALYST' | 'PO'

export interface Actor {
  role: Role
  user_id: string
  user_name: string
}

export interface CaseItem {
  caseId: string
  customerId: string
  customerName: string
  customerType: string
  primaryAccountNumber: string
  stage: string
  summary: string
  totalAlerts: number
  totalAmount: number
  riskScore: number
  riskLevel: string
  riskExplanation: string
  riskFactors: Array<{
    name: string
    contribution: number
    factualBasis: string
    sourceReferences: string[]
  }>
  branchCity: string
  assignedEmployee: {
    employeeId: string
    name: string
    level: string
  }
  sla: {
    status: string
    remainingHours: number
    display: string
    deadline: string
    explanation: string
  }
  valueAtRisk: number
  calculation: string
  isCryptoCase: boolean
  workflow: {
    current_stage: string
    locked_for_analyst: boolean
    current_review_cycle_id?: string | null
    po_route?: {
      user_id: string
      user_name: string
      role: Role
    }
    notifications?: Array<Record<string, unknown>>
  }
  canAnalystEdit: boolean
}

export interface AlertItem {
  alert_id: string
  rule_id: string
  alert_name: string
  alert_text: string
  triggered_at: string
  explanation: string
  transactions: TransactionItem[]
}

export interface TransactionItem {
  transaction_id: string
  txn_timestamp: string
  payment_format: string
  transaction_type: string
  amount: number
  direction: string
  signedAmount: number
  channel: string
  branch_city: string
  scenario_group: string
  counterparty_customer_id?: string
  counterpartyLabel: string
  fromBankName?: string
  toBankName?: string
  isCryptoTouch: boolean
}
