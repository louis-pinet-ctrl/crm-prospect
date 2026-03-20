import { useMemo } from 'react'
import { Users, TrendingUp, Target, Briefcase } from 'lucide-react'
import { TUNNELS, STATUTS, formatCurrency } from '../lib/constants'

export default function PipelineSummary({ prospects }) {
  const stats = useMemo(() => {
    const activeStatuts = new Set(['prospect_identifie', 'premier_contact', 'diagnostic_rdv',
      'relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours'])
    const closingStatuts = new Set(['relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours'])

    let totalActive = 0
    let pipelineValue = 0
    let closingValue = 0
    let closingCount = 0
    const tunnelCounts = {}

    TUNNELS.forEach(t => { tunnelCounts[t.id] = 0 })

    prospects.forEach(p => {
      // Count per tunnel
      const tunnel = TUNNELS.find(t => t.statuts.includes(p.statut))
      if (tunnel) tunnelCounts[tunnel.id]++

      if (activeStatuts.has(p.statut)) {
        totalActive++
        pipelineValue += p.ca_estime || 0
      }
      if (closingStatuts.has(p.statut)) {
        closingCount++
        closingValue += p.ca_estime || 0
      }
    })

    return { totalActive, pipelineValue, closingCount, closingValue, tunnelCounts }
  }, [prospects])

  const cards = [
    {
      icon: Users,
      label: 'Actifs',
      value: stats.totalActive,
      color: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: 'Pipe total',
      value: formatCurrency(stats.pipelineValue),
      color: 'text-success',
    },
    {
      icon: Briefcase,
      label: 'En closing',
      value: stats.closingCount,
      sub: formatCurrency(stats.closingValue),
      color: 'text-purple-400',
    },
    {
      icon: Target,
      label: 'Prospection',
      value: stats.tunnelCounts.prospection || 0,
      color: 'text-blue-400',
    },
  ]

  return (
    <div className="mx-6 mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <card.icon size={14} className={card.color} />
            <span className="text-xs text-text-secondary">{card.label}</span>
          </div>
          <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
          {card.sub && <p className="text-xs text-text-secondary">{card.sub}</p>}
        </div>
      ))}
    </div>
  )
}
