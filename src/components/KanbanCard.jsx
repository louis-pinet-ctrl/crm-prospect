import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertCircle, Calculator, MapPin, BookOpen, UserCheck, RefreshCw, Clock, MessageCircle, Mail, Store, FolderOpen } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import { calculateScore } from '../lib/scoring'
import {
  formatCurrency,
  getTypeDossierColor,
  getTypeDossierLabel,
  getTypePrescripteurLabel,
  isRelanceOverdue,
  SUIVI_STATUTS,
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
  const { total: prospectScore } = calculateScore(prospect)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(prospect)}
      className="bg-bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-sm font-medium text-text-primary truncate">
            {prospect.nom}
          </h4>
          <ScoreBadge score={prospectScore} size="xs" />
        </div>
        {overdue && (
          <span className="flex items-center gap-1 shrink-0 mt-0.5">
            <AlertCircle size={16} className="text-warning" />
            {isSuivi && (
              <span className="text-[10px] font-medium text-warning">Relance due</span>
            )}
          </span>
        )}
      </div>

      {prospect.etablissement && (
        <p className="text-xs text-text-secondary truncate mb-1">
          {prospect.etablissement}
        </p>
      )}

      {prospect.ville && (
        <p className="text-xs text-text-secondary mb-2">{prospect.ville}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: getTypeDossierColor(prospect.type_dossier) + '25',
              color: getTypeDossierColor(prospect.type_dossier),
            }}
          >
            {getTypeDossierLabel(prospect.type_dossier)}
          </span>
          {prospect.intention && (() => {
            const intent = INTENTIONS.find(i => i.value === prospect.intention)
            return intent ? (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: intent.color + '20', color: intent.color }}
              >
                {intent.label}
              </span>
            ) : null
          })()}
        </div>
        {prospect.ca_estime > 0 && (
          <span className="text-xs font-medium text-primary shrink-0">
            {formatCurrency(prospect.ca_estime)}
          </span>
        )}
      </div>
      {/* Client récurrent */}
      {prospect.client_parent_id && (
        <div className="flex items-center gap-1 mt-1">
          <FolderOpen size={10} className="text-purple-400" />
          <span className="text-[10px] font-medium text-purple-400">Client récurrent</span>
        </div>
      )}

      {/* Profil resto */}
      {(prospect.type_cuisine || prospect.est_franchise) && (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {prospect.type_cuisine && (
            <span className="text-[10px] text-text-secondary">
              {TYPES_CUISINE.find(t => t.value === prospect.type_cuisine)?.label}
            </span>
          )}
          {prospect.est_franchise && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-400 flex items-center gap-0.5">
              <Store size={9} />
              {prospect.enseigne_franchise || 'Franchise'}
              {prospect.nombre_franchises > 1 && ` ×${prospect.nombre_franchises}`}
            </span>
          )}
          {prospect.nombre_salaries != null && (
            <span className="text-[10px] text-text-secondary">· {prospect.nombre_salaries} sal.</span>
          )}
        </div>
      )}

      {/* Prescripteur badge */}
      {prospect.statut === 'prescripteur' && prospect.type_prescripteur && (
        <div className="flex items-center gap-1.5 mt-2">
          <UserCheck size={12} className="text-amber-400" />
          <span className="text-[10px] font-medium text-amber-400">
            {getTypePrescripteurLabel(prospect.type_prescripteur)}
          </span>
          {prospect.nombre_deals_apportes > 0 && (
            <span className="text-[10px] text-text-secondary ml-auto">
              {prospect.nombre_deals_apportes} deal{prospect.nombre_deals_apportes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Suivi tunnel: dernière interaction + nb relances */}
      {isSuivi && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-text-secondary">
          {prospect.date_derniere_interaction && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {new Date(prospect.date_derniere_interaction).toLocaleDateString('fr-FR')}
            </span>
          )}
          {prospect.nombre_relances_effectuees > 0 && (
            <span className="flex items-center gap-1">
              <RefreshCw size={10} />
              {prospect.nombre_relances_effectuees} relance{prospect.nombre_relances_effectuees > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {(prospect.simulateur_valorisation || prospect.diaglocal || prospect.guide_recu || prospect.telephone || prospect.email) && (
        <div className="flex items-center gap-1.5 mt-2">
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
              >
                <MessageCircle size={12} className="text-green-400 hover:text-green-300" />
              </a>
            )
          })()}
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              onClick={(e) => e.stopPropagation()}
              title="Email"
            >
              <Mail size={12} className="text-blue-400 hover:text-blue-300" />
            </a>
          )}
          {prospect.simulateur_valorisation && (
            <Calculator size={12} className="text-primary" title="Simulateur de valorisation" />
          )}
          {prospect.diaglocal && (
            <MapPin size={12} className="text-primary" title="DiagLocal" />
          )}
          {prospect.guide_recu && (
            <BookOpen size={12} className="text-primary" title="Guide reçu" />
          )}
        </div>
      )}
    </div>
  )
}
