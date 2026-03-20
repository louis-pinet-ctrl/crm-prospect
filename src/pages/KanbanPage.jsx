import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { Plus, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import KanbanColumn from '../components/KanbanColumn'
import KanbanCard from '../components/KanbanCard'
import { STATUTS, TUNNELS, TYPES_DOSSIER, SOURCES, PRIORITES } from '../lib/constants'

export default function KanbanPage({
  prospects,
  loading,
  update,
  onSelectProspect,
  onAddProspect,
}) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterPriorite, setFilterPriorite] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [collapsedTunnels, setCollapsedTunnels] = useState({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      const q = search.toLowerCase()
      if (q && !p.nom?.toLowerCase().includes(q) &&
          !p.etablissement?.toLowerCase().includes(q) &&
          !p.ville?.toLowerCase().includes(q)) {
        return false
      }
      if (filterType && p.type_dossier !== filterType) return false
      if (filterSource && p.source !== filterSource) return false
      if (filterPriorite && p.priorite !== filterPriorite) return false
      return true
    })
  }, [prospects, search, filterType, filterSource, filterPriorite])

  const columnMap = useMemo(() => {
    const map = {}
    STATUTS.forEach(s => { map[s.value] = [] })
    filtered.forEach(p => {
      if (map[p.statut]) map[p.statut].push(p)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => a.position_kanban - b.position_kanban))
    return map
  }, [filtered])

  const activeProspect = activeId
    ? prospects.find(p => p.id === activeId)
    : null

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const prospectId = active.id
    const prospect = prospects.find(p => p.id === prospectId)
    if (!prospect) return

    let targetStatut = null
    if (STATUTS.find(s => s.value === over.id)) {
      targetStatut = over.id
    } else {
      const targetProspect = prospects.find(p => p.id === over.id)
      if (targetProspect) targetStatut = targetProspect.statut
    }

    if (!targetStatut) return
    if (prospect.statut === targetStatut) return

    try {
      await update(prospectId, { statut: targetStatut })
    } catch (err) {
      console.error('Erreur lors du déplacement:', err)
    }
  }

  const toggleTunnel = (tunnelId) => {
    setCollapsedTunnels(prev => ({ ...prev, [tunnelId]: !prev[tunnelId] }))
  }

  const getTunnelCount = (tunnel) => {
    return tunnel.statuts.reduce((sum, s) => sum + (columnMap[s]?.length || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Chargement du pipeline...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-text-primary mr-auto">Pipeline</h2>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bg-main border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-48"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg border transition-colors ${
            showFilters || filterType || filterSource || filterPriorite
              ? 'border-primary text-primary'
              : 'border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          <Filter size={18} />
        </button>

        <button
          onClick={onAddProspect}
          className="flex items-center gap-2 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Prospect</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-border flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-bg-main border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">Tous les types</option>
            {TYPES_DOSSIER.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-bg-main border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">Toutes les sources</option>
            {SOURCES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filterPriorite}
            onChange={(e) => setFilterPriorite(e.target.value)}
            className="bg-bg-main border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">Toutes les priorités</option>
            {PRIORITES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {(filterType || filterSource || filterPriorite) && (
            <button
              onClick={() => { setFilterType(''); setFilterSource(''); setFilterPriorite('') }}
              className="text-sm text-danger hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Kanban board - 3 tunnels */}
      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-1">
            {TUNNELS.map(tunnel => {
              const isCollapsed = collapsedTunnels[tunnel.id]
              const count = getTunnelCount(tunnel)
              const tunnelStatuts = STATUTS.filter(s => tunnel.statuts.includes(s.value))

              return (
                <div key={tunnel.id}>
                  {/* Tunnel header */}
                  <button
                    onClick={() => toggleTunnel(tunnel.id)}
                    className="w-full flex items-center gap-3 px-6 py-3 hover:bg-bg-main/50 transition-colors border-b border-border"
                  >
                    <div
                      className="w-1 h-6 rounded-full"
                      style={{ backgroundColor: tunnel.color }}
                    />
                    {isCollapsed
                      ? <ChevronRight size={16} className="text-text-secondary" />
                      : <ChevronDown size={16} className="text-text-secondary" />
                    }
                    <h3 className="text-sm font-semibold text-text-primary">
                      {tunnel.label}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      {tunnel.description}
                    </span>
                    <span
                      className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: tunnel.color + '20',
                        color: tunnel.color,
                      }}
                    >
                      {count} prospect{count !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Tunnel columns */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto px-6 py-4">
                      <div className="flex gap-4 min-w-max">
                        {tunnelStatuts.map(statut => (
                          <KanbanColumn
                            key={statut.value}
                            statut={statut}
                            prospects={columnMap[statut.value] || []}
                            onSelectProspect={onSelectProspect}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeProspect ? (
              <div className="w-72">
                <KanbanCard prospect={activeProspect} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
