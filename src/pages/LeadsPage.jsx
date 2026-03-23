import { useState, useMemo, useCallback } from 'react'
import {
  ClipboardPaste, Plus, CheckCircle2, AlertCircle, Phone, Mail, MessageCircle,
  ArrowRight, ChevronRight, Trash2, Calculator, X, Upload, FileText,
} from 'lucide-react'
import { parseEmailText } from '../lib/emailParser'
import { createProspect, createNote, checkDuplicate } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  formatCurrency, getTypeDossierLabel, getTypeDossierColor, STATUTS,
  TYPES_CUISINE, getDateRelanceParStatut,
} from '../lib/constants'

// Mapping type utilisateur → config d'import
const TYPE_PROFILES = {
  'restaurateur': { statut: 'lead_simulateur', priorite: 'haute', intention: 'cedant', type_dossier: 'cession_fonds', label: 'Prospect cédant', color: 'text-primary' },
  'exploitant': { statut: 'lead_simulateur', priorite: 'haute', intention: 'cedant', type_dossier: 'cession_fonds', label: 'Prospect cédant', color: 'text-primary' },
  'restaurateur/exploitant': { statut: 'lead_simulateur', priorite: 'haute', intention: 'cedant', type_dossier: 'cession_fonds', label: 'Prospect cédant', color: 'text-primary' },
  'franchisé': { statut: 'lead_simulateur', priorite: 'haute', intention: 'cedant', type_dossier: 'franchise', label: 'Franchisé cédant', color: 'text-pink-400' },
  'expert-comptable': { statut: 'prescripteur', priorite: 'moyenne', type_prescripteur: 'expert_comptable', type_dossier: 'cession_fonds', label: 'Prescripteur EC', color: 'text-green-400' },
  'agent immobilier': { statut: 'prescripteur', priorite: 'moyenne', type_prescripteur: 'agent_immobilier', type_dossier: 'cession_fonds', label: 'Prescripteur Immo', color: 'text-green-400' },
  'avocat': { statut: 'lead_simulateur', priorite: 'moyenne', type_dossier: 'cession_fonds', label: 'Avocat', color: 'text-blue-400' },
  'conseiller': { statut: 'prescripteur', priorite: 'moyenne', type_prescripteur: 'autre', type_dossier: 'cession_fonds', label: 'Prescripteur', color: 'text-green-400' },
  'investisseur': { statut: 'lead_simulateur', priorite: 'haute', intention: 'acquereur', type_dossier: 'cession_fonds', label: 'Investisseur', color: 'text-purple-400' },
}

function getTypeProfile(typeUtilisateur) {
  if (!typeUtilisateur) return TYPE_PROFILES['restaurateur']
  const key = typeUtilisateur.toLowerCase()
  return TYPE_PROFILES[key] || TYPE_PROFILES['restaurateur']
}

// Extraire le texte d'un fichier .eml (strip headers, garder le body)
function parseEmlContent(emlText) {
  // Séparer headers et body (séparés par une ligne vide)
  const parts = emlText.split(/\r?\n\r?\n/)
  if (parts.length < 2) return emlText

  // Le body commence après les headers
  const body = parts.slice(1).join('\n\n')

  // Décoder les quoted-printable basiques (=XX, =\n soft line breaks)
  let decoded = body
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  // Strip HTML tags si présent
  if (decoded.includes('<html') || decoded.includes('<div') || decoded.includes('<p')) {
    decoded = decoded
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  }

  return decoded.trim()
}

