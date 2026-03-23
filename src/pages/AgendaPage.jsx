import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, AlertCircle, TrendingDown, BarChart3, RefreshCw } from 'lucide-react'
import { getTypeDossierLabel, getTypeDossierColor, STATUTS, isRelanceOverdue, SEUIL_DORMANT_JOURS, DELAIS_RELANCE_PAR_STATUT } from '../lib/constants'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  // Lundi = 0, Dimanche = 6
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []

  // Jours du mois précédent (padding)
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) })
  }

  // Jours du mois courant
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, currentMonth: true, date: new Date(year, month, d) })
  }

  // Padding fin
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) })
    }
  }

  return days
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0]
}

export default function AgendaPage({ prospects, onSelectProspect }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const days = useMemo(
    () => getMonthDays(currentDate.year, currentDate.month),
    [currentDate.year, currentDate.month]
  )

  // Map relances par date
  const relanceMap = useMemo(() => {
    const map = {}
    prospects.forEach(p => {
      if (!p.date_relance) return
      const key = p.date_relance.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(p)
    })
    return map
  }, [prospects])

  const todayKey = formatDateKey(new Date())

  const navigate = (dir) => {
    setCurrentDate(prev => {
      let m = prev.month + dir
      let y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  const goToday = () => {
    const now = new Date()
    setCurrentDate({ year: now.getFullYear(), month: now.getMonth() })
  }

  // Stats du mois
  const monthStats = useMemo(() => {
    const monthStart = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, '0')}`
    let total = 0
    let overdue = 0
    prospects.forEach(p => {
      if (!p.date_relance) return
      if (p.date_relance.startsWith(monthStart)) total++
      if (isRelanceOverdue(p.date_relance)) overdue++
    })
    return { total, overdue }
  }, [prospects, currentDate])

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Agenda des relances</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
            <span>{monthStats.total} relance{monthStats.total !== 1 ? 's' : ''} ce mois</span>
            {monthStats.overdue > 0 && (
              <span className="text-danger font-medium">{monthStats.overdue} en retard</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1.5 text-xs text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
            Aujourd'hui
          </button>
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-text-primary min-w-[160px] text-center">
            {MOIS[currentDate.month]} {currentDate.year}
          </span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        {/* Days header */}
        <div className="grid grid-cols-7 border-b border-border">
          {JOURS.map(j => (
            <div key={j} className="px-2 py-2 text-center text-xs font-medium text-text-secondary">
              {j}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const key = formatDateKey(d.date)
            const events = relanceMap[key] || []
            const isToday = key === todayKey
            const isPast = !isToday && d.date < new Date(new Date().toDateString())

            return (
              <div
                key={i}
                className={`min-h-[90px] border-b border-r border-border p-1.5 ${
                  !d.currentMonth ? 'bg-bg-main/50' : ''
                } ${isToday ? 'bg-primary/5' : ''}`}
              >
                <div className={`text-xs mb-1 ${
                  isToday ? 'text-primary font-bold' :
                  !d.currentMonth ? 'text-text-secondary/40' : 'text-text-secondary'
                }`}>
                  {d.day}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={() => onSelectProspect(p)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate transition-colors ${
                        isPast
                          ? 'bg-danger/15 text-danger hover:bg-danger/25'
                          : isToday
                            ? 'bg-warning/15 text-warning hover:bg-warning/25'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                      title={`${p.nom} — ${getTypeDossierLabel(p.type_dossier)}`}
                    >
                      {p.nom}
                    </button>
                  ))}
                  {events.length > 3 && (
                    <span className="text-[10px] text-text-secondary px-1.5">
                      +{events.length - 3} autres
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Métriques relances */}
      <RelanceMetrics prospects={prospects} />

      {/* Upcoming relances list */}
      <div className="mt-6 bg-bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-primary mb-3">Prochaines relances</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {prospects
            .filter(p => p.date_relance && new Date(p.date_relance) >= new Date(new Date().toDateString()))
            .sort((a, b) => new Date(a.date_relance) - new Date(b.date_relance))
            .slice(0, 15)
            .map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProspect(p)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-bg-hover transition-colors text-left"
              >
                <Clock size={14} className="text-primary shrink-0" />
                <span className="text-text-primary font-medium truncate flex-1">{p.nom}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: getTypeDossierColor(p.type_dossier) + '25',
                    color: getTypeDossierColor(p.type_dossier),
                  }}
                >
                  {getTypeDossierLabel(p.type_dossier)}
                </span>
                <span className="text-xs text-text-secondary shrink-0">
                  {new Date(p.date_relance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
              </button>
            ))}
          {prospects.filter(p => p.date_relance && new Date(p.date_relance) >= new Date(new Date().toDateString())).length === 0 && (
            <p className="text-text-secondary text-sm text-center py-4">Aucune relance à venir</p>
          )}
        </div>
      </div>
    </div>
  )
}

function RelanceMetrics({ prospects }) {
  const stats = useMemo(() => {
    const now = new Date()
    const activeProspects = prospects.filter(p =>
      !['cloture', 'perdu_refuse', 'facture'].includes(p.statut)
    )

    // En retard
    const overdue = activeProspects.filter(p =>
      p.date_relance && isRelanceOverdue(p.date_relance)
    )

    // Dormants (sans interaction depuis SEUIL_DORMANT_JOURS)
    const seuilDate = new Date(now.getTime() - SEUIL_DORMANT_JOURS * 24 * 60 * 60 * 1000)
    const dormants = activeProspects.filter(p => {
      if (p.statut === 'prescripteur') return false
      const last = p.date_derniere_interaction
        ? new Date(p.date_derniere_interaction)
        : p.date_creation ? new Date(p.date_creation) : null
      return last && last < seuilDate
    })

    // Sans relance planifiée (actifs seulement)
    const sansRelance = activeProspects.filter(p => !p.date_relance && p.statut !== 'prescripteur')

    // Relances effectuées (distribution)
    const totalRelances = activeProspects.reduce((sum, p) => sum + (p.nombre_relances_effectuees || 0), 0)
    const avgRelances = activeProspects.length > 0
      ? (totalRelances / activeProspects.length).toFixed(1)
      : 0

    // Prospects avec beaucoup de relances (>= 5) sans conversion
    const stagnants = activeProspects.filter(p =>
      (p.nombre_relances_effectuees || 0) >= 5 &&
      ['prospect_identifie', 'premier_contact', 'relance_en_attente'].includes(p.statut)
    )

    return { overdue, dormants, sansRelance, totalRelances, avgRelances, stagnants, activeCount: activeProspects.length }
  }, [prospects])

  return (
    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        icon={<AlertCircle size={16} className="text-danger" />}
        label="En retard"
        value={stats.overdue.length}
        color="text-danger"
        sub={`sur ${stats.activeCount} actifs`}
      />
      <MetricCard
        icon={<TrendingDown size={16} className="text-orange-400" />}
        label="Dormants"
        value={stats.dormants.length}
        color="text-orange-400"
        sub={`+${SEUIL_DORMANT_JOURS}j sans contact`}
      />
      <MetricCard
        icon={<RefreshCw size={16} className="text-primary" />}
        label="Moy. relances"
        value={stats.avgRelances}
        color="text-primary"
        sub={`${stats.totalRelances} total`}
      />
      <MetricCard
        icon={<BarChart3 size={16} className="text-warning" />}
        label="Sans relance"
        value={stats.sansRelance.length}
        color="text-warning"
        sub="pas de date planifiée"
      />
      {stats.stagnants.length > 0 && (
        <div className="col-span-2 md:col-span-4 bg-danger/5 border border-danger/20 rounded-lg px-4 py-2.5">
          <p className="text-xs text-danger font-medium">
            ⚠ {stats.stagnants.length} prospect{stats.stagnants.length > 1 ? 's' : ''} avec 5+ relances sans conversion :
            {' '}{stats.stagnants.map(p => p.nom).join(', ')}
          </p>
          <p className="text-[10px] text-danger/70 mt-0.5">
            Envisagez de changer leur statut en « Perdu/Refusé » ou « Suivi long terme »
          </p>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value, color, sub }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  )
}
