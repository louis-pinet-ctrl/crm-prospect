import { useState, useEffect } from 'react'
import { X, Trash2, Edit3, Calculator, MapPin, BookOpen, Users, Building2, ChefHat, Briefcase, UserCheck, RefreshCw, Clock, MessageCircle, Mail, Phone, CalendarPlus, Download, Timer } from 'lucide-react'
import ProspectForm from './ProspectForm'
import NotesSection from './NotesSection'
import ProspectSummary from './ProspectSummary'
import DossiersLies from './DossiersLies'
import FacturesSection from './FacturesSection'
import { ScoreBreakdown } from './ScoreBadge'
import { createNote, fetchNotes, updateProspectAfterInteraction } from '../lib/supabase'
import { calculateScore } from '../lib/scoring'
import { downloadICS, getGoogleCalUrl, getOutlookCalUrl } from '../lib/calendar'
import { useToast } from './Toast'
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
  getDateRelanceParResultat,
} from '../lib/constants'
import { generateRelanceTemplates } from '../lib/relanceTemplates'

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

export default function ProspectModal({ prospect, onClose, onUpdate, onDelete, onAdd, onReload, onSelectProspect }) {
  const toast = useToast()
  const [editing, setEditing] = useState(!prospect)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [scoreResult, setScoreResult] = useState(null)
  const [prospectNotes, setProspectNotes] = useState([])

  // Calculer le score et charger les notes quand on ouvre la fiche
  useEffect(() => {
    if (!prospect?.id) return
    fetchNotes(prospect.id).then(notes => {
      setScoreResult(calculateScore(prospect, notes))
      setProspectNotes(notes)
    }).catch(() => {})
  }, [prospect])

  const isNew = !prospect

  // Action rapide : crée une note d'interaction + ouvre le lien
  // templateContent optionnel = contenu du template utilisé pour historique
  const handleQuickAction = async (type, url, openInNewTab = false, templateContent = null) => {
    if (!prospect?.id) return

    const labels = { appel: 'Appel sortant', email: 'Email envoyé', whatsapp: 'Message WhatsApp envoyé' }
    const contenu = templateContent
      ? `${labels[type] || type}\n---\n${templateContent}`
      : (labels[type] || type)

    try {
      await createNote({
        prospect_id: prospect.id,
        contenu,
        type_note: type,
        date_interaction: new Date().toISOString(),
        resultat: 'message_laisse',
      })
      await updateProspectAfterInteraction(prospect.id, type, new Date().toISOString())
      if (onReload) onReload()
    } catch (err) {
      console.error('Erreur création interaction rapide:', err)
      toast.error('Erreur lors de l\'enregistrement de l\'interaction')
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
    try {
      if (isNew) {
        const created = await onAdd(data)
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
        toast.success('Prospect créé')
      } else {
        await onUpdate(prospect.id, data)
        setEditing(false)
        toast.success('Prospect mis à jour')
      }
    } catch (err) {
      console.error('Erreur sauvegarde prospect:', err)
      toast.error('Erreur lors de la sauvegarde')
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
                    <span className="text-text-secondary text-xs">Honoraires HT</span>
                    <p className="text-primary font-medium">
                      {formatCurrency(prospect.ca_estime)}
                      {prospect.honoraires_override != null && (
                        <span className="text-text-secondary text-[10px] ml-1 font-normal">(forcé)</span>
                      )}
                    </p>
                    {prospect.complement_honoraires > 0 && (
                      <p className="text-text-secondary text-[10px]">
                        dont +{formatCurrency(prospect.complement_honoraires)} complément
                      </p>
                    )}
                    {prospect.honoraires_commentaire && (
                      <p className="text-text-secondary text-[10px]">{prospect.honoraires_commentaire}</p>
                    )}
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
                    {prospect.est_franchise && (
                      <div>
                        <span className="text-text-secondary text-xs">Franchise</span>
                        <p className="text-pink-400 font-medium">
                          {prospect.enseigne_franchise || 'Oui'}
                          {prospect.nombre_franchises > 1 && ` (${prospect.nombre_franchises} points de vente)`}
                        </p>
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
                  <div className={`text-sm p-3 rounded-lg ${
                    isRelanceOverdue(prospect.date_relance)
                      ? 'bg-warning/10 text-warning'
                      : 'bg-bg-main text-text-secondary'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>Relance prévue :</span>
                      <span className="font-medium">
                        {new Date(prospect.date_relance).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {/* Snooze rapide */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Timer size={12} className="text-text-secondary shrink-0" />
                      <span className="text-xs text-text-secondary">Reporter :</span>
                      {[
                        { label: '+1j', days: 1 },
                        { label: '+3j', days: 3 },
                        { label: '+1sem', days: 7 },
                      ].map(opt => (
                        <button
                          key={opt.days}
                          onClick={async () => {
                            const d = new Date()
                            d.setDate(d.getDate() + opt.days)
                            await onUpdate(prospect.id, { date_relance: d.toISOString().split('T')[0] })
                            if (onReload) onReload()
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Calendrier */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <a
                        href={getGoogleCalUrl(prospect, prospect.date_relance)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                      >
                        <CalendarPlus size={12} />
                        Google
                      </a>
                      <a
                        href={getOutlookCalUrl(prospect, prospect.date_relance)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                      >
                        <CalendarPlus size={12} />
                        Outlook
                      </a>
                      <button
                        onClick={() => downloadICS(prospect, prospect.date_relance)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                      >
                        <Download size={12} />
                        .ics
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions intelligentes */}
              <RelanceSuggestions prospect={prospect} onUpdate={onUpdate} onReload={onReload} />

              {/* Templates de relance */}
              <RelanceTemplates prospect={prospect} onQuickAction={handleQuickAction} onUpdate={onUpdate} onReload={onReload} notes={prospectNotes} />

              {/* Facturation */}
              <FacturesSection prospectId={prospect.id} caEstime={prospect.ca_estime} />

              {/* Dossiers liés */}
              <DossiersLies
                prospect={prospect}
                onSelectProspect={onSelectProspect}
                onReload={onReload}
              />

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

// Détermine le prochain canal suggéré basé sur l'historique
function getNextChannelSuggestion(notes) {
  const SEQUENCE = ['email', 'whatsapp', 'appel']
  // Trouver les dernières interactions de type relance
  const recentRelances = (notes || [])
    .filter(n => ['email', 'whatsapp', 'appel'].includes(n.type_note))
    .slice(0, 5)

  if (recentRelances.length === 0) return 'email'

  const lastChannel = recentRelances[0]?.type_note
  const lastIdx = SEQUENCE.indexOf(lastChannel)

  // Si le dernier était un email sans réponse → WhatsApp
  // Si le dernier était un WhatsApp sans réponse → Appel
  // Sinon recommencer à email
  if (recentRelances[0]?.resultat === 'pas_de_reponse' || recentRelances[0]?.resultat === 'message_laisse') {
    return SEQUENCE[(lastIdx + 1) % SEQUENCE.length]
  }

  // Alternance simple : proposer un canal différent du dernier
  return SEQUENCE[(lastIdx + 1) % SEQUENCE.length]
}

const CHANNEL_LABELS = { email: 'Email', whatsapp: 'WhatsApp', appel: 'Appel' }
const CHANNEL_COLORS = { email: 'text-blue-400', whatsapp: 'text-green-400', appel: 'text-primary' }

function RelanceTemplates({ prospect, onQuickAction, onUpdate, onReload, notes }) {
  const [showTemplates, setShowTemplates] = useState(false)
  const [showPreview, setShowPreview] = useState(null)
  const [pendingResultat, setPendingResultat] = useState(null)

  const templates = generateRelanceTemplates(prospect)
  if (!templates) return null

  const suggestedChannel = getNextChannelSuggestion(notes)

  const emailUrl = prospect.email
    ? `mailto:${prospect.email}?subject=${encodeURIComponent(templates.email.subject)}&body=${encodeURIComponent(templates.email.body)}`
    : null

  const whatsappUrl = prospect.telephone
    ? (() => {
        const digits = prospect.telephone.replace(/[\s./-]/g, '')
        const num = digits.startsWith('0') && digits.length === 10
          ? `33${digits.slice(1)}`
          : digits.startsWith('+33') || digits.startsWith('33')
            ? digits.replace('+', '')
            : digits
        return `https://wa.me/${num}?text=${encodeURIComponent(templates.whatsapp)}`
      })()
    : null

  const handleSend = (channel) => {
    if (channel === 'email') {
      onQuickAction('email', emailUrl, false, `Objet : ${templates.email.subject}\n\n${templates.email.body}`)
    } else {
      onQuickAction('whatsapp', whatsappUrl, true, templates.whatsapp)
    }
    setShowTemplates(false)
    setShowPreview(null)
    setPendingResultat({ channel })
  }

  const handleResultat = async (resultat) => {
    // Mettre à jour le résultat sur la dernière note (approximation : on replanifie directement)
    const nextRelance = getDateRelanceParResultat(resultat)
    const updates = {}
    if (nextRelance) {
      updates.date_relance = nextRelance
    } else if (resultat === 'rdv_pris') {
      // Pas de relance auto, on peut avancer le statut
      if (prospect.statut === 'premier_contact' || prospect.statut === 'prospect_identifie') {
        updates.statut = 'diagnostic_rdv'
      }
      updates.date_relance = null
    } else if (resultat === 'refus') {
      updates.date_relance = null
    }

    if (Object.keys(updates).length > 0) {
      try {
        await onUpdate(prospect.id, updates)
        if (onReload) onReload()
      } catch {
        // handled upstream
      }
    }
    setPendingResultat(null)
  }

  // Afficher le prompt de résultat post-envoi
  if (pendingResultat) {
    return (
      <div className="border-t border-border pt-3">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs font-medium text-primary mb-2">
            {pendingResultat.channel === 'email' ? 'Email' : 'WhatsApp'} envoyé — Quel résultat ?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: 'pas_de_reponse', label: 'Pas de réponse', color: 'text-text-secondary' },
              { value: 'message_laisse', label: 'Message laissé', color: 'text-yellow-400' },
              { value: 'interesse', label: 'Intéressé', color: 'text-green-400' },
              { value: 'a_rappeler', label: 'À rappeler', color: 'text-orange-400' },
              { value: 'rdv_pris', label: 'RDV pris', color: 'text-primary' },
              { value: 'refus', label: 'Refus', color: 'text-red-400' },
              { value: 'info_envoyee', label: 'Info envoyée', color: 'text-blue-400' },
            ].map(r => (
              <button
                key={r.value}
                onClick={() => handleResultat(r.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-primary transition-colors ${r.color}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPendingResultat(null)}
            className="text-[10px] text-text-secondary mt-2 hover:text-text-primary transition-colors"
          >
            Ignorer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        onClick={() => { setShowTemplates(!showTemplates); setShowPreview(null) }}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
      >
        <Mail size={14} />
        Relancer avec un template
      </button>

      {/* Séquence multi-canal */}
      {showTemplates && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary mb-2">
          <span>Séquence :</span>
          {['email', 'whatsapp', 'appel'].map((ch, i) => (
            <span key={ch} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-secondary/40">→</span>}
              <span className={ch === suggestedChannel ? `font-bold ${CHANNEL_COLORS[ch]} underline` : ''}>
                {CHANNEL_LABELS[ch]}
              </span>
            </span>
          ))}
          <span className="text-[10px] ml-1 text-text-secondary/60">(suggéré : {CHANNEL_LABELS[suggestedChannel]})</span>
        </div>
      )}

      {showTemplates && (
        <div className="space-y-2">
          {/* Email */}
          {emailUrl && (
            <div className={`bg-blue-500/5 border border-blue-500/20 rounded-lg overflow-hidden ${suggestedChannel === 'email' ? 'ring-1 ring-blue-500/50' : ''}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <Mail size={14} className="text-blue-400 shrink-0" />
                <span className="text-sm text-blue-400 font-medium">Email</span>
                {suggestedChannel === 'email' && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">suggéré</span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => setShowPreview(showPreview === 'email' ? null : 'email')}
                    className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    {showPreview === 'email' ? 'Masquer' : 'Aperçu'}
                  </button>
                  <button
                    onClick={() => handleSend('email')}
                    className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
              {showPreview === 'email' && (
                <div className="px-3 pb-3 space-y-1.5">
                  <div className="text-xs text-text-secondary">
                    <span className="font-medium">Objet :</span> {templates.email.subject}
                  </div>
                  <div className="text-xs text-text-primary whitespace-pre-wrap bg-bg-main rounded-lg p-3 max-h-48 overflow-y-auto leading-relaxed">
                    {templates.email.body}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp */}
          {whatsappUrl && (
            <div className={`bg-green-500/5 border border-green-500/20 rounded-lg overflow-hidden ${suggestedChannel === 'whatsapp' ? 'ring-1 ring-green-500/50' : ''}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <MessageCircle size={14} className="text-green-400 shrink-0" />
                <span className="text-sm text-green-400 font-medium">WhatsApp</span>
                {suggestedChannel === 'whatsapp' && (
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">suggéré</span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => setShowPreview(showPreview === 'whatsapp' ? null : 'whatsapp')}
                    className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    {showPreview === 'whatsapp' ? 'Masquer' : 'Aperçu'}
                  </button>
                  <button
                    onClick={() => handleSend('whatsapp')}
                    className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors font-medium"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
              {showPreview === 'whatsapp' && (
                <div className="px-3 pb-3">
                  <div className="text-xs text-text-primary whitespace-pre-wrap bg-bg-main rounded-lg p-3 max-h-32 overflow-y-auto leading-relaxed">
                    {templates.whatsapp}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Appel */}
          {prospect.telephone && (
            <div className={`bg-primary/5 border border-primary/20 rounded-lg overflow-hidden ${suggestedChannel === 'appel' ? 'ring-1 ring-primary/50' : ''}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <Phone size={14} className="text-primary shrink-0" />
                <span className="text-sm text-primary font-medium">Appel</span>
                {suggestedChannel === 'appel' && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">suggéré</span>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      onQuickAction('appel', `tel:${prospect.telephone}`)
                      setShowTemplates(false)
                      setPendingResultat({ channel: 'appel' })
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium"
                  >
                    Appeler
                  </button>
                </div>
              </div>
            </div>
          )}

          {!emailUrl && !whatsappUrl && !prospect.telephone && (
            <p className="text-xs text-text-secondary">
              Ajoutez un email ou téléphone pour utiliser les templates.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RelanceSuggestions({ prospect, onUpdate, onReload }) {
  const p = prospect
  if (!p) return null

  const suggestions = []
  const relances = p.nombre_relances_effectuees || 0
  const daysSince = p.date_derniere_interaction
    ? Math.round((new Date() - new Date(p.date_derniere_interaction)) / (1000 * 60 * 60 * 24))
    : null

  // 5+ relances sans conversion sur statuts early-stage
  if (relances >= 5 && ['prospect_identifie', 'premier_contact', 'relance_en_attente'].includes(p.statut)) {
    suggestions.push({
      type: 'danger',
      message: `${relances} relances sans avancement. Envisagez de passer en « Suivi long terme » ou « Perdu/Refusé ».`,
      actions: [
        { label: 'Suivi long terme', statut: 'suivi_long_terme' },
        { label: 'Perdu / Refusé', statut: 'perdu_refuse' },
      ],
    })
  }

  // 30+ jours sans interaction sur statut actif
  if (daysSince && daysSince > 30 && !['cloture', 'perdu_refuse', 'facture', 'prescripteur', 'suivi_long_terme'].includes(p.statut)) {
    suggestions.push({
      type: 'warning',
      message: `${daysSince} jours sans interaction. Ce prospect risque de se refroidir.`,
    })
  }

  // Lettre de mission envoyée depuis longtemps sans conversion
  if (p.statut === 'lettre_mission_envoyee' && relances >= 3) {
    suggestions.push({
      type: 'info',
      message: 'Lettre de mission en attente depuis plusieurs relances. Proposez un ajustement des conditions ?',
    })
  }

  // Pas de relance planifiée
  if (!p.date_relance && !['cloture', 'perdu_refuse', 'facture', 'mission_en_cours'].includes(p.statut)) {
    suggestions.push({
      type: 'info',
      message: 'Aucune relance planifiée pour ce prospect.',
    })
  }

  if (suggestions.length === 0) return null

  const colors = {
    danger: 'bg-danger/5 border-danger/20 text-danger',
    warning: 'bg-warning/5 border-warning/20 text-warning',
    info: 'bg-primary/5 border-primary/20 text-primary',
  }

  const handleStatusChange = async (newStatut) => {
    try {
      await onUpdate(prospect.id, { statut: newStatut })
      if (onReload) onReload()
    } catch {
      // handled upstream
    }
  }

  return (
    <div className="space-y-2 mb-3">
      {suggestions.map((s, i) => (
        <div key={i} className={`text-xs p-3 rounded-lg border ${colors[s.type]}`}>
          <p>{s.message}</p>
          {s.actions && (
            <div className="flex gap-2 mt-2">
              {s.actions.map(a => (
                <button
                  key={a.statut}
                  onClick={() => handleStatusChange(a.statut)}
                  className="px-2 py-1 rounded bg-bg-card border border-border text-text-primary hover:border-primary hover:text-primary transition-colors text-[11px]"
                >
                  → {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