export default function LeadsPage({ prospects, onSelectProspect, reload }) {
  const toast = useToast()
  const [pasteText, setPasteText] = useState('')
  const [parsedLeads, setParsedLeads] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // Leads simulateur existants dans le CRM
  const existingLeads = useMemo(() =>
    prospects
      .filter(p => p.statut === 'lead_simulateur')
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation)),
    [prospects]
  )

  // Parser un texte brut en leads
  const parseAndSetLeads = useCallback((text) => {
    if (!text.trim()) return

    const blocks = text
      .split(/(?=NOUVEAU LEAD VALORISATION)/)
      .filter(b => b.trim().length > 50)

    if (blocks.length === 0) blocks.push(text)

    const leads = blocks.map(block => {
      const parsed = parseEmailText(block)
      const profile = getTypeProfile(parsed.type_utilisateur)
      return {
        ...parsed,
        ...profile,
        _raw: block.slice(0, 200) + '...',
        _duplicate: null,
      }
    }).filter(l => l.nom || l.email || l.telephone)

    if (leads.length === 0) {
      toast.error('Aucun lead détecté')
      return
    }

    setParsedLeads(prev => [...prev, ...leads])
    toast.success(`${leads.length} lead${leads.length > 1 ? 's' : ''} détecté${leads.length > 1 ? 's' : ''}`)
  }, [toast])

  // Parser les emails collés
  const handleParse = () => {
    parseAndSetLeads(pasteText)
  }

  // --- Drag & Drop ---
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    // 1. Texte glissé directement (drag depuis Gmail, Outlook web, etc.)
    const droppedText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/html')
    if (droppedText && droppedText.trim().length > 30) {
      // Strip HTML si c'est du HTML
      let cleanText = droppedText
      if (cleanText.includes('<') && cleanText.includes('>')) {
        cleanText = cleanText
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
      }
      setPasteText(prev => prev ? prev + '\n\n' + cleanText : cleanText)
      parseAndSetLeads(cleanText)
      return
    }

    // 2. Fichiers glissés (.eml, .txt, .msg)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const validFiles = files.filter(f =>
      f.name.endsWith('.eml') || f.name.endsWith('.txt') || f.type === 'text/plain' || f.type === 'message/rfc822'
    )

    if (validFiles.length === 0) {
      toast.error('Format non supporté. Glissez des fichiers .eml ou .txt, ou glissez le texte directement.')
      return
    }

    let allText = ''
    for (const file of validFiles) {
      try {
        const text = await file.text()
        const content = file.name.endsWith('.eml') ? parseEmlContent(text) : text
        allText += (allText ? '\n\n' : '') + content
      } catch (err) {
        console.error('Erreur lecture fichier:', file.name, err)
        toast.error(`Erreur lecture : ${file.name}`)
      }
    }

    if (allText) {
      setPasteText(prev => prev ? prev + '\n\n' + allText : allText)
      parseAndSetLeads(allText)
    }
  }, [parseAndSetLeads, toast])

  // Vérifier les doublons
  const checkDuplicates = async (leads) => {
    const checked = []
    for (const lead of leads) {
      const dup = await checkDuplicate({
        email: lead.email,
        telephone: lead.telephone,
      })
      checked.push({ ...lead, _duplicate: dup })
    }
    return checked
  }

  // Importer tous les leads parsés
  const handleImportAll = async () => {
    setImporting(true)
    const checked = await checkDuplicates(parsedLeads)
    setParsedLeads(checked)

    let imported = 0
    let skipped = 0
    const errors = []

    for (const lead of checked) {
      if (lead._duplicate) {
        skipped++
        continue
      }

      try {
        // Construire les données prospect — n'envoyer que les champs non-null
        const prospectData = {
          nom: lead.nom || 'Lead simulateur',
          type_dossier: lead.type_dossier || 'cession_fonds',
          statut: lead.statut || 'lead_simulateur',
          priorite: lead.priorite || 'moyenne',
          source: 'simulateur_precession',
          simulateur_valorisation: true,
          base_calcul: lead.base_calcul || 0,
          mode_honoraires: 'pourcentage',
          taux_pourcentage: 1.3,
          date_relance: new Date().toISOString().split('T')[0],
          profil_restaurateur: 'primo_accedant',
        }

        // Champs optionnels — n'ajouter que si non-vides
        if (lead.telephone) prospectData.telephone = lead.telephone
        if (lead.email) prospectData.email = lead.email
        if (lead.source_detail) prospectData.source_detail = lead.source_detail
        if (lead.intention) prospectData.intention = lead.intention
        if (lead.type_cuisine) prospectData.type_cuisine = lead.type_cuisine
        if (lead.ca_annuel_declare) prospectData.ca_annuel_declare = lead.ca_annuel_declare
        if (lead.loyer_mensuel) prospectData.loyer_mensuel = lead.loyer_mensuel
        if (lead.nombre_salaries) prospectData.nombre_salaries = lead.nombre_salaries
        if (lead.simulateur_estimation) prospectData.simulateur_estimation = lead.simulateur_estimation
        if (lead.type_prescripteur) prospectData.type_prescripteur = lead.type_prescripteur

        // Essayer l'insert, fallback si enum manquant en base
        let created
        try {
          created = await createProspect(prospectData)
        } catch (insertErr) {
          // Erreur enum Supabase (22P02 = invalid input value for enum)
          if (insertErr.code === '22P02') {
            console.warn(`Statut "${prospectData.statut}" non disponible en base, fallback sur prospect_identifie`)
            prospectData.statut = 'prospect_identifie'
            // Retirer type_prescripteur si l'enum n'existe pas non plus
            delete prospectData.type_prescripteur
            delete prospectData.intention
            created = await createProspect(prospectData)
          } else {
            throw insertErr
          }
        }

        // Créer la note avec les données bail + juridique
        if (lead._note_contenu && created?.id) {
          try {
            await createNote({
              prospect_id: created.id,
              contenu: lead._note_contenu,
              type_note: 'note_libre',
            })
          } catch (noteErr) {
            console.error('Erreur création note simulateur:', noteErr)
          }
        }

        imported++
      } catch (err) {
        console.error('Erreur import lead:', lead.nom, err)
        errors.push(`${lead.nom || lead.email} (${err.message || err.code || 'erreur inconnue'})`)
      }
    }

    setImporting(false)
    setImportResults({ imported, skipped, errors })
    if (imported > 0) {
      setPasteText('')
      setParsedLeads([])
      if (reload) reload()
    }
    if (imported > 0) {
      toast.success(`${imported} lead${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''}${skipped ? `, ${skipped} doublon${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}` : ''}`)
    } else if (errors.length > 0) {
      toast.error(`Erreur : ${errors[0]}`)
    } else if (skipped > 0) {
      toast.error(`${skipped} doublon${skipped > 1 ? 's' : ''} — tous les leads existent déjà`)
    }
  }

  const removeParsedLead = (index) => {
    setParsedLeads(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-lg font-semibold text-text-primary mb-1">Import leads simulateur</h2>
      <p className="text-xs text-text-secondary mb-6">
        Glissez un email ou un fichier .eml, ou collez le texte directement.
      </p>

      {/* Zone drag & drop + paste */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-bg-card border-2 border-dashed rounded-lg p-4 mb-6 transition-all ${
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-text-secondary/30'
        }`}
      >
        {/* Header avec icônes */}
        <div className="flex items-center gap-2 mb-3">
          <ClipboardPaste size={16} className="text-primary" />
          <span className="text-sm font-medium text-text-primary">Glisser ou coller les emails</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-text-secondary px-2 py-0.5 bg-bg-main rounded border border-border">
              .eml
            </span>
            <span className="text-[10px] text-text-secondary px-2 py-0.5 bg-bg-main rounded border border-border">
              .txt
            </span>
            <span className="text-[10px] text-text-secondary px-2 py-0.5 bg-bg-main rounded border border-border">
              drag text
            </span>
          </div>
        </div>

        {/* Zone visuelle drag */}
        {dragOver ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText size={32} className="text-primary animate-bounce" />
            <span className="text-sm text-primary font-medium">Lâchez pour importer</span>
          </div>
        ) : (
          <>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Collez ici un ou plusieurs emails du simulateur de valorisation, ou glissez un fichier .eml / du texte depuis votre boîte mail..."
              rows={8}
              className="w-full bg-bg-main border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary resize-none font-mono leading-relaxed"
            />

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleParse}
                disabled={!pasteText.trim()}
                className="flex items-center gap-2 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                <Upload size={14} />
                Détecter les leads
              </button>
              {pasteText && (
                <button
                  onClick={() => { setPasteText(''); setParsedLeads([]) }}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview des leads parsés */}
      {parsedLeads.length > 0 && (
        <div className="bg-bg-card border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              {parsedLeads.length} lead{parsedLeads.length > 1 ? 's' : ''} détecté{parsedLeads.length > 1 ? 's' : ''}
            </h3>
            <button
              onClick={handleImportAll}
              disabled={importing}
              className="flex items-center gap-2 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {importing ? 'Import en cours...' : `Importer ${parsedLeads.length > 1 ? 'tous' : ''}`}
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {parsedLeads.map((lead, i) => (
              <ParsedLeadCard key={i} lead={lead} index={i} onRemove={removeParsedLead} />
            ))}
          </div>
        </div>
      )}

      {/* Résultats d'import */}
      {importResults && (
        <div className={`border rounded-lg p-4 mb-6 ${
          importResults.errors.length > 0
            ? 'bg-danger/5 border-danger/20'
            : 'bg-success/5 border-success/20'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {importResults.errors.length > 0 ? (
              <AlertCircle size={16} className="text-danger" />
            ) : (
              <CheckCircle2 size={16} className="text-success" />
            )}
            <span className={`text-sm font-medium ${importResults.errors.length > 0 ? 'text-danger' : 'text-success'}`}>
              Import terminé
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            {importResults.imported} importé{importResults.imported > 1 ? 's' : ''}
            {importResults.skipped > 0 && ` · ${importResults.skipped} doublon${importResults.skipped > 1 ? 's' : ''}`}
            {importResults.errors.length > 0 && ` · ${importResults.errors.length} erreur${importResults.errors.length > 1 ? 's' : ''}`}
          </p>
          {importResults.errors.length > 0 && (
            <div className="mt-2 text-[11px] text-danger/80 space-y-0.5">
              {importResults.errors.map((e, i) => <div key={i}>{e}</div>)}
              <div className="mt-1 text-text-secondary">
                Avez-vous exécuté la migration SQL ? (supabase-migration-lead-simulateur.sql)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste des leads existants */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Leads simulateur en attente ({existingLeads.length})
          </h3>
        </div>

        {existingLeads.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            Aucun lead simulateur en attente de qualification
          </div>
        ) : (
          <div className="space-y-2">
            {existingLeads.map(p => (
              <LeadCard key={p.id} prospect={p} onSelect={() => onSelectProspect(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ParsedLeadCard({ lead, index, onRemove }) {
  const profile = getTypeProfile(lead.type_utilisateur)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
      lead._duplicate ? 'bg-warning/5 border-warning/20' : 'bg-bg-main border-border'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">{lead.nom || '?'}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border border-current/20 ${profile.color}`}>
            {profile.label}
          </span>
          {lead.simulateur_estimation && (
            <span className="text-[10px] text-primary flex items-center gap-0.5">
              <Calculator size={10} />
              {formatCurrency(lead.simulateur_estimation)}
            </span>
          )}
          {lead._duplicate && (
            <span className="text-[10px] text-warning font-medium">⚠ Doublon : {lead._duplicate.nom}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-secondary">
          {lead.email && <span className="flex items-center gap-1"><Mail size={10} />{lead.email}</span>}
          {lead.telephone && <span className="flex items-center gap-1"><Phone size={10} />{lead.telephone}</span>}
          {lead.type_cuisine && (
            <span>{TYPES_CUISINE.find(t => t.value === lead.type_cuisine)?.label || lead.type_cuisine}</span>
          )}
          {lead.ca_annuel_declare && <span>CA: {formatCurrency(lead.ca_annuel_declare)}</span>}
        </div>
      </div>
      <button
        onClick={() => onRemove(index)}
        className="p-1 rounded hover:bg-danger/10 transition-colors shrink-0"
        title="Retirer"
      >
        <X size={14} className="text-text-secondary hover:text-danger" />
      </button>
    </div>
  )
}

function LeadCard({ prospect: p, onSelect }) {
  const daysSince = p.date_creation
    ? Math.round((new Date() - new Date(p.date_creation)) / (1000 * 60 * 60 * 24))
    : null

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg-card hover:border-primary/30 transition-all text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{p.nom}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: getTypeDossierColor(p.type_dossier) + '20',
              color: getTypeDossierColor(p.type_dossier),
            }}
          >
            {getTypeDossierLabel(p.type_dossier)}
          </span>
          {p.simulateur_estimation && (
            <span className="text-[10px] text-primary flex items-center gap-0.5">
              <Calculator size={10} />
              {formatCurrency(p.simulateur_estimation)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-secondary">
          {p.email && <span>{p.email}</span>}
          {p.telephone && <span>{p.telephone}</span>}
          {daysSince != null && <span>il y a {daysSince}j</span>}
          {p.nombre_relances_effectuees > 0 && <span>{p.nombre_relances_effectuees} relances</span>}
        </div>
      </div>
      <ChevronRight size={16} className="text-text-secondary shrink-0" />
    </button>
  )
}
