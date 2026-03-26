import { useMemo } from 'react'
import { Users, TrendingUp, Target, Briefcase, BarChart3, ArrowRight } from 'lucide-react'
import { TUNNELS, STATUTS, formatCurrency, CA_OBJECTIFS } from '../lib/constants'

export default function PipelineSummary({ prospects }) {
  const stats = useMemo(() => {
    const activeStatuts = new Set(['prospect_identifie', 'premier_contact', 'diagnostic_rdv',
      'relance_en_attente', 'deal_maturation', 'lettre_mission_envoyee', 'negociation', 'mission_en_cours'])
    const closingStatuts = new Set(['relance_en_attente', 'deal_maturation', 'lettre_mission_envoyee', 'negociation', 'mission_en_cours'])
    const enCoursStatuts = new Set(['mission_en_cours'])
    const signeStatuts = new Set(['mission_en_cours', 'facture', 'cloture'])
    const perduStatuts = new Set(['perdu_refuse'])
    const prospectionStatuts = new Set(['prospect_identifie', 'premier_contact', 'diagnostic_rdv'])

    let totalActive = 0
    let closingValue = 0
    let closingCount = 0
    let enCoursCount = 0
    let enCoursValue = 0
    let totalProspects = 0
    let passedClosing = 0 // prospects who reached closing stage (closing + signed + lost after closing)
    let signeCount = 0
    let signeValue = 0
    let prospectionCount = 0
    let perduCount = 0
    const tunnelCounts = {}

    TUNNELS.forEach(t => { tunnelCounts[t.id] = 0 })

    prospects.forEach(p => {
      const tunnel = TUNNELS.find(t => t.statuts.includes(p.statut))
      if (tunnel) tunnelCounts[tunnel.id]++

      totalProspects++

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
      if (signeStatuts.has(p.statut)) {
        signeCount++
        signeValue += p.ca_estime || 0
        passedClosing++
      }
      if (perduStatuts.has(p.statut)) {
        perduCount++
      }
      if (prospectionStatuts.has(p.statut)) {
        prospectionCount++
      }
    })

    // Taux de conversion
    // Prospect → Closing : prospects ayant atteint le closing / total (hors prescripteurs/suivi)
    const totalEntres = prospectionCount + closingCount + signeCount + perduCount
    const convProspectClosing = totalEntres > 0
      ? Math.round(((closingCount + signeCount) / totalEntres) * 100) : 0

    // Closing → Signé
    const totalPassedClosing = closingCount + signeCount
    const convClosingSigne = totalPassedClosing > 0
      ? Math.round((signeCount / totalPassedClosing) * 100) : 0

    // Global : prospect → signé
    const convGlobal = totalEntres > 0
      ? Math.round((signeCount / totalEntres) * 100) : 0

    // Panier moyen missions signées
    const panierMoyen = signeCount > 0 ? Math.round(signeValue / signeCount) : 0

    return {
      totalActive, closingCount, closingValue, enCoursCount, enCoursValue,
      tunnelCounts, signeCount, perduCount,
      convProspectClosing, convClosingSigne, convGlobal, panierMoyen,
    }
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

  const kpis = [
    { label: 'Prospect → Closing', value: `${stats.convProspectClosing}%`, color: getConvColor(stats.convProspectClosing) },
    { label: 'Closing → Signé', value: `${stats.convClosingSigne}%`, color: getConvColor(stats.convClosingSigne) },
    { label: 'Conversion globale', value: `${stats.convGlobal}%`, color: getConvColor(stats.convGlobal) },
    { label: 'Panier moyen', value: formatCurrency(stats.panierMoyen), color: 'text-text-primary' },
    { label: 'Signés', value: stats.signeCount, color: 'text-success' },
    { label: 'Perdus', value: stats.perduCount, color: 'text-red-400' },
  ]

  return (
    <div className="mx-6 mt-4 space-y-3">
      {/* Pipeline cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* KPI Conversion */}
      <div className="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-text-secondary" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Taux de conversion</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="text-center">
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-text-secondary leading-tight mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getConvColor(pct) {
  if (pct >= 50) return 'text-success'
  if (pct >= 25) return 'text-yellow-400'
  return 'text-red-400'
}
