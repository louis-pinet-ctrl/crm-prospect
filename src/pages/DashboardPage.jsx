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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'
import { TrendingUp, Target, Briefcase, Users, Calendar, ArrowRight } from 'lucide-react'
import {
  formatCurrency,
  CA_OBJECTIF,
  TYPES_DOSSIER,
  SOURCES,
  STATUTS,
  STAGE_PROBABILITY,
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

export default function DashboardPage({ prospects }) {
  const [period, setPeriod] = useState('year')

  const filteredProspects = useMemo(() => {
    const start = getPeriodStart(period)
    return prospects.filter(p => {
      if (!p.date_creation) return true
      return new Date(p.date_creation) >= start
    })
  }, [prospects, period])

  const stats = useMemo(() => {
    const facture = filteredProspects
      .filter(p => ['facture', 'cloture'].includes(p.statut))
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const enCours = filteredProspects
      .filter(p => p.statut === 'mission_en_cours')
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const previsionnel = filteredProspects
      .filter(p => p.statut !== 'perdu_refuse')
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const actifs = filteredProspects.filter(
      p => !['cloture', 'perdu_refuse', 'prescripteur', 'suivi_long_terme'].includes(p.statut)
    ).length

    return { facture, enCours, previsionnel, actifs }
  }, [filteredProspects])

  const progressPercent = Math.min(
    100,
    Math.round((stats.facture / CA_OBJECTIF) * 100)
  )

  // --- Conversion rate per stage ---
  const conversionData = useMemo(() => {
    const pipeline = STATUTS.filter(s => s.value !== 'perdu_refuse')
    const counts = pipeline.map(s => ({
      ...s,
      count: filteredProspects.filter(p => {
        const pOrder = STATUTS.find(st => st.value === p.statut)?.order || 0
        return pOrder >= s.order && p.statut !== 'perdu_refuse'
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

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        date: d,
        facture: 0,
        enCours: 0,
        previsionnel: 0,
      })
    }

    filteredProspects.forEach(p => {
      if (!p.date_creation) return
      const created = new Date(p.date_creation)
      const idx = months.findIndex(m => {
        return (
          created.getMonth() === m.date.getMonth() &&
          created.getFullYear() === m.date.getFullYear()
        )
      })
      if (idx === -1) return
      const ca = p.ca_estime || 0
      if (['facture', 'cloture'].includes(p.statut)) {
        months[idx].facture += ca
      } else if (p.statut === 'mission_en_cours') {
        months[idx].enCours += ca
      } else if (!['perdu_refuse', 'prescripteur', 'suivi_long_terme'].includes(p.statut)) {
        months[idx].previsionnel += ca
      }
    })

    return months.map(({ date, ...rest }) => rest)
  }, [filteredProspects])

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

  const kpis = [
    {
      label: 'CA facturé',
      value: formatCurrency(stats.facture),
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: 'CA en cours',
      value: formatCurrency(stats.enCours),
      icon: Briefcase,
      color: 'text-primary',
    },
    {
      label: 'CA prévisionnel',
      value: formatCurrency(stats.previsionnel),
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
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon size={20} className={color} />
              <span className="text-text-secondary text-sm">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Objectif */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">
            Objectif annuel : {formatCurrency(CA_OBJECTIF)}
          </span>
          <span className="text-sm font-medium text-primary">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-bg-main rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-1">
          {formatCurrency(stats.facture)} facturé sur {formatCurrency(CA_OBJECTIF)}
        </p>
      </div>

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
      </div>
    </div>
  )
}
