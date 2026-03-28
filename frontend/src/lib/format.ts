export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') || value.includes(':') ? 'short' : undefined,
  }).format(date)
}

export function maskValue(value?: string | null, visible = 4) {
  if (!value) return 'Unavailable'
  if (value.length <= visible) return value
  return `${'*'.repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`
}

export function compactHash(value?: string | null) {
  if (!value) return 'N/A'
  return `${value.slice(0, 8)}...${value.slice(-8)}`
}
