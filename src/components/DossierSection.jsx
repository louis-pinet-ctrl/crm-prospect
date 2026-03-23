import { useState, useEffect } from 'react'
import { Plus, Check, ChevronDown, ChevronRight, Trash2, Clock, RotateCcw, ListChecks, Loader2 } from 'lucide-react'
import {
  fetchDossierEtapes,
  fetchDossierTaches,
  createDossierEtapes,
  updateDossierEtape,
  createDossierTache,
  updateDossierTache,
  deleteDossierTache,
} from '../lib/supabase'
import { DOSSIER_TEMPLATES, STATUTS_ETAPE } from '../lib/constants'

export default function DossierSection({ prospectId, typeDossier }) {
  const [etapes, setEtapes] = useState([])
  const [taches, setTaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [openEtape, setOpenEtape] = useState(null)
  const [newTache, setNewTache] = useState({})
  const [initializing, setInitializing] = useState(false)

  const template = DOSSIER_TEMPLATES[typeDossier] || DOSSIER_TEMPLATES.autre

  const loadData = async () => {
    try {
      const [e, t] = await Promise.all([
        fetchDossierEtapes(prospectId),
        fetchDossierTaches(prospectId),
      ])
      setEtapes(e || [])
      setTaches(t || [])
      // Auto-open first non-completed step
      if (e?.length) {
        const first = e.find(et => et.statut !== 'termine') || e[0]
        setOpenEtape(prev => prev || first.id)
      }
    } catch (err) {
      console.error('Erreur chargement dossier:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (prospectId) loadData()
  }, [prospectId])

  const handleInitDossier = async () => {
    setInitializing(true)
    try {
      const rows = template.etapes.map((e, i) => ({
        prospect_id: prospectId,
        nom: e.nom,
        description: e.description,
        ordre: i,
        statut: 'a_faire',
      }))
      const created = await createDossierEtapes(rows)
      setEtapes(created)
      if (created.length) setOpenEtape(created[0].id)
    } catch (err) {
      console.error('Erreur init dossier:', err)
    } finally {
      setInitializing(false)
    }
  }

  const handleEtapeStatut = async (etapeId, newStatut) => {
    try {
      const updates = { statut: newStatut }
      if (newStatut === 'en_cours' && !etapes.find(e => e.id === etapeId)?.date_debut) {
        updates.date_debut = new Date().toISOString().split('T')[0]
      }
      if (newStatut === 'termine') {
        updates.date_fin = new Date().toISOString().split('T')[0]
      }
      if (newStatut === 'a_faire') {
        updates.date_fin = null
      }
      await updateDossierEtape(etapeId, updates)
      setEtapes(prev => prev.map(e => e.id === etapeId ? { ...e, ...updates } : e))
    } catch (err) {
      console.error('Erreur update étape:', err)
    }
  }

  const handleAddTache = async (etapeId) => {
    const titre = newTache[etapeId]?.trim()
    if (!titre) return
    try {
      const created = await createDossierTache({
        etape_id: etapeId,
        prospect_id: prospectId,
        titre,
      })
      setTaches(prev => [...prev, created])
      setNewTache(prev => ({ ...prev, [etapeId]: '' }))
    } catch (err) {
      console.error('Erreur ajout tâche:', err)
    }
  }

  const handleToggleTache = async (tacheId, fait) => {
    try {
      await updateDossierTache(tacheId, { fait: !fait })
      setTaches(prev => prev.map(t => t.id === tacheId ? { ...t, fait: !fait } : t))
    } catch (err) {
      console.error('Erreur toggle tâche:', err)
    }
  }

  const handleDeleteTache = async (tacheId) => {
    try {
      await deleteDossierTache(tacheId)
      setTaches(prev => prev.filter(t => t.id !== tacheId))
    } catch (err) {
      console.error('Erreur suppression tâche:', err)
    }
  }

  const getTachesForEtape = (etapeId) =>
    taches.filter(t => t.etape_id === etapeId)

  // Progress
  const totalEtapes = etapes.length
  const doneEtapes = etapes.filter(e => e.statut === 'termine').length
  const totalTaches = taches.length
  const doneTaches = taches.filter(t => t.fait).length

  if (loading) {
    return (
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 size={14} className="animate-spin" />
          Chargement du dossier...
        </div>
      </div>
    )
  }

  // No etapes yet — show init button
  if (etapes.length === 0) {
    return (
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <ListChecks size={16} className="text-primary" />
          Suivi du dossier
        </h3>
        <div className="p-4 bg-bg-main rounded-lg text-center">
          <p className="text-sm text-text-secondary mb-3">
            Initialisez le suivi pour ce dossier ({template.etapes.length} étapes prédéfinies pour une {template.label?.toLowerCase() || 'procédure'})
          </p>
          <button
            onClick={handleInitDossier}
            disabled={initializing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-bg-main rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {initializing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Démarrer le suivi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <ListChecks size={16} className="text-primary" />
        Suivi du dossier
      </h3>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1.5">
          <span>{doneEtapes}/{totalEtapes} étapes</span>
          {totalTaches > 0 && <span>{doneTaches}/{totalTaches} tâches</span>}
        </div>
        <div className="h-1.5 bg-bg-main rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: totalEtapes > 0 ? `${(doneEtapes / totalEtapes) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Étapes */}
      <div className="space-y-1">
        {etapes.map((etape) => {
          const isOpen = openEtape === etape.id
          const etapeTaches = getTachesForEtape(etape.id)
          const doneTachesEtape = etapeTaches.filter(t => t.fait).length
          const statutInfo = STATUTS_ETAPE.find(s => s.value === etape.statut)

          return (
            <div key={etape.id} className="rounded-lg border border-border overflow-hidden">
              {/* Étape header */}
              <button
                onClick={() => setOpenEtape(isOpen ? null : etape.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left"
              >
                {isOpen ? <ChevronDown size={14} className="text-text-secondary shrink-0" /> : <ChevronRight size={14} className="text-text-secondary shrink-0" />}

                {/* Status indicator */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
                  style={{
                    borderColor: statutInfo?.color,
                    backgroundColor: etape.statut === 'termine' ? statutInfo?.color : 'transparent',
                  }}
                />

                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${etape.statut === 'termine' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                    {etape.nom}
                  </span>
                  {etapeTaches.length > 0 && (
                    <span className="text-[10px] text-text-secondary ml-2">
                      {doneTachesEtape}/{etapeTaches.length}
                    </span>
                  )}
                </div>

                {/* Status cycling button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    const cycle = ['a_faire', 'en_cours', 'termine']
                    const idx = cycle.indexOf(etape.statut)
                    handleEtapeStatut(etape.id, cycle[(idx + 1) % cycle.length])
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  style={{
                    backgroundColor: statutInfo?.color + '20',
                    color: statutInfo?.color,
                  }}
                >
                  {statutInfo?.label}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-3 pb-3 border-t border-border/50">
                  {etape.description && (
                    <p className="text-[11px] text-text-secondary mt-2 mb-2">{etape.description}</p>
                  )}

                  {/* Dates */}
                  {(etape.date_debut || etape.date_fin) && (
                    <div className="flex gap-3 text-[10px] text-text-secondary mb-2">
                      {etape.date_debut && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> Début : {new Date(etape.date_debut).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {etape.date_fin && (
                        <span className="flex items-center gap-1">
                          <Check size={10} /> Fin : {new Date(etape.date_fin).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tâches */}
                  <div className="space-y-1 mt-2">
                    {etapeTaches.map((tache) => (
                      <div
                        key={tache.id}
                        className="flex items-center gap-2 group py-1"
                      >
                        <button
                          onClick={() => handleToggleTache(tache.id, tache.fait)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            tache.fait
                              ? 'bg-primary border-primary'
                              : 'border-border hover:border-primary'
                          }`}
                        >
                          {tache.fait && <Check size={10} className="text-bg-main" />}
                        </button>
                        <span className={`text-sm flex-1 ${tache.fait ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                          {tache.titre}
                        </span>
                        {tache.echeance && (
                          <span className={`text-[10px] shrink-0 ${
                            !tache.fait && new Date(tache.echeance) < new Date()
                              ? 'text-danger'
                              : 'text-text-secondary'
                          }`}>
                            {new Date(tache.echeance).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteTache(tache.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-danger/20 transition-all shrink-0"
                        >
                          <Trash2 size={12} className="text-danger" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add tâche */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newTache[etape.id] || ''}
                      onChange={(e) => setNewTache(prev => ({ ...prev, [etape.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTache(etape.id)
                      }}
                      placeholder="Nouvelle tâche..."
                      className="flex-1 text-sm px-2.5 py-1.5 bg-bg-main border border-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleAddTache(etape.id)}
                      disabled={!newTache[etape.id]?.trim()}
                      className="px-2.5 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
