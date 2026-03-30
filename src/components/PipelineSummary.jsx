import { useMemo } from 'react'
import { Users, TrendingUp, Target, Briefcase, BarChart3, Receipt, FileCheck } from 'lucide-react'
import { TUNNELS, STATUTS, formatCurrency, CA_OBJECTIFS } from '../lib/constants'

export default function PipelineSummary({ prospects, allFactures = [] }) {
  const stats = useMemo(() => {
    const activeStatuts = new Set(['prospect_identifie', 'premier_contact', 'diagnostic_rdv',
      'relance_en_attente', 'deal_maturation', 'lettre_mission_envoyee', 'negociation', 'mission_en_cours'])
    const closingStatuts = new Set(['relance_en_attente', 'deal_maturation', 'lettre_mission_envoyee', 'negociation', 'mission_en_cours'])
    const signeStatuts = new Set(['mission_en_cours'])
    const perduStatuts = new Set(['perdu_refuse'])
    const prospectionStatuts = new Set(['prospect_identifie', 'premier_contact', 'diagnostic_rdv'])
    // "Signé" pour conversion = mission_en_cours + facture + cloture (deals gagnés)
    const wonStatuts = new Set(['mission_en_cours', 'facture', 'cloture'])

    let totalActive = 0
    let closingValue = 0
    let closingCount = 0
    let signeCount = 0
    let signeValue = 0
    let prospectionCount = 0
    let perduCount = 0
    let wonCount = 0
    const tunnelCounts = {}

    TUNNELS.forEach(t => { tunnelCounts[t.id] = 0 })

    prospects.forEach(p => {
      const tunnel = TUNNELS.find(t => t.statuts.includes(p.statut))
      if (tunnel) tunnelCounts[tunnel.id]++

      if (activeStatuts.has(p.statut)) totalActive++
      if (closingStatuts.has(p.statut)) {
        closingCount++
        closingValue += p.ca_estime || 0
      }
      if (signeStatuts.has(p.statut)) {
        signeCount++
        signeValue += p.ca_estime || 0
      }
      if (perduStatuts.has(p.statut)) perduCount++
      if (prospectionStatuts.has(p.statut)) prospectionCount++
      if (wonStatuts.has(p.statut)) wonCount++
    })

    // CA facturé réel (depuis la table factures)
    const factureValue = allFactures.reduce((sum, f) => sum + (f.montant || 0), 0)

    // Taux de conversion
    const totalEntres = prospectionCount + closingCount + wonCount + perduCount
    const convProspectClosing = totalEntres > 0
      ? Math.round(((closingCount + wonCount) / totalEntres) * 100) : 0
    const totalPassedClosing = closingCount + wonCount
    const convClosingSigne = totalPassedClosing > 0
      ? Math.round((wonCount / totalPassedClosing) * 100) : 0
    const convGlobal = totalEntres > 0
      ? Math.round((wonCount / totalEntres) * 100) : 0
    const panierMoyen = wonCount > 0 ? Math.round((signeValue + factureValue) / wonCount) : 0

    return {
      totalActive, closingCount, closingValue, signeCount, signeValue,
      factureValue, tunnelCounts, wonCount, perduCount,
      convProspectClosing, convClosingSigne, convGlobal, panierMoyen,
    }
  }, [prospects, allFactures])

  const objectifMax = CA_OBJECTIFS[CA_OBJECTIFS.length - 1].amount

  const cards = [
    {
      icon: Briefcase,
      label: 'Signé (en cours)',
      value: stats.signeCount,
      sub: formatCurrency(stats.signeValue),
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
    },
    {
      icon: Target,
      label: 'Prospection',
      value: stats.tunnelCounts.prospection || 0,
      color: 'text-blue-400',
    },
  ]

  // Sous-totaux CA en entonnoir
  const pipelineTotal = stats.closingValue + stats.signeValue
  const pctPipeline = objectifMax > 0 ? Math.min(100, Math.round((pipelineTotal / objectifMax) * 100)) : 0
  const pctSigne = objectifMax > 0 ? Math.min(100, Math.round((stats.signeValue / objectifMax) * 100)) : 0
  const pctFacture = objectifMax > 0 ? Math.min(100, Math.round((stats.factureValue / objectifMax) * 100)) : 0

  const kpis = [
    { label: 'Prospect → Closing', value: `${stats.convProspectClosing}%`, color: getConvColor(stats.convProspectClosing) },
    { label: 'Closing → Signé', value: `${stats.convClosingSigne}%`, color: getConvColor(stats.convClosingSigne) },
    { label: 'Conversion globale', value: `${stats.convGlobal}%`, color: getConvColor(stats.convGlobal) },
    { label: 'Panier moyen', value: formatCurrency(stats.panierMoyen), color: 'text-text-primary' },
    { label: 'Gagnés', value: stats.wonCount, color: 'text-success' },
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
            </div>
            <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-text-secondary">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* CA Entonnoir — 3 niveaux */}
      <div className="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-text-secondary" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">CA Pipeline</span>
          <span className="ml-auto text-[10px] text-text-secondary">
            Objectif : {formatCurrency(objectifMax)}
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Facturé */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Receipt size={12} className="text-success" />
                Facturé (encaissé)
              </span>
              <span className="font-semibold text-success">{formatCurrency(stats.factureValue)}</span>
            </div>
            <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${pctFacture}%` }} />
            </div>
          </div>

          {/* Signé */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <FileCheck size={12} className="text-primary" />
                Signé (mission en cours)
              </span>
              <span className="font-semibold text-primary">{formatCurrency(stats.signeValue)}</span>
            </div>
            <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-primary" style={{ width: `${pctSigne}%` }} />
            </div>
          </div>

          {/* Pipeline total */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <TrendingUp size={12} className="text-purple-400" />
                Pipeline closing (qualifié → signé)
              </span>
              <span className="font-semibold text-purple-400">{formatCurrency(pipelineTotal)}</span>
            </div>
            <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-purple-500" style={{ width: `${pctPipeline}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[10px] text-text-secondary">
          <span>{pctFacture}% facturé</span>
          <span>{pctSigne}% signé</span>
          <span>{pctPipeline}% pipeline</span>
        </div>
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
