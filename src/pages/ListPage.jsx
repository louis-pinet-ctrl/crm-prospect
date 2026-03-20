import { useState, useMemo } from 'react'
import { Plus, Search, ArrowUpDown, AlertCircle } from 'lucide-react'
import RelancesWidget from '../components/RelancesWidget'
import {
  STATUTS,
  TYPES_DOSSIER,
  SOURCES,
  PRIORITES,
  formatCurrency,
  getTypeDossierLabel,
  getTypeDossierColor,
  isRelanceOverdue,
} from '../lib/constants'

export default function ListPage({
  prospects,
  loading,
  onSelectProspect,
  onAddProspect,
}) {
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortField, setSortField] = useState('date_creation')
  const [sortDir, setSortDir] = useState('desc')

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...prospects]

    const q = search.toLowerCase()
    if (q) {
      result = result.filter(
        p =>
          p.nom?.toLowerCase().includes(q) ||
          p.etablissement?.toLowerCase().includes(q) ||
          p.ville?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
      )
    }
    if (filterStatut) result = result.filter(p => p.statut === filterStatut)
    if (filterType) result = result.filter(p => p.type_dossier === filterType)

    result.sort((a, b) => {
      let va = a[sortField]
      let vb = b[sortField]
      if (typeof va === 'string') va = va?.toLowerCase() || ''
      if (typeof vb === 'string') vb = vb?.toLowerCase() || ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [prospects, search, filterStatut, filterType, sortField, sortDir])

  const getLabel = (list, value) =>
    list.find(i => i.value === value)?.label || value

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Chargement...</p>
      </div>
    )
  }

  const SortHeader = ({ field, children }) => (
    <th
      className="text-left text-xs font-medium text-text-secondary px-4 py-3 cursor-pointer hover:text-text-primary select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ArrowUpDown size={12} className="text-primary" />
        )}
      </span>
    </th>
  )

  return (
    <div className="p-6 space-y-4">
      {/* Relances widget */}
      <RelancesWidget prospects={prospects} onSelectProspect={onSelectProspect} />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-text-primary mr-auto">
          Liste des prospects
        </h2>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bg-main border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-48"
          />
        </div>

        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Tous les types</option>
          {TYPES_DOSSIER.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={onAddProspect}
          className="flex items-center gap-2 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Prospect</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="border-b border-border">
            <tr>
              <SortHeader field="nom">Nom</SortHeader>
              <SortHeader field="etablissement">Établissement</SortHeader>
              <SortHeader field="ville">Ville</SortHeader>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Statut</th>
              <SortHeader field="ca_estime">CA estimé</SortHeader>
              <SortHeader field="date_relance">Relance</SortHeader>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Priorité</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-text-secondary text-sm">
                  Aucun prospect trouvé
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const overdue = isRelanceOverdue(p.date_relance)
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProspect(p)}
                    className="border-b border-border/50 hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {p.nom}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {p.etablissement || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {p.ville || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: getTypeDossierColor(p.type_dossier) + '25',
                          color: getTypeDossierColor(p.type_dossier),
                        }}
                      >
                        {getTypeDossierLabel(p.type_dossier)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {getLabel(STATUTS, p.statut)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {formatCurrency(p.ca_estime)}
                    </td>
                    <td className="px-4 py-3">
                      {p.date_relance ? (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-warning' : 'text-text-secondary'}`}>
                          {overdue && <AlertCircle size={12} />}
                          {new Date(p.date_relance).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs"
                        style={{
                          color: PRIORITES.find(pr => pr.value === p.priorite)?.color,
                        }}
                      >
                        {getLabel(PRIORITES, p.priorite)}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-secondary">
        {filtered.length} prospect{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
