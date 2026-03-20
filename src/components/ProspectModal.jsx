import { useState, useEffect } from 'react'
import { X, Trash2, Edit3, Calculator, MapPin, BookOpen, Users, Building2, ChefHat, Briefcase, UserCheck, RefreshCw, Clock, MessageCircle, Mail, Phone } from 'lucide-react'
import ProspectForm from './ProspectForm'
import NotesSection from './NotesSection'
import ProspectSummary from './ProspectSummary'
import { ScoreBreakdown } from './ScoreBadge'
import { createNote, fetchNotes, updateProspectAfterInteraction } from '../lib/supabase'
import { calculateScore } from '../lib/scoring'
import {
  formatCurrency,
  getTypeDossierLabel,
  getTypeDossierColor,
  getTypePrescripteurLabel,
  STATUTS,
  SOURCES,
  PRIORITES,
  PROFILS_RESTAURATEUR,
  TYPES_CUISINE,
  SUIVI_STATUTS,
  INTENTIONS,
  isRelanceOverdue,
} from '../lib/constants'

function formatWhatsAppUrl(phone) {
  if (!phone) return null
  // Nettoyer : garder que les chiffres
  const digits = phone.replace(/[\s./-]/g, '')
  // Convertir format FR 06/07 → 336/337
  if (digits.startsWith('0') && digits.length === 10) {
    return `https://wa.me/33${digits.slice(1)}`
  }
  // Déjà en +33
  if (digits.startsWith('+33') || digits.startsWith('33')) {
    return `https://wa.me/${digits.replace('+', '')}`
  }
  return `https://wa.me/${digits}`
}

