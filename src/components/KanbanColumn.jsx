import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'

export default function KanbanColumn({ statut, prospects, onSelectProspect }) {
  const { setNodeRef, isOver } = useDroppable({ id: statut.value })

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-text-secondary cursor-default" title={statut.tooltip}>
          {statut.label}
        </h3>
        <span className="text-xs text-text-secondary bg-bg-main px-2 py-0.5 rounded-full">
          {prospects.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`
          space-y-2 min-h-[200px] p-2 rounded-lg transition-colors
          ${isOver ? 'bg-primary/5 border border-primary/20' : 'bg-bg-main/50 border border-transparent'}
        `}
      >
        <SortableContext
          items={prospects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {prospects.map(prospect => (
            <KanbanCard
              key={prospect.id}
              prospect={prospect}
              onClick={onSelectProspect}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
