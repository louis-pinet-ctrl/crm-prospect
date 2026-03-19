import { useState } from 'react'
import { X, Trash2, Edit3, Calculator, MapPin, BookOpen } from 'lucide-react'
import ProspectForm from './ProspectForm'
import NotesSection from './NotesSection'
import {
  formatCurrency,
  getTypeDossierLabel,
  getTypeDossierColor,
  STATUTS,
  SOURCES,
  PRIORITES,
  isRelanceOverdue,
} from '../lib/constants'

export default function ProspectModal({ prospect, onClose, onUpdate, onDelete, onAdd }) {
  const [editing, setEditing] = useState(!prospect)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isNew = !prospect

  const handleSubmit = async (data) => {
    if (isNew) {
      await onAdd(data)
    } else {
      await onUpdate(prospect.id, data)
      setEditing(false)
    }
  }

  const getLabel = (list, value) =>
    list.find(i => i.value === value)?.label || value

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg bg-bg-card border-l border-border overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-text-primary">
            {isNew ? 'Nouveau prospect' : prospect.nom}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-primary"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-danger"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-sm text-danger mb-3">
                Supprimer ce prospect et toutes ses notes ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onDelete(prospect.id)}
                  className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/80"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-hover"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {editing ? (
            <ProspectForm
              prospect={prospect}
              onSubmit={handleSubmit}
              onCancel={() => (isNew ? onClose() : setEditing(false))}
            />
          ) : (
            <>
              {/* Read-only view */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: getTypeDossierColor(prospect.type_dossier) + '25',
                      color: getTypeDossierColor(prospect.type_dossier),
                    }}
                  >
                    {getTypeDossierLabel(prospect.type_dossier)}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-bg-main text-text-secondary">
                    {getLabel(STATUTS, prospect.statut)}
                  </span>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: PRIORITES.find(p => p.value === prospect.priorite)?.color + '25',
                      color: PRIORITES.find(p => p.value === prospect.priorite)?.color,
                    }}
                  >
                    {getLabel(PRIORITES, prospect.priorite)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {prospect.etablissement && (
                    <div>
                      <span className="text-text-secondary text-xs">Établissement</span>
                      <p className="text-text-primary">{prospect.etablissement}</p>
                    </div>
                  )}
                  {prospect.ville && (
                    <div>
                      <span className="text-text-secondary text-xs">Ville</span>
                      <p className="text-text-primary">{prospect.ville}</p>
                    </div>
                  )}
                  {prospect.telephone && (
                    <div>
                      <span className="text-text-secondary text-xs">Téléphone</span>
                      <p className="text-text-primary">{prospect.telephone}</p>
                    </div>
                  )}
                  {prospect.email && (
                    <div>
                      <span className="text-text-secondary text-xs">Email</span>
                      <p className="text-text-primary">{prospect.email}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-text-secondary text-xs">Source</span>
                    <p className="text-text-primary">
                      {getLabel(SOURCES, prospect.source)}
                      {prospect.source_detail && ` — ${prospect.source_detail}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary text-xs">CA estimé</span>
                    <p className="text-primary font-medium">
                      {formatCurrency(prospect.ca_estime)}
                    </p>
                  </div>
                </div>

                {(prospect.simulateur_valorisation || prospect.diaglocal || prospect.guide_recu) && (
                  <div className="flex flex-wrap gap-2">
                    {prospect.simulateur_valorisation && (
                      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                        <Calculator size={12} />
                        Simulateur
                      </span>
                    )}
                    {prospect.diaglocal && (
                      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                        <MapPin size={12} />
                        DiagLocal
                      </span>
                    )}
                    {prospect.guide_recu && (
                      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                        <BookOpen size={12} />
                        Guide reçu
                      </span>
                    )}
                  </div>
                )}

                {prospect.date_relance && (
                  <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                    isRelanceOverdue(prospect.date_relance)
                      ? 'bg-warning/10 text-warning'
                      : 'bg-bg-main text-text-secondary'
                  }`}>
                    <span>Relance prévue :</span>
                    <span className="font-medium">
                      {new Date(prospect.date_relance).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes section */}
              <div className="border-t border-border pt-4">
                <NotesSection prospectId={prospect.id} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
