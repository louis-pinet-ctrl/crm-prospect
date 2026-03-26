import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertCircle, MessageCircle, Mail, Store, FolderOpen } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import { calculateScore } from '../lib/scoring'
import {
  formatCurrency,
  getTypeDossierColor,
  getTypeDossierLabel,
  getTypePrescripteurLabel,
  isRelanceOverdue,
  SUIVI_STATUTS,
  PRESCRIPTEUR_STATUTS,
  INTENTIONS,
  TYPES_CUISINE,
} from '../lib/constants'

export default function KanbanCard({ prospect, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const overdue = isRelanceOverdue(prospect.date_relance)
  const isSuivi = SUIVI_STATUTS.includes(prospect.statut)
  const isPrescripteur = PRESCRIPTEUR_STATUTS.includes(prospect.statut)
  const { total: prospectScore } = calculateScore(prospect)
  const cuisineLabel = TYPES_CUISINE.find(t => t.value === prospect.type_cuisine)?.label
  const intentionObj = prospect.intention ? INTENTIONS.find(i => i.value === prospect.intention) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(prospect)}
      className="bg-bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
    >
      {/* Ligne 1 : Nom + score + alerte relance */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <h4 className="text-sm font-medium text-text-primary truncate">{prospect.nom}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <ScoreBadge score={prospectScore} size="xs" />
          {overdue && <AlertCircle size={14} className="text-warning" />}
        </div>
      </div>

      {/* Ligne 2 : Établissement + ville en une ligne */}
      {(prospect.etablissement || prospect.ville) && (
        <p className="text-[11px] text-text-secondary truncate mb-1.5">
          {[prospect.etablissement, prospect.ville].filter(Boolean).join(' — ')}
        </p>
      )}

      {/* Ligne 3 : Badges (type dossier + intention) + CA */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1 min-w-0 flex-wrap">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
            style={{
              backgroundColor: getTypeDossierColor(prospect.type_dossier) + '25',
              color: getTypeDossierColor(prospect.type_dossier),
            }}
          >
            {getTypeDossierLabel(prospect.type_dossier)}
          </span>
          {intentionObj && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
              style={{ backgroundColor: intentionObj.color + '20', color: intentionObj.color }}
            >
              {intentionObj.label}
            </span>
          )}
          {isPrescripteur && prospect.type_prescripteur && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none bg-amber-500/20 text-amber-400">
              {getTypePrescripteurLabel(prospect.type_prescripteur)}
            </span>
          )}
          {isPrescripteur && prospect.nombre_deals_apportes > 0 && (
            <span className="text-[10px] font-medium text-success">
              {prospect.nombre_deals_apportes} deal{prospect.nombre_deals_apportes > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {prospect.ca_estime > 0 && (
          <span className="text-xs font-semibold text-primary shrink-0">
            {formatCurrency(prospect.ca_estime)}
          </span>
        )}
      </div>

      {/* Ligne 4 : Profil compact (cuisine · franchise · salariés · client récurrent) */}
      {(cuisineLabel || prospect.est_franchise || prospect.client_parent_id) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {cuisineLabel && (
            <span className="text-[10px] text-text-secondary">{cuisineLabel}</span>
          )}
          {prospect.est_franchise && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-400 inline-flex items-center gap-0.5 leading-none">
              <Store size={8} />
              {prospect.enseigne_franchise || 'Franchise'}
              {prospect.nombre_franchises > 1 && ` ×${prospect.nombre_franchises}`}
            </span>
          )}
          {prospect.nombre_salaries != null && !prospect.est_franchise && (
            <span className="text-[10px] text-text-secondary">· {prospect.nombre_salaries} sal.</span>
          )}
          {prospect.client_parent_id && (
            <span className="text-[10px] font-medium text-purple-400 inline-flex items-center gap-0.5">
              <FolderOpen size={8} />
              Récurrent
            </span>
          )}
        </div>
      )}

      {/* Ligne 5 : Actions rapides (WhatsApp, Email) — toujours en bas */}
      {(prospect.telephone || prospect.email) && (
        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-border/50">
          {prospect.telephone && (() => {
            const digits = prospect.telephone.replace(/[\s./-]/g, '')
            const waNum = digits.startsWith('0') && digits.length === 10
              ? `33${digits.slice(1)}`
              : digits.replace('+', '')
            return (
              <a
                href={`https://wa.me/${waNum}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="WhatsApp"
                className="p-1 rounded hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle size={13} className="text-green-400" />
              </a>
            )
          })()}
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              onClick={(e) => e.stopPropagation()}
              title="Email"
              className="p-1 rounded hover:bg-blue-500/20 transition-colors"
            >
              <Mail size={13} className="text-blue-400" />
            </a>
          )}
          {/* Suivi : dernière interaction */}
          {isSuivi && prospect.date_derniere_interaction && (
            <span className="text-[10px] text-text-secondary ml-auto">
              {new Date(prospect.date_derniere_interaction).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
