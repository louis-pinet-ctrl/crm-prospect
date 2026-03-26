import { useState, useMemo } from 'react'
import { Bell, ChevronDown, ChevronUp, AlertCircle, Clock, TrendingDown, CalendarPlus, Timer } from 'lucide-react'
import { isRelanceOverdue, SEUIL_DORMANT_JOURS, getDateRelanceParStatut } from '../lib/constants'
import { updateProspect } from '../lib/supabase'

const SNOOZE_OPTIONS = [
  { label: '+1j', days: 1 },
  { label: '+3j', days: 3 },
  { label: '+1sem', days: 7 },
]

function snoozeDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function RelancesWidget({ prospects, onSelectProspect, onReload }) {
  const [expanded, setExpanded] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const relancesToday = prospects.filter(p =>
    p.date_relance && p.date_relance.startsWith(today)
  )

  const relancesOverdue = prospects.filter(p =>
    p.date_relance && isRelanceOverdue(p.date_relance) && !p.date_relance.startsWith(today)
  )

  const now = new Date()
  const dormants = useMemo(() => {
    const seuil = new Date(now.getTime() - SEUIL_DORMANT_JOURS * 24 * 60 * 60 * 1000)
    return prospects.filter(p => {
      if (['cloture', 'perdu_refuse', 'facture', 'prescripteur', 'prescripteur_a_activer'].includes(p.statut)) return false
      const last = p.date_derniere_interaction
        ? new Date(p.date_derniere_interaction)
        : p.date_creation ? new Date(p.date_creation) : null
      return last && last < seuil
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects])

  const total = relancesToday.length + relancesOverdue.length + dormants.length
  if (total === 0) return null

  return (
    <div className="mx-6 mt-4 bg-bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
      >
        <Bell size={16} className="text-warning shrink-0" />
        <div className="flex items-center gap-3 text-sm flex-1 min-w-0">
          {relancesOverdue.length > 0 && (
            <span className="flex items-center gap-1 text-danger font-medium">
              <AlertCircle size={14} />
              {relancesOverdue.length} en retard
            </span>
          )}
          {relancesToday.length > 0 && (
            <span className="flex items-center gap-1 text-warning font-medium">
              <Clock size={14} />
              {relancesToday.length} aujourd'hui
            </span>
          )}
          {dormants.length > 0 && (
            <span className="flex items-center gap-1 text-orange-400 font-medium">
              <TrendingDown size={14} />
              {dormants.length} dormant{dormants.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-text-secondary shrink-0" />
          : <ChevronDown size={16} className="text-text-secondary shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-border max-h-64 overflow-y-auto">
          {relancesOverdue.map(p => (
            <RelanceItem
              key={p.id}
              prospect={p}
              type="overdue"
              onSelectProspect={onSelectProspect}
              onReload={onReload}
            />
          ))}
          {relancesToday.map(p => (
            <RelanceItem
              key={p.id}
              prospect={p}
              type="today"
              onSelectProspect={onSelectProspect}
              onReload={onReload}
            />
          ))}
          {dormants.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-bg-main text-xs text-orange-400 font-medium flex items-center gap-1.5">
                <TrendingDown size={12} />
                Dormants (+{SEUIL_DORMANT_JOURS}j sans interaction)
              </div>
              {dormants.slice(0, 5).map(p => (
                <DormantItem key={p.id} prospect={p} now={now} onSelectProspect={onSelectProspect} onReload={onReload} />
              ))}
              {dormants.length > 5 && (
                <div className="px-4 py-1.5 text-xs text-text-secondary text-center">
                  +{dormants.length - 5} autres
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RelanceItem({ prospect: p, type, onSelectProspect, onReload }) {
  const [showSnooze, setShowSnooze] = useState(false)
  const [snoozing, setSnoozing] = useState(false)

  const isOverdue = type === 'overdue'
  const colorClass = isOverdue ? 'text-danger' : 'text-warning'
  const Icon = isOverdue ? AlertCircle : Clock

  const handleSnooze = async (days, e) => {
    e.stopPropagation()
    setSnoozing(true)
    try {
      await updateProspect(p.id, { date_relance: snoozeDate(days) })
      if (onReload) onReload()
    } catch {
      // silently fail
    } finally {
      setSnoozing(false)
      setShowSnooze(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-hover transition-colors group">
      <button
        onClick={() => onSelectProspect(p)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <Icon size={12} className={`${colorClass} shrink-0`} />
        <span className="text-text-primary truncate flex-1">{p.nom}</span>
        <span className={`${colorClass} text-xs shrink-0`}>
          {isOverdue ? new Date(p.date_relance).toLocaleDateString('fr-FR') : "Aujourd'hui"}
        </span>
      </button>

      {/* Snooze toggle */}
      <div className="relative shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setShowSnooze(!showSnooze) }}
          className="p-1 rounded hover:bg-bg-main transition-colors opacity-0 group-hover:opacity-100"
          title="Reporter"
        >
          <Timer size={13} className="text-text-secondary hover:text-primary" />
        </button>

        {showSnooze && (
          <div className="absolute right-0 top-full mt-1 z-20 flex gap-1 bg-bg-card border border-border rounded-lg shadow-lg p-1.5">
            {SNOOZE_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={(e) => handleSnooze(opt.days, e)}
                disabled={snoozing}
                className="px-2 py-1 text-[11px] rounded bg-bg-main hover:bg-primary/20 hover:text-primary text-text-secondary transition-colors whitespace-nowrap"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DormantItem({ prospect: p, now, onSelectProspect, onReload }) {
  const [planning, setPlanning] = useState(false)
  const last = p.date_derniere_interaction || p.date_creation
  const days = last ? Math.round((now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)) : '?'

  const handlePlanRelance = async (e) => {
    e.stopPropagation()
    setPlanning(true)
    try {
      const dateRelance = getDateRelanceParStatut(p.statut) || (() => {
        const d = new Date()
        d.setDate(d.getDate() + 3)
        return d.toISOString().split('T')[0]
      })()
      await updateProspect(p.id, { date_relance: dateRelance })
      if (onReload) onReload()
    } catch {
      // silently fail
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-hover transition-colors group">
      <button
        onClick={() => onSelectProspect(p)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <TrendingDown size={12} className="text-orange-400 shrink-0" />
        <span className="text-text-primary truncate flex-1">{p.nom}</span>
        <span className="text-orange-400 text-xs shrink-0">{days}j</span>
      </button>
      <button
        onClick={handlePlanRelance}
        disabled={planning}
        className="p-1 rounded hover:bg-orange-500/20 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Planifier relance auto"
      >
        <CalendarPlus size={13} className={planning ? 'text-text-secondary animate-pulse' : 'text-orange-400'} />
      </button>
    </div>
  )
}
