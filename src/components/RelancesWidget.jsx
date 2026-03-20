import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react'
import { isRelanceOverdue } from '../lib/constants'

export default function RelancesWidget({ prospects, onSelectProspect }) {
  const [expanded, setExpanded] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const relancesToday = prospects.filter(p =>
    p.date_relance && p.date_relance.startsWith(today)
  )

  const relancesOverdue = prospects.filter(p =>
    p.date_relance && isRelanceOverdue(p.date_relance) && !p.date_relance.startsWith(today)
  )

  const total = relancesToday.length + relancesOverdue.length
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
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-text-secondary shrink-0" />
          : <ChevronDown size={16} className="text-text-secondary shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-border max-h-48 overflow-y-auto">
          {relancesOverdue.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProspect(p)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-bg-hover transition-colors text-left"
            >
              <AlertCircle size={12} className="text-danger shrink-0" />
              <span className="text-text-primary truncate flex-1">{p.nom}</span>
              <span className="text-danger text-xs shrink-0">
                {new Date(p.date_relance).toLocaleDateString('fr-FR')}
              </span>
            </button>
          ))}
          {relancesToday.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProspect(p)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-bg-hover transition-colors text-left"
            >
              <Clock size={12} className="text-warning shrink-0" />
              <span className="text-text-primary truncate flex-1">{p.nom}</span>
              <span className="text-warning text-xs shrink-0">Aujourd'hui</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
