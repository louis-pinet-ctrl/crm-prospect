import { useState, useEffect } from 'react'
import { FolderPlus, FolderOpen, ArrowRight } from 'lucide-react'
import { fetchDossiersLies, cloneProspectAsDossier } from '../lib/supabase'
import {
  TYPES_DOSSIER,
  STATUTS,
  formatCurrency,
  getTypeDossierColor,
  getTypeDossierLabel,
} from '../lib/constants'

export default function DossiersLies({ prospect, onSelectProspect, onReload }) {
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState('cession_fonds')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!prospect?.id) return
    setLoading(true)
    fetchDossiersLies(prospect.id)
      .then(setDossiers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [prospect?.id])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const created = await cloneProspectAsDossier(prospect, newType)
      setShowNew(false)
      if (onReload) onReload()
      // Ouvrir le nouveau dossier
      if (onSelectProspect) onSelectProspect(created)
    } catch (err) {
      console.error('Erreur création dossier:', err)
    } finally {
      setCreating(false)
    }
  }

  const isClient = prospect.client_parent_id || dossiers.length > 0
  const caTotal = dossiers.reduce((sum, d) => sum + (d.ca_estime || 0), 0) + (prospect.ca_estime || 0)
  const getStatutLabel = (val) => STATUTS.find(s => s.value === val)?.label || val

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
          <FolderOpen size={14} />
          Dossiers {isClient && `(${dossiers.length + 1})`}
        </h4>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
        >
          <FolderPlus size={14} />
          Nouveau dossier
        </button>
      </div>

      {/* Formulaire nouveau dossier */}
      {showNew && (
        <div className="mb-3 p-3 bg-bg-main border border-border rounded-lg space-y-2">
          <p className="text-xs text-text-secondary">
            Créer un nouveau dossier pour <strong className="text-text-primary">{prospect.nom}</strong>
          </p>
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              {TYPES_DOSSIER.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {creating ? '...' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* CA cumulé */}
      {isClient && caTotal > 0 && (
        <div className="mb-2 text-xs text-text-secondary">
          CA cumulé client : <span className="text-primary font-medium">{formatCurrency(caTotal)}</span>
        </div>
      )}

      {/* Liste des dossiers liés */}
      {loading ? (
        <p className="text-text-secondary text-xs">Chargement...</p>
      ) : dossiers.length === 0 ? (
        <p className="text-text-secondary text-xs">Aucun autre dossier pour ce client.</p>
      ) : (
        <div className="space-y-2">
          {dossiers.map(d => (
            <button
              key={d.id}
              onClick={() => onSelectProspect && onSelectProspect(d)}
              className="w-full flex items-center gap-3 p-2 bg-bg-main border border-border rounded-lg hover:border-primary/30 transition-colors text-left"
            >
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: getTypeDossierColor(d.type_dossier) + '25',
                  color: getTypeDossierColor(d.type_dossier),
                }}
              >
                {getTypeDossierLabel(d.type_dossier)}
              </span>
              <span className="text-xs text-text-secondary flex-1 truncate">
                {getStatutLabel(d.statut)}
              </span>
              {d.ca_estime > 0 && (
                <span className="text-xs font-medium text-primary shrink-0">
                  {formatCurrency(d.ca_estime)}
                </span>
              )}
              <ArrowRight size={12} className="text-text-secondary shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