export default function ProspectModal({ prospect, onClose, onUpdate, onDelete, onAdd, onReload }) {
  const [editing, setEditing] = useState(!prospect)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [scoreResult, setScoreResult] = useState(null)

  // Calculer le score quand on ouvre la fiche
  useEffect(() => {
    if (!prospect?.id) return
    fetchNotes(prospect.id).then(notes => {
      setScoreResult(calculateScore(prospect, notes))
    }).catch(() => {})
  }, [prospect])

  const isNew = !prospect

  // Action rapide : crée une note d'interaction + ouvre le lien
  const handleQuickAction = async (type, url, openInNewTab = false) => {
    if (!prospect?.id) return

    const labels = { appel: 'Appel sortant', email: 'Email envoyé', whatsapp: 'Message WhatsApp envoyé' }
    try {
      await createNote({
        prospect_id: prospect.id,
        contenu: labels[type] || type,
        type_note: type,
        date_interaction: new Date().toISOString(),
      })
      await updateProspectAfterInteraction(prospect.id, type, new Date().toISOString())
      if (onReload) onReload()
    } catch (err) {
      console.error('Erreur création interaction rapide:', err)
    }

    // Ouvrir le lien
    if (url) {
      if (openInNewTab) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = url
      }
    }
  }

  const handleSubmit = async (data, pendingNote) => {
    if (isNew) {
      const created = await onAdd(data)
      // Créer la note simulateur automatiquement après création du prospect
      if (pendingNote && created?.id) {
        try {
          await createNote({
            prospect_id: created.id,
            contenu: pendingNote,
            type_note: 'note_libre',
          })
        } catch (err) {
          console.error('Erreur création note simulateur:', err)
        }
      }
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
              {/* AI-like summary */}
              <ProspectSummary prospect={prospect} />

              {/* Score */}
              <ScoreBreakdown result={scoreResult} />

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
                  {prospect.intention && (() => {
                    const intent = INTENTIONS.find(i => i.value === prospect.intention)
                    return intent ? (
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: intent.color + '20', color: intent.color }}
                      >
                        {intent.label}
                      </span>
                    ) : null
                  })()}
                </div>

                {/* Contact */}
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
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary">{prospect.telephone}</p>
                        <button
                          onClick={() => handleQuickAction('appel', `tel:${prospect.telephone}`)}
                          className="p-1 rounded hover:bg-primary/20 transition-colors"
                          title="Appeler (+ note auto)"
                        >
                          <Phone size={14} className="text-primary" />
                        </button>
                        {formatWhatsAppUrl(prospect.telephone) && (
                          <button
                            onClick={() => handleQuickAction('whatsapp', formatWhatsAppUrl(prospect.telephone), true)}
                            className="p-1 rounded hover:bg-green-500/20 transition-colors"
                            title="WhatsApp (+ note auto)"
                          >
                            <MessageCircle size={14} className="text-green-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {prospect.email && (
                    <div>
                      <span className="text-text-secondary text-xs">Email</span>
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary truncate">{prospect.email}</p>
                        <button
                          onClick={() => handleQuickAction(
                            'email',
                            `mailto:${prospect.email}?subject=${encodeURIComponent(`${prospect.nom} — Votre projet de ${getTypeDossierLabel(prospect.type_dossier).toLowerCase()}`)}`
                          )}
                          className="p-1 rounded hover:bg-blue-500/20 transition-colors shrink-0"
                          title="Email (+ note auto)"
                        >
                          <Mail size={14} className="text-blue-400" />
                        </button>
                      </div>
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

                {/* Profil restaurateur */}
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                    <ChefHat size={13} />
                    Profil restaurateur
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary text-xs">Profil</span>
                      <p className="text-text-primary flex items-center gap-1.5">
                        {prospect.profil_restaurateur === 'multi_etablissements' && <Building2 size={14} className="text-primary" />}
                        {getLabel(PROFILS_RESTAURATEUR, prospect.profil_restaurateur)}
                      </p>
                    </div>
                    {prospect.profil_restaurateur === 'multi_etablissements' && prospect.nombre_restaurants > 1 && (
                      <div>
                        <span className="text-text-secondary text-xs">Nb restaurants</span>
                        <p className="text-text-primary">{prospect.nombre_restaurants}</p>
                      </div>
                    )}
                    {prospect.type_cuisine && (
                      <div>
                        <span className="text-text-secondary text-xs">Type de cuisine</span>
                        <p className="text-text-primary">{getLabel(TYPES_CUISINE, prospect.type_cuisine)}</p>
                      </div>
                    )}
                    {prospect.nombre_salaries != null && (
                      <div>
                        <span className="text-text-secondary text-xs">Salariés</span>
                        <p className="text-text-primary">{prospect.nombre_salaries}</p>
                      </div>
                    )}
                    {prospect.siret && (
                      <div>
                        <span className="text-text-secondary text-xs">SIRET</span>
                        <p className="text-text-primary font-mono text-xs">{prospect.siret}</p>
                      </div>
                    )}
                    {prospect.ca_annuel_declare != null && (
                      <div>
                        <span className="text-text-secondary text-xs">CA annuel (Pappers)</span>
                        <p className="text-text-primary font-medium">{formatCurrency(prospect.ca_annuel_declare)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expert comptable */}
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                    <Briefcase size={13} />
                    Expert-comptable
                  </h4>
                  <div className="text-sm">
                    {prospect.a_expert_comptable ? (
                      <p className="text-text-primary">
                        <span className="text-success font-medium">Oui</span>
                        {prospect.nom_expert_comptable && ` — ${prospect.nom_expert_comptable}`}
                      </p>
                    ) : (
                      <p className="text-text-secondary">Pas d'expert-comptable renseigné</p>
                    )}
                  </div>
                </div>

                {/* Infos local */}
                {(prospect.surface_local_m2 || prospect.loyer_mensuel) && (
                  <div className="border-t border-border pt-3">
                    <h4 className="text-xs font-medium text-text-secondary mb-2">Infos local</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {prospect.surface_local_m2 != null && (
                        <div>
                          <span className="text-text-secondary text-xs">Surface</span>
                          <p className="text-text-primary">{prospect.surface_local_m2} m²</p>
                        </div>
                      )}
                      {prospect.loyer_mensuel != null && (
                        <div>
                          <span className="text-text-secondary text-xs">Loyer mensuel HT</span>
                          <p className="text-text-primary">{formatCurrency(prospect.loyer_mensuel)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Outils / badges */}
                {(prospect.simulateur_valorisation || prospect.diaglocal || prospect.guide_recu) && (
                  <div className="flex flex-wrap gap-2">
                    {prospect.simulateur_valorisation && (
                      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                        <Calculator size={12} />
                        Simulateur
                        {prospect.simulateur_estimation != null && ` — ${formatCurrency(prospect.simulateur_estimation)}`}
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

                {/* DiagLocal details */}
                {prospect.diaglocal && (prospect.diaglocal_adresse || prospect.diaglocal_notes) && (
                  <div className="p-3 bg-bg-main rounded-lg text-sm space-y-1">
                    <p className="text-xs font-medium text-text-secondary">DiagLocal</p>
                    {prospect.diaglocal_adresse && (
                      <p className="text-text-primary">{prospect.diaglocal_adresse}</p>
                    )}
                    {prospect.diaglocal_notes && (
                      <p className="text-text-secondary whitespace-pre-wrap">{prospect.diaglocal_notes}</p>
                    )}
                  </div>
                )}

                {/* Prescripteur & Suivi */}
                {SUIVI_STATUTS.includes(prospect.statut) && (
                  <div className="border-t border-border pt-3">
                    <h4 className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                      <UserCheck size={13} />
                      Prescripteur & Suivi
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {prospect.statut === 'prescripteur' && prospect.type_prescripteur && (
                        <div>
                          <span className="text-text-secondary text-xs">Type prescripteur</span>
                          <p className="text-text-primary">{getTypePrescripteurLabel(prospect.type_prescripteur)}</p>
                        </div>
                      )}
                      {prospect.statut === 'prescripteur' && prospect.nombre_deals_apportes > 0 && (
                        <div>
                          <span className="text-text-secondary text-xs">Deals apportés</span>
                          <p className="text-text-primary font-medium">{prospect.nombre_deals_apportes}</p>
                        </div>
                      )}
                      {prospect.nombre_relances_effectuees > 0 && (
                        <div>
                          <span className="text-text-secondary text-xs">Relances effectuées</span>
                          <p className="text-text-primary flex items-center gap-1.5">
                            <RefreshCw size={13} className="text-text-secondary" />
                            {prospect.nombre_relances_effectuees}
                          </p>
                        </div>
                      )}
                      {prospect.date_derniere_interaction && (
                        <div>
                          <span className="text-text-secondary text-xs">Dernière interaction</span>
                          <p className="text-text-primary flex items-center gap-1.5">
                            <Clock size={13} className="text-text-secondary" />
                            {new Date(prospect.date_derniere_interaction).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Relance */}
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
                <NotesSection prospectId={prospect.id} onProspectUpdate={onReload} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
