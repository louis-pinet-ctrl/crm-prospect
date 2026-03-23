import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { TrendingUp, Target, Briefcase, Users, Calendar, TrendingDown } from 'lucide-react'
import {
  formatCurrency,
  CA_OBJECTIFS,
  TYPES_DOSSIER,
  SOURCES,
  STATUTS,
  STAGE_PROBABILITY,
  getObjectifPeriode,
  SEUIL_DORMANT_JOURS,
} from '../lib/constants'

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
  { value: 'all', label: 'Tout' },
]

function getPeriodStart(period) {
  const now = new Date()
  switch (period) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      return new Date(now.getFullYear(), q, 1)
    }
    case 'year':
      return new Date(now.getFullYear(), 0, 1)
    default:
      return new Date(2000, 0, 1)
  }
}

const tooltipStyle = {
  background: '#2a2a2a',
  border: '1px solid #3a3a3a',
  borderRadius: 8,
  color: '#fff',
}

export default function DashboardPage({ prospects, allFactures = [] }) {
  const [period, setPeriod] = useState('year')

  const filteredProspects = useMemo(() => {
    if (period === 'all') return prospects
    const start = getPeriodStart(period)
    return prospects.filter(p => {
      const d = p.date_creation ? new Date(p.date_creation) : null
      if (!d) return false
      return d >= start
    })
  }, [prospects, period])

  // Factures filtrées par période (basé sur date_facture, pas date_creation du prospect)
  const filteredFacturesTotal = useMemo(() => {
    const start = period === 'all' ? new Date(2000, 0, 1) : getPeriodStart(period)
    return allFactures
      .filter(f => f.date_facture && new Date(f.date_facture) >= start)
      .reduce((sum, f) => sum + (f.montant || 0), 0)
  }, [allFactures, period])

  // Totaux facturés par prospect (toutes dates confondues, pour calcul reste à facturer)
  const facturesTotauxParProspect = useMemo(() => {
    const map = {}
    allFactures.forEach(f => {
      map[f.prospect_id] = (map[f.prospect_id] || 0) + (f.montant || 0)
    })
    return map
  }, [allFactures])

  const stats = useMemo(() => {
    // CA facturé = somme des vraies factures sur la période
    const facture = filteredFacturesTotal

    // Reste à facturer = ca_estime des dossiers actifs - ce qui a déjà été facturé
    const resteAFacturer = filteredProspects
      .filter(p => !['perdu_refuse', 'prescripteur', 'suivi_long_terme', 'cloture'].includes(p.statut))
      .reduce((sum, p) => {
        const estime = p.ca_estime || 0
        const deja = facturesTotauxParProspect[p.id] || 0
        return sum + Math.max(0, estime - deja)
      }, 0)

    const enCours = filteredProspects
      .filter(p => p.statut === 'mission_en_cours')
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const pipeline = filteredProspects
      .filter(p => ['relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours', 'facture'].includes(p.statut))
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const actifs = filteredProspects.filter(
      p => !['cloture', 'perdu_refuse', 'prescripteur', 'suivi_long_terme'].includes(p.statut)
    ).length

    return { facture, resteAFacturer, enCours, pipeline, actifs }
  }, [filteredProspects, filteredFacturesTotal, facturesTotauxParProspect])

  // Objectif annuel : toujours calculé sur l'année en cours
  const yearStats = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    const facture = allFactures
      .filter(f => f.date_facture && new Date(f.date_facture) >= yearStart)
      .reduce((sum, f) => sum + (f.montant || 0), 0)
    const yearProspects = prospects.filter(p => p.date_creation && new Date(p.date_creation) >= yearStart)
    const enCours = yearProspects
      .filter(p => p.statut === 'mission_en_cours')
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)
    const pipeline = yearProspects
      .filter(p => ['relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours', 'facture'].includes(p.statut))
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)
    return { facture, enCours, pipeline }
  }, [prospects, allFactures])


  // --- Conversion rate per stage (pipeline only, excl. prescripteur/suivi/perdu) ---
  const conversionData = useMemo(() => {
    const pipelineStatuts = STATUTS.filter(
      s => !['perdu_refuse', 'prescripteur', 'suivi_long_terme'].includes(s.value)
    )
    const pipelineProspects = filteredProspects.filter(
      p => !['perdu_refuse', 'prescripteur', 'suivi_long_terme'].includes(p.statut)
    )

    const counts = pipelineStatuts.map(s => ({
      ...s,
      count: pipelineProspects.filter(p => {
        const pOrder = STATUTS.find(st => st.value === p.statut)?.order || 0
        return pOrder >= s.order
      }).length,
    }))

    return counts.map((s, i) => ({
      name: s.label,
      count: s.count,
      taux: i === 0
        ? 100
        : counts[i - 1].count > 0
          ? Math.round((s.count / counts[i - 1].count) * 100)
          : 0,
    }))
  }, [filteredProspects])

  // --- Average duration in current stage ---
  const durationData = useMemo(() => {
    const now = new Date()
    const activeStatuts = STATUTS.filter(
      s => !['cloture', 'perdu_refuse'].includes(s.value)
    )

    return activeStatuts.map(s => {
      const inStage = filteredProspects.filter(p => p.statut === s.value)
      if (inStage.length === 0) return { name: s.label, jours: 0 }

      const totalDays = inStage.reduce((sum, p) => {
        const modified = new Date(p.date_modification || p.date_creation)
        return sum + Math.max(0, (now - modified) / (1000 * 60 * 60 * 24))
      }, 0)

      return {
        name: s.label,
        jours: Math.round(totalDays / inStage.length),
      }
    }).filter(d => d.jours > 0)
  }, [filteredProspects])

  // --- CA Forecast next 3 months ---
  const forecastData = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push({
        label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        date: d,
        ca: 0,
      })
    }

    const activeProspects = filteredProspects.filter(
      p => !['cloture', 'perdu_refuse', 'facture', 'prescripteur', 'suivi_long_terme'].includes(p.statut)
    )

    activeProspects.forEach(p => {
      const weight = STAGE_PROBABILITY[p.statut] || 0
      const weightedCA = (p.ca_estime || 0) * weight

      if (p.date_relance) {
        const relance = new Date(p.date_relance)
        const idx = months.findIndex(
          m =>
            relance.getMonth() === m.date.getMonth() &&
            relance.getFullYear() === m.date.getFullYear()
        )
        if (idx !== -1) {
          months[idx].ca += weightedCA
          return
        }
      }
      // Distribute evenly if no relance date or not in next 3 months
      const perMonth = weightedCA / 3
      months.forEach(m => { m.ca += perMonth })
    })

    return months
  }, [filteredProspects])

  // Monthly chart data — always uses ALL prospects to show a meaningful timeline
  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()
    const monthCount = period === 'month' ? 1 : period === 'quarter' ? 3 : 12
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        date: d,
        facture: 0,
        enCours: 0,
        previsionnel: 0,
      })
    }

    // Factures réelles par mois (basé sur date_facture)
    allFactures.forEach(f => {
      if (!f.date_facture) return
      const d = new Date(f.date_facture)
      const idx = months.findIndex(m =>
        d.getMonth() === m.date.getMonth() && d.getFullYear() === m.date.getFullYear()
      )
      if (idx !== -1) months[idx].facture += f.montant || 0
    })

    // En cours + pipeline par mois (basé sur date_creation du prospect)
    prospects.forEach(p => {
      if (!p.date_creation) return
      const created = new Date(p.date_creation)
      const idx = months.findIndex(m =>
        created.getMonth() === m.date.getMonth() && created.getFullYear() === m.date.getFullYear()
      )
      if (idx === -1) return
      const ca = p.ca_estime || 0
      if (p.statut === 'mission_en_cours') {
        months[idx].enCours += ca
      } else if (!['facture', 'cloture', 'perdu_refuse', 'prescripteur', 'suivi_long_terme'].includes(p.statut)) {
        months[idx].previsionnel += ca
      }
    })

    return months.map(({ date, ...rest }) => rest)
  }, [prospects, allFactures, period])

  // Type dossier breakdown
  const typeData = useMemo(() => {
    const map = {}
    TYPES_DOSSIER.forEach(t => { map[t.value] = 0 })
    filteredProspects
      .filter(p => p.statut !== 'perdu_refuse')
      .forEach(p => { map[p.type_dossier] = (map[p.type_dossier] || 0) + (p.ca_estime || 0) })
    return TYPES_DOSSIER.map(t => ({
      name: t.label,
      value: Math.round(map[t.value]),
      color: t.color,
    })).filter(d => d.value > 0)
  }, [filteredProspects])

  // Source breakdown
  const sourceData = useMemo(() => {
    const map = {}
    SOURCES.forEach(s => { map[s.value] = 0 })
    filteredProspects
      .filter(p => p.statut !== 'perdu_refuse')
      .forEach(p => { map[p.source] = (map[p.source] || 0) + 1 })
    const colors = ['#c4e913', '#6366f1', '#ec4899', '#f97316', '#3b82f6', '#6b7280']
    return SOURCES.map((s, i) => ({
      name: s.label,
      value: map[s.value],
      color: colors[i % colors.length],
    })).filter(d => d.value > 0)
  }, [filteredProspects])

  // Taux de conversion par source
  const conversionBySourceData = useMemo(() => {
    const colors = ['#c4e913', '#6366f1', '#ec4899', '#f97316', '#3b82f6', '#6b7280']
    const wonStatuts = ['mission_en_cours', 'facture', 'cloture']
    return SOURCES.map((s, i) => {
      const total = filteredProspects.filter(p => p.source === s.value).length
      const won = filteredProspects.filter(p => p.source === s.value && wonStatuts.includes(p.statut)).length
      const taux = total > 0 ? Math.round((won / total) * 100) : 0
      return { name: s.label, total, won, taux, color: colors[i % colors.length] }
    }).filter(d => d.total > 0)
  }, [filteredProspects])

  // Objectif de la période sélectionnée
  const objectifPeriode = useMemo(() => {
    if (period === 'all') return null
    const target = getObjectifPeriode(period)
    const pct = target > 0 ? Math.round((stats.facture / target) * 100) : 0
    return { target, pct }
  }, [period, stats.facture])

  // Prospects dormants (sans interaction depuis SEUIL_DORMANT_JOURS jours)
  const dormants = useMemo(() => {
    const now = new Date()
    const seuil = new Date(now.getTime() - SEUIL_DORMANT_JOURS * 24 * 60 * 60 * 1000)
    return filteredProspects.filter(p => {
      if (['cloture', 'perdu_refuse', 'facture', 'prescripteur'].includes(p.statut)) return false
      const lastInteraction = p.date_derniere_interaction
        ? new Date(p.date_derniere_interaction)
        : p.date_creation ? new Date(p.date_creation) : null
      return lastInteraction && lastInteraction < seuil
    })
  }, [filteredProspects])

  const kpis = [
    {
      label: 'CA facturé',
      value: formatCurrency(stats.facture),
      sub: stats.resteAFacturer > 0 ? `${formatCurrency(stats.resteAFacturer)} reste à facturer` : null,
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: 'Missions en cours',
      value: formatCurrency(stats.enCours),
      icon: Briefcase,
      color: 'text-primary',
    },
    {
      label: 'Pipeline',
      value: formatCurrency(stats.pipeline),
      icon: Target,
      color: 'text-warning',
    },
    {
      label: 'Prospects actifs',
      value: stats.actifs,
      icon: Users,
      color: 'text-text-primary',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header with period filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Tableau de bord</h2>
        <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-primary text-bg-main'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* eslint-disable-next-line no-unused-vars */}
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon size={20} className={color} />
              <span className="text-text-secondary text-sm">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-text-secondary mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Objectif de la période */}
      {objectifPeriode && (
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">
              Objectif {period === 'month' ? 'mensuel' : period === 'quarter' ? 'trimestriel' : 'annuel'}
            </span>
            <span className="text-xs text-text-secondary">
              {formatCurrency(stats.facture)} / {formatCurrency(objectifPeriode.target)}
            </span>
          </div>
          <div className="w-full h-3 bg-bg-main rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, objectifPeriode.pct)}%`,
                backgroundColor: objectifPeriode.pct >= 100 ? '#4dff88' : objectifPeriode.pct >= 70 ? '#c4e913' : '#ffb84d',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs font-medium ${objectifPeriode.pct >= 100 ? 'text-success' : 'text-text-secondary'}`}>
              {objectifPeriode.pct}% atteint
            </span>
            {objectifPeriode.pct < 100 && (
              <span className="text-xs text-text-secondary">
                Reste {formatCurrency(objectifPeriode.target - stats.facture)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Objectifs annuels — barre unique avec paliers et curseurs */}
      {(() => {
        const maxAmount = CA_OBJECTIFS[CA_OBJECTIFS.length - 1].amount
        const scaleMax = maxAmount * 1.15
        const toPercent = (v) => Math.min(100, (v / scaleMax) * 100)
        const { facture, enCours, pipeline } = yearStats
        const total = facture + enCours + pipeline
        const pctFacture = maxAmount > 0 ? Math.round((facture / maxAmount) * 100) : 0
        const pctEnCours = maxAmount > 0 ? Math.round((enCours / maxAmount) * 100) : 0
        const pctPipeline = maxAmount > 0 ? Math.round((pipeline / maxAmount) * 100) : 0
        const pctTotal = maxAmount > 0 ? Math.round((total / maxAmount) * 100) : 0

        return (
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-text-primary">
                Objectifs annuels
              </span>
              <span className="text-xs text-text-secondary">
                Total potentiel : {formatCurrency(total)}
                <span className={`ml-1 font-medium ${pctTotal >= 100 ? 'text-success' : 'text-text-primary'}`}>
                  ({pctTotal}%)
                </span>
              </span>
            </div>

            {/* Paliers atteints */}
            <div className="flex flex-wrap gap-3 mb-3">
              {CA_OBJECTIFS.map(obj => {
                const pct = maxAmount > 0 ? Math.round((facture / obj.amount) * 100) : 0
                const reached = facture >= obj.amount
                return (
                  <span
                    key={obj.key}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: (reached ? obj.color : '#555') + '20',
                      color: reached ? obj.color : '#777',
                    }}
                  >
                    {obj.label} : {pct}%
                  </span>
                )
              })}
            </div>

            {/* Barre de progression */}
            <div className="relative h-6 bg-bg-main rounded-full overflow-hidden">
              {/* Pipeline (le plus large, en fond) */}
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all opacity-30"
                style={{ width: `${toPercent(facture + enCours + pipeline)}%`, backgroundColor: '#ffb84d' }}
              />
              {/* En cours */}
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all opacity-60"
                style={{ width: `${toPercent(facture + enCours)}%`, backgroundColor: '#c4e913' }}
              />
              {/* Facturé */}
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{ width: `${toPercent(facture)}%`, backgroundColor: '#4dff88' }}
              />
            </div>

            {/* Marqueurs de paliers */}
            <div className="relative h-5 mt-1">
              {CA_OBJECTIFS.map(obj => {
                const left = toPercent(obj.amount)
                const reached = facture >= obj.amount
                return (
                  <div
                    key={obj.key}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                  >
                    <div
                      className="w-0.5 h-2"
                      style={{ backgroundColor: reached ? obj.color : '#555' }}
                    />
                    <span
                      className="text-[10px] whitespace-nowrap mt-0.5"
                      style={{ color: reached ? obj.color : '#777' }}
                    >
                      {formatCurrency(obj.amount)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Légende */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4dff88' }} />
                <span className="text-xs text-text-secondary">
                  Facturé : {formatCurrency(facture)}
                  <span className="font-medium text-success ml-1">({pctFacture}%)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm opacity-60" style={{ backgroundColor: '#c4e913' }} />
                <span className="text-xs text-text-secondary">
                  En cours : {formatCurrency(enCours)}
                  <span className="font-medium text-primary ml-1">({pctEnCours}%)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm opacity-30" style={{ backgroundColor: '#ffb84d' }} />
                <span className="text-xs text-text-secondary">
                  Pipeline : {formatCurrency(pipeline)}
                  <span className="font-medium text-warning ml-1">({pctPipeline}%)</span>
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* CA Forecast next 3 months */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {forecastData.map((m, i) => (
          <div key={i} className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-text-secondary text-xs capitalize">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(m.ca)}</p>
            <p className="text-xs text-text-secondary mt-1">CA prévisionnel pondéré</p>
          </div>
        ))}
      </div>

      {/* Conversion funnel + Stage duration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion rate */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Taux de conversion par étape
          </h3>
          <div className="space-y-2">
            {conversionData.map((stage, i) => (
              <div key={stage.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary truncate">{stage.name}</span>
                    <span className="text-xs font-medium text-text-primary ml-2">
                      {stage.count}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stage.taux}%`,
                        backgroundColor: i === 0 ? '#c4e913' : stage.taux > 50 ? '#4dff88' : stage.taux > 25 ? '#ffb84d' : '#ff4d4d',
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-text-primary w-10 text-right">
                  {stage.taux}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Average duration in stage */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Durée moyenne dans l'étape (jours)
          </h3>
          {durationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#a0a0a0', fontSize: 10 }}
                  width={130}
                />
                <Tooltip
                  formatter={(v) => `${v} jours`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="jours" fill="#c4e913" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-secondary text-sm text-center py-12">
              Aucune donnée
            </p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            CA par mois
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="facture" name="Facturé" fill="#4dff88" stackId="a" />
              <Bar dataKey="enCours" name="En cours" fill="#c4e913" stackId="a" />
              <Bar dataKey="previsionnel" name="Prévisionnel" fill="#ffb84d" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type dossier pie */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Répartition par type de dossier
          </h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: '#a0a0a0' }}
                >
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-secondary text-sm text-center py-12">
              Aucune donnée
            </p>
          )}
        </div>

        {/* Source pie */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Répartition par source
          </h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={{ stroke: '#a0a0a0' }}
                >
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-secondary text-sm text-center py-12">
              Aucune donnée
            </p>
          )}
        </div>

        {/* Taux de conversion par source */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Taux de conversion par source
          </h3>
          {conversionBySourceData.length > 0 ? (
            <div className="space-y-3">
              {conversionBySourceData.map(s => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary">{s.name}</span>
                    <span className="text-xs text-text-primary">
                      {s.won}/{s.total}
                      <span className="font-medium ml-1" style={{ color: s.color }}>
                        ({s.taux}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.taux}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm text-center py-12">
              Aucune donnée
            </p>
          )}
        </div>
      </div>

      {/* Prospects dormants */}
      {dormants.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-warning" />
            <h3 className="text-sm font-medium text-warning">
              Prospects dormants ({dormants.length})
            </h3>
            <span className="text-xs text-text-secondary ml-auto">
              Sans interaction depuis +{SEUIL_DORMANT_JOURS} jours
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dormants.slice(0, 9).map(p => {
              const lastDate = p.date_derniere_interaction || p.date_creation
              const daysAgo = lastDate
                ? Math.round((new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24))
                : '?'
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-card rounded-lg text-sm"
                >
                  <span className="text-text-primary truncate flex-1">{p.nom}</span>
                  <span className="text-xs text-warning shrink-0">{daysAgo}j</span>
                </div>
              )
            })}
            {dormants.length > 9 && (
              <div className="flex items-center justify-center px-3 py-2 text-xs text-text-secondary">
                +{dormants.length - 9} autres
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
