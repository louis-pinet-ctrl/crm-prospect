import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertCircle } from 'lucide-react'
import {
  formatCurrency,
  getTypeDossierColor,
  getTypeDossierLabel,
  isRelanceOverdue,
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
        <h4 className="text-sm font-medium text-text-primary truncate">
          {prospect.nom}
        </h4>
        {overdue && (
          <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
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
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: getTypeDossierColor(prospect.type_dossier) + '25',
            color: getTypeDossierColor(prospect.type_dossier),
          }}
        >
          {getTypeDossierLabel(prospect.type_dossier)}
        </span>
        {prospect.ca_estime > 0 && (
          <span className="text-xs font-medium text-primary">
            {formatCurrency(prospect.ca_estime)}
          </span>
        )}
      </div>
    </div>
  )
}
