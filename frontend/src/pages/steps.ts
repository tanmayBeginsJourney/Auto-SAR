export function analystSteps(activeIndex: number) {
  const labels = [
    ['Gather Subject Profile', 'Assembling KYC, adverse media, transactions'],
    ['STR Form Autofill', 'Parts 1, 2, 3, 4, 6, 8 mapped from known facts'],
    ['Grounds of Suspicion', 'AI narrative generation and editing'],
    ['Review & Submit', 'Pre-submission validation'],
  ] as const

  return labels.map(([label, detail], index) => ({
    label,
    detail,
    state: index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'pending',
  })) as Array<{ label: string; detail: string; state: 'completed' | 'active' | 'pending' }>
}

export function poSteps(activeIndex: number) {
  const labels = [
    ['Gather Subject Profile', 'Frozen in immutable analyst snapshot'],
    ['STR Form Autofill', 'Read-only review package'],
    ['Grounds of Suspicion', 'Final narrative and AI draft provenance'],
    ['Review & Submit', 'Analyst submission locked'],
    ['PO Review', activeIndex >= 4 ? 'Decision workflow' : 'Pending approval'],
  ] as const

  return labels.map(([label, detail], index) => ({
    label,
    detail,
    state: index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'pending',
  })) as Array<{ label: string; detail: string; state: 'completed' | 'active' | 'pending' }>
}
