// Display formatters
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDays(value) {
  if (value === null || value === undefined) return 'N/A'
  return `${value} days`
}

export function formatPct(value) {
  if (value === null || value === undefined) return 'N/A'
  return `${value}%`
}

export function formatCarbon(value) {
  if (value === null || value === undefined) return 'N/A'
  return `${new Intl.NumberFormat('en-US').format(value)} kg CO₂`
}

export function formatScore(value) {
  if (value === null || value === undefined) return 'N/A'
  return Number(value).toFixed(2)
}

// Risk styling helpers
export function getRiskBadgeClass(level) {
  const normalized = (level || '').toLowerCase()
  if (normalized.includes('low')) {
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  }
  if (normalized.includes('mod') || normalized.includes('med')) {
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  }
  if (normalized.includes('high') || normalized.includes('severe')) {
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
  }
  return 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
}

export function getRiskColorHex(level) {
  const normalized = (level || '').toLowerCase()
  if (normalized.includes('low')) return '#10b981'
  if (normalized.includes('mod') || normalized.includes('med')) return '#f59e0b'
  if (normalized.includes('high') || normalized.includes('severe')) return '#ef4444'
  return '#94a3b8'
}

// Default optimization weight presets
export const PREFERENCE_PRESETS = {
  balanced: {
    label: 'Balanced',
    weights: {
      cost: 28,
      transit_time: 22,
      delay_probability: 18,
      port_congestion: 12,
      geopolitical_risk: 12,
      weather_risk: 5,
      carbon_emissions: 3,
    },
  },
  lowest_cost: {
    label: 'Lowest Cost',
    weights: {
      cost: 50,
      transit_time: 10,
      delay_probability: 15,
      port_congestion: 10,
      geopolitical_risk: 8,
      weather_risk: 5,
      carbon_emissions: 2,
    },
  },
  fastest: {
    label: 'Fastest',
    weights: {
      cost: 10,
      transit_time: 50,
      delay_probability: 20,
      port_congestion: 8,
      geopolitical_risk: 8,
      weather_risk: 3,
      carbon_emissions: 1,
    },
  },
  lowest_risk: {
    label: 'Lowest Risk',
    weights: {
      cost: 10,
      transit_time: 10,
      delay_probability: 25,
      port_congestion: 20,
      geopolitical_risk: 20,
      weather_risk: 12,
      carbon_emissions: 3,
    },
  },
}
