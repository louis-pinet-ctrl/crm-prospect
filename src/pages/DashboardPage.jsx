import { useMemo } from 'react'
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
import { TrendingUp, Target, Briefcase, Users } from 'lucide-react'
import {
  formatCurrency,
  CA_OBJECTIF,
  TYPES_DOSSIER,
  SOURCES,
} from '../lib/constants'

export default function DashboardPage({ prospects }) {
  const stats = useMemo(() => {
    const facture = prospects
      .filter(p => ['facture', 'cloture'].includes(p.statut))
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const enCours = prospects
      .filter(p => p.statut === 'mission_en_cours')
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const previsionnel = prospects
      .filter(p => p.statut !== 'perdu_refuse')
      .reduce((sum, p) => sum + (p.ca_estime || 0), 0)

    const actifs = prospects.filter(
      p => !['cloture', 'perdu_refuse'].includes(p.statut)
    ).length

    return { facture, enCours, previsionnel, actifs }
  }, [prospects])

  const progressPercent = Math.min(
    100,
    Math.round((stats.facture / CA_OBJECTIF) * 100)
  )

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

    prospects.forEach(p => {
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
      } else if (p.statut !== 'perdu_refuse') {
        months[idx].previsionnel += ca
      }
    })

    return months.map(({ date, ...rest }) => rest)
  }, [prospects])

  // Type dossier breakdown
  const typeData = useMemo(() => {
    const map = {}
    TYPES_DOSSIER.forEach(t => { map[t.value] = 0 })
    prospects
      .filter(p => p.statut !== 'perdu_refuse')
      .forEach(p => { map[p.type_dossier] = (map[p.type_dossier] || 0) + (p.ca_estime || 0) })
    return TYPES_DOSSIER.map(t => ({
      name: t.label,
      value: Math.round(map[t.value]),
      color: t.color,
    })).filter(d => d.value > 0)
  }, [prospects])

  // Source breakdown
  const sourceData = useMemo(() => {
    const map = {}
    SOURCES.forEach(s => { map[s.value] = 0 })
    prospects
      .filter(p => p.statut !== 'perdu_refuse')
      .forEach(p => { map[p.source] = (map[p.source] || 0) + 1 })
    const colors = ['#c4e913', '#6366f1', '#ec4899', '#f97316']
    return SOURCES.map((s, i) => ({
      name: s.label,
      value: map[s.value],
      color: colors[i % colors.length],
    })).filter(d => d.value > 0)
  }, [prospects])

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
      <h2 className="text-lg font-semibold text-text-primary">Tableau de bord</h2>

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
              <Tooltip
                contentStyle={{
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: 8,
                  color: '#fff',
                }}
              />
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
                  contentStyle={{
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: 8,
                    color: '#fff',
                  }}
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
                <Tooltip
                  contentStyle={{
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                />
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
