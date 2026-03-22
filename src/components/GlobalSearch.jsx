import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, X, User, Building2 } from 'lucide-react'
import { getTypeDossierLabel, getTypeDossierColor, STATUTS } from '../lib/constants'

export default function GlobalSearch({ prospects, onSelectProspect, onClose }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    return prospects
      .filter(p => {
        return (
          p.nom?.toLowerCase().includes(q) ||
          p.etablissement?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.telephone?.replace(/[\s./-]/g, '').includes(q.replace(/[\s./-]/g, '')) ||
          p.ville?.toLowerCase().includes(q)
        )
      })
      .slice(0, 12)
  }, [prospects, query])

  const handleQueryChange = useCallback((val) => {
    setQuery(val)
    setSelectedIndex(0)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        onSelectProspect(results[selectedIndex])
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, onClose, onSelectProspect])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Rechercher un prospect (nom, établissement, email, tél, ville)..."
            className="flex-1 bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-secondary"
          />
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        {query.trim() && (
          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary text-sm">
                Aucun résultat pour "{query}"
              </div>
            ) : (
              results.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProspect(p)
                    onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                    i === selectedIndex ? 'bg-primary/10' : 'hover:bg-bg-hover'
                  }`}
                >
                  <User size={16} className="text-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-medium truncate">{p.nom}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: getTypeDossierColor(p.type_dossier) + '25',
                          color: getTypeDossierColor(p.type_dossier),
                        }}
                      >
                        {getTypeDossierLabel(p.type_dossier)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                      {p.etablissement && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 size={10} />
                          {p.etablissement}
                        </span>
                      )}
                      {p.ville && <span>{p.ville}</span>}
                      <span className="ml-auto shrink-0">
                        {STATUTS.find(s => s.value === p.statut)?.label}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Hint */}
        {!query.trim() && (
          <div className="px-4 py-6 text-center text-text-secondary text-xs">
            Tapez pour rechercher parmi {prospects.length} prospects
            <div className="mt-2 flex items-center justify-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-bg-main border border-border rounded text-[10px]">↑↓</kbd>
              <span>naviguer</span>
              <kbd className="px-1.5 py-0.5 bg-bg-main border border-border rounded text-[10px]">Entrée</kbd>
              <span>ouvrir</span>
              <kbd className="px-1.5 py-0.5 bg-bg-main border border-border rounded text-[10px]">Esc</kbd>
              <span>fermer</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
