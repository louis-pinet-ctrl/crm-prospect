import { useState, useMemo } from 'react'
import {
  Sun, AlertCircle, Clock, TrendingDown, CheckCircle2, Phone, Mail, MessageCircle,
  ChevronRight, Timer, CalendarPlus, ArrowRight,
} from 'lucide-react'
import {
  isRelanceOverdue, SEUIL_DORMANT_JOURS, getTypeDossierLabel, getTypeDossierColor,
  STATUTS, getDateRelanceParStatut,
} from '../lib/constants'
import { updateProspect } from '../lib/supabase'

function snoozeDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function MaJourneePage({ prospects, onSelectProspect, reload }) {
  const [doneIds, setDoneIds] = useState(new Set())

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const data = useMemo(() => {
    const active = prospects.filter(p =>
      !['cloture', 'perdu_refuse', 'facture'].includes(p.statut)
    )

    const overdue = active
      .filter(p => p.date_relance && isRelanceOverdue(p.date_relance) && !p.date_relance.startsWith(today))
      .sort((a, b) => new Date(a.date_relance) - new Date(b.date_relance))

    const todayRelances = active.filter(p =>
      p.date_relance && p.date_relance.startsWith(today)
    )

    const seuilDate = new Date(now.getTime() - SEUIL_DORMANT_JOURS * 24 * 60 * 60 * 1000)
    const dormants = active.filter(p => {
      if (p.statut === 'prescripteur') return false
      if (p.date_relance) return false // a déjà une relance planifiée
      const last = p.date_derniere_interaction
        ? new Date(p.date_derniere_interaction)
        : p.date_creation ? new Date(p.date_creation) : null
      return last && last < seuilDate
    })

    const stagnants = active.filter(p =>
      (p.nombre_relances_effectuees || 0) >= 5 &&
      ['prospect_identifie', 'premier_contact', 'relance_en_attente'].includes(p.statut)
    )

    return { overdue, todayRelances, dormants, stagnants }
  }, [prospects, today])

  const totalTasks = data.overdue.length + data.todayRelances.length + data.dormants.length + data.stagnants.length
  const doneCount = doneIds.size

  const markDone = (id) => setDoneIds(prev => new Set([...prev, id]))

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sun size={24} className="text-warning" />
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Ma journée</h2>
          <p className="text-xs text-text-secondary">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {totalTasks > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-32 bg-bg-main rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">{doneCount}/{totalTasks}</span>
          </div>
        )}
      </div>

      {totalTasks === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
          <p className="text-text-primary font-medium">Rien à faire aujourd'hui !</p>
          <p className="text-text-secondary text-sm mt-1">Tous vos prospects sont à jour.</p>
        </div>
      )}

      {/* Relances en retard */}
      {data.overdue.length > 0 && (
        <Section
          icon={<AlertCircle size={16} className="text-danger" />}
          title={`En retard (${data.overdue.length})`}
          color="danger"
        >
          {data.overdue.map(p => (
            <ActionCard
              key={p.id}
              prospect={p}
              done={doneIds.has(p.id)}
              onDone={() => markDone(p.id)}
              onSelect={() => onSelectProspect(p)}
              onReload={reload}
              badge={new Date(p.date_relance).toLocaleDateString('fr-FR')}
              badgeColor="text-danger"
            />
          ))}
        </Section>
      )}

      {/* Relances aujourd'hui */}
      {data.todayRelances.length > 0 && (
        <Section
          icon={<Clock size={16} className="text-warning" />}
          title={`Aujourd'hui (${data.todayRelances.length})`}
          color="warning"
        >
          {data.todayRelances.map(p => (
            <ActionCard
              key={p.id}
              prospect={p}
              done={doneIds.has(p.id)}
              onDone={() => markDone(p.id)}
              onSelect={() => onSelectProspect(p)}
              onReload={reload}
              badge="Aujourd'hui"
              badgeColor="text-warning"
            />
          ))}
        </Section>
      )}

      {/* Dormants */}
      {data.dormants.length > 0 && (
        <Section
          icon={<TrendingDown size={16} className="text-orange-400" />}
          title={`Dormants à réactiver (${data.dormants.length})`}
          color="orange-400"
        >
          {data.dormants.map(p => {
            const last = p.date_derniere_interaction || p.date_creation
            const days = last ? Math.round((now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)) : '?'
            return (
              <ActionCard
                key={p.id}
                prospect={p}
                done={doneIds.has(p.id)}
                onDone={() => markDone(p.id)}
                onSelect={() => onSelectProspect(p)}
                onReload={reload}
                badge={`${days}j sans contact`}
                badgeColor="text-orange-400"
                showPlanButton
              />
            )
          })}
        </Section>
      )}

      {/* Stagnants */}
      {data.stagnants.length > 0 && (
        <Section
          icon={<AlertCircle size={16} className="text-red-400" />}
          title={`Décision à prendre (${data.stagnants.length})`}
          color="red-400"
        >
          {data.stagnants.map(p => (
            <StagnantCard
              key={p.id}
              prospect={p}
              done={doneIds.has(p.id)}
              onDone={() => markDone(p.id)}
              onSelect={() => onSelectProspect(p)}
              onReload={reload}
            />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ActionCard({ prospect: p, done, onDone, onSelect, onReload, badge, badgeColor, showPlanButton }) {
  const [snoozing, setSnoozing] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)

  const handleSnooze = async (days) => {
    setSnoozing(true)
    try {
      await updateProspect(p.id, { date_relance: snoozeDate(days) })
      onDone()
      if (onReload) onReload()
    } catch { /* */ } finally {
      setSnoozing(false)
      setShowSnooze(false)
    }
  }

  const handlePlanRelance = async () => {
    setSnoozing(true)
    try {
      const dateRelance = getDateRelanceParStatut(p.statut) || snoozeDate(3)
      await updateProspect(p.id, { date_relance: dateRelance })
      onDone()
      if (onReload) onReload()
    } catch { /* */ } finally {
      setSnoozing(false)
    }
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
      done
        ? 'bg-success/5 border-success/20 opacity-60'
        : 'bg-bg-card border-border hover:border-primary/30'
    }`}>
      {/* Check */}
      <button
        onClick={onDone}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'border-success bg-success' : 'border-border hover:border-primary'
        }`}
      >
        {done && <CheckCircle2 size={12} className="text-white" />}
      </button>

      {/* Info */}
      <button onClick={onSelect} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${done ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
            {p.nom}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: getTypeDossierColor(p.type_dossier) + '20',
              color: getTypeDossierColor(p.type_dossier),
            }}
          >
            {getTypeDossierLabel(p.type_dossier)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-text-secondary">
            {STATUTS.find(s => s.value === p.statut)?.label}
          </span>
          {badge && <span className={`text-[11px] ${badgeColor}`}>{badge}</span>}
          {p.nombre_relances_effectuees > 0 && (
            <span className="text-[10px] text-text-secondary/60">{p.nombre_relances_effectuees} relances</span>
          )}
        </div>
      </button>

      {/* Actions */}
      {!done && (
        <div className="flex items-center gap-1 shrink-0">
          {showPlanButton && (
            <button
              onClick={handlePlanRelance}
              disabled={snoozing}
              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
              title="Planifier relance"
            >
              <CalendarPlus size={14} className="text-primary" />
            </button>
          )}

          {/* Snooze */}
          <div className="relative">
            <button
              onClick={() => setShowSnooze(!showSnooze)}
              className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
              title="Reporter"
            >
              <Timer size={14} className="text-text-secondary" />
            </button>
            {showSnooze && (
              <div className="absolute right-0 top-full mt-1 z-20 flex gap-1 bg-bg-card border border-border rounded-lg shadow-lg p-1.5">
                {[{ l: '+1j', d: 1 }, { l: '+3j', d: 3 }, { l: '+1sem', d: 7 }].map(o => (
                  <button
                    key={o.d}
                    onClick={() => handleSnooze(o.d)}
                    disabled={snoozing}
                    className="px-2 py-1 text-[11px] rounded bg-bg-main hover:bg-primary/20 hover:text-primary text-text-secondary transition-colors whitespace-nowrap"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ouvrir fiche */}
          <button
            onClick={onSelect}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            title="Ouvrir la fiche"
          >
            <ChevronRight size={14} className="text-text-secondary" />
          </button>
        </div>
      )}
    </div>
  )
}

function StagnantCard({ prospect: p, done, onDone, onSelect, onReload }) {
  const handleChangeStatut = async (newStatut) => {
    try {
      await updateProspect(p.id, { statut: newStatut })
      onDone()
      if (onReload) onReload()
    } catch { /* */ }
  }

  return (
    <div className={`px-4 py-3 rounded-lg border transition-all ${
      done
        ? 'bg-success/5 border-success/20 opacity-60'
        : 'bg-bg-card border-border'
    }`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onDone}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            done ? 'border-success bg-success' : 'border-border hover:border-primary'
          }`}
        >
          {done && <CheckCircle2 size={12} className="text-white" />}
        </button>
        <button onClick={onSelect} className="flex-1 min-w-0 text-left">
          <span className={`text-sm font-medium ${done ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
            {p.nom}
          </span>
          <span className="text-[11px] text-red-400 ml-2">
            {p.nombre_relances_effectuees} relances sans conversion
          </span>
        </button>
      </div>
      {!done && (
        <div className="flex items-center gap-2 mt-2 ml-8">
          <button
            onClick={() => handleChangeStatut('suivi_long_terme')}
            className="text-[11px] px-2.5 py-1 rounded border border-border hover:border-primary hover:text-primary text-text-secondary transition-colors"
          >
            <ArrowRight size={10} className="inline mr-1" />
            Suivi long terme
          </button>
          <button
            onClick={() => handleChangeStatut('perdu_refuse')}
            className="text-[11px] px-2.5 py-1 rounded border border-border hover:border-danger hover:text-danger text-text-secondary transition-colors"
          >
            <ArrowRight size={10} className="inline mr-1" />
            Perdu / Refusé
          </button>
        </div>
      )}
    </div>
  )
}
