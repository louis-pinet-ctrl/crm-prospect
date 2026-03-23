import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ChevronRight } from 'lucide-react'
import KanbanCard from './KanbanCard'

export default function KanbanColumn({ statut, prospects, onSelectProspect, collapsed, onToggleCollapse }) {
  const { setNodeRef, isOver } = useDroppable({ id: statut.value })

  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 w-10 cursor-pointer group"
        onClick={onToggleCollapse}
        title={`${statut.label} — Cliquer pour déplier`}
      >
        <div className="flex flex-col items-center gap-2 py-3 px-1 rounded-lg bg-bg-main/50 border border-transparent hover:border-border transition-colors min-h-[200px]">
          <span className="text-xs font-medium text-text-secondary bg-bg-main px-1.5 py-0.5 rounded-full">
            {prospects.length}
          </span>
          <ChevronRight size={14} className="text-text-secondary" />
          <span
            className="text-xs font-medium text-text-secondary"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
          >
            {statut.label}
          </span>
        </div>
      </div>
    )
  }

  const useGrid = prospects.length > 8

  return (
    <div className={`flex-shrink-0 ${useGrid ? 'w-[37rem]' : 'w-72'}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3
          className="text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
          title={statut.tooltip + ' — Cliquer pour replier'}
          onClick={onToggleCollapse}
        >
          {statut.label}
        </h3>
        <span className="text-xs text-text-secondary bg-bg-main px-2 py-0.5 rounded-full">
          {prospects.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`
          min-h-[200px] p-2 rounded-lg transition-colors
          ${useGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2'}
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
