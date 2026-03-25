import { useMemo } from 'react'
import { Users, TrendingUp, Target, Briefcase } from 'lucide-react'
import { TUNNELS, STATUTS, formatCurrency, CA_OBJECTIFS } from '../lib/constants'

export default function PipelineSummary({ prospects }) {
  const stats = useMemo(() => {
    const activeStatuts = new Set(['prospect_identifie', 'premier_contact', 'diagnostic_rdv',
      'relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours'])
    const closingStatuts = new Set(['relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours'])

    const enCoursStatuts = new Set(['mission_en_cours'])

    let totalActive = 0
    let closingValue = 0
    let closingCount = 0
    let enCoursCount = 0
    let enCoursValue = 0
    const tunnelCounts = {}

    TUNNELS.forEach(t => { tunnelCounts[t.id] = 0 })

    prospects.forEach(p => {
      // Count per tunnel
      const tunnel = TUNNELS.find(t => t.statuts.includes(p.statut))
      if (tunnel) tunnelCounts[tunnel.id]++

      if (activeStatuts.has(p.statut)) {
        totalActive++
      }
      if (closingStatuts.has(p.statut)) {
        closingCount++
        closingValue += p.ca_estime || 0
      }
      if (enCoursStatuts.has(p.statut)) {
        enCoursCount++
        enCoursValue += p.ca_estime || 0
      }
    })

    return { totalActive, closingCount, closingValue, enCoursCount, enCoursValue, tunnelCounts }
  }, [prospects])

  const objectifMax = CA_OBJECTIFS[CA_OBJECTIFS.length - 1].amount
  const pctClosing = objectifMax > 0 ? Math.min(100, Math.round((stats.closingValue / objectifMax) * 100)) : 0

  const cards = [
    {
      icon: Briefcase,
      label: 'En cours',
      value: stats.enCoursCount,
      sub: formatCurrency(stats.enCoursValue),
      color: 'text-success',
    },
    {
      icon: Users,
      label: 'Actifs',
      value: stats.totalActive,
      color: 'text-primary',
    },
    {
      icon: TrendingUp,
      label: 'En closing',
      value: stats.closingCount,
      sub: formatCurrency(stats.closingValue),
      color: 'text-purple-400',
      pct: pctClosing,
      barColor: '#a78bfa',
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
            {card.pct != null && (
              <span className={`ml-auto text-xs font-medium ${card.pct >= 100 ? 'text-success' : 'text-text-secondary'}`}>
                {card.pct}%
              </span>
            )}
          </div>
          <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
          {card.sub && <p className="text-xs text-text-secondary">{card.sub}</p>}
          {card.pct != null && (
            <div className="w-full h-1.5 bg-bg-main rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${card.pct}%`, backgroundColor: card.barColor }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
