import { useState } from 'react'
import { Search, ClipboardPaste, X, Check } from 'lucide-react'
import {
  TYPES_DOSSIER,
  SOURCES,
  PRIORITES,
  MODES_HONORAIRES,
  STATUTS,
  PROFILS_RESTAURATEUR,
  TYPES_CUISINE,
  TYPES_PRESCRIPTEUR,
  INTENTIONS,
  SEUIL_MINIMUM_CESSION_FONDS,
  SUIVI_STATUTS,
  getDateRelanceSuivi,
  getDateRelanceParStatut,
  DELAIS_RELANCE_PAR_STATUT,
} from '../lib/constants'
import { fetchCompanyBySiret } from '../lib/pappers'
import { checkDuplicate } from '../lib/supabase'
import { parseEmailText } from '../lib/emailParser'

const defaultValues = {
  nom: '',
  telephone: '',
  email: '',
  etablissement: '',
  ville: '',
  type_dossier: 'cession_fonds',
  type_dossier_detail: '',
  intention: '',
  mode_honoraires: 'pourcentage',
  taux_pourcentage: 1.3,
  base_calcul: 0,
  montant_forfait: 0,
  source: 'autre',
  source_detail: '',
  statut: 'prospect_identifie',
  date_relance: '',
  priorite: 'moyenne',
  simulateur_valorisation: false,
  diaglocal: false,
  guide_recu: false,
  // Profil restaurateur
  profil_restaurateur: 'primo_accedant',
  nombre_restaurants: 1,
  type_cuisine: '',
  nombre_salaries: null,
  siret: '',
  ca_annuel_declare: null,
  adresse_sirene: '',
  code_postal: '',
  code_naf: '',
  libelle_naf: '',
  forme_juridique: '',
  date_creation_entreprise: '',
  etat_administratif: '',
  // Franchise
  est_franchise: false,
  enseigne_franchise: '',
  nombre_franchises: 1,
  // Expert comptable
  a_expert_comptable: false,
  nom_expert_comptable: '',
  // Infos local
  surface_local_m2: null,
  loyer_mensuel: null,
  // Honoraires ajustements
  complement_honoraires: 0,
  honoraires_override: null,
  honoraires_commentaire: '',
  // Outils résultats
  diaglocal_adresse: '',
  diaglocal_notes: '',
  simulateur_estimation: null,
  simulateur_date: '',
  // Prescripteur & Suivi
  type_prescripteur: '',
  nombre_deals_apportes: 0,
  nombre_relances_effectuees: 0,
  date_derniere_interaction: null,
}

export default function ProspectForm({ prospect, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => {
    if (prospect) {
      return {
        ...defaultValues,
        ...prospect,
        date_relance: prospect.date_relance || '',
      }
    }
    return defaultValues
  })

  const set = (field) => (e) => {
    const value = e.target.value
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-set honoraires mode when changing type_dossier
      if (field === 'type_dossier') {
        if (value === 'cession_fonds') {
          next.mode_honoraires = 'pourcentage'
          next.taux_pourcentage = 1.3
        } else {
          next.mode_honoraires = 'forfait'
        }
      }
      // Auto-planifier la relance quand le statut change
      if (field === 'statut' && value !== prev.statut) {
        const autoDate = getDateRelanceParStatut(value)
        if (autoDate) {
          // Toujours proposer une date de relance adaptée au nouveau statut
          next.date_relance = autoDate
        }
      }
      return next
    })
  }

  const toggle = (field) => () =>
    setForm(prev => ({ ...prev, [field]: !prev[field] }))

  const setNumber = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))

  const setNullableNumber = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value === '' ? null : parseFloat(e.target.value) || 0 }))

  const [showPasteZone, setShowPasteZone] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteResult, setPasteResult] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  // Stocke la note simulateur à créer après soumission
  const [pendingNote, setPendingNote] = useState(null)

  const handleParseEmail = () => {
    if (!pasteText.trim()) return
    const parsed = parseEmailText(pasteText)
    const fieldsFound = Object.keys(parsed).filter(k => !k.startsWith('_'))
    if (fieldsFound.length === 0) {
      setPasteResult({ success: false, message: 'Aucune info détectée dans ce texte.' })
      return
    }
    const isSimu = parsed._isSimulateur

    setForm(prev => {
      const next = { ...prev }
      // Champs communs — ne remplit que les champs vides
      if (parsed.nom && !prev.nom) next.nom = parsed.nom
      if (parsed.email && !prev.email) next.email = parsed.email
      if (parsed.telephone && !prev.telephone) next.telephone = parsed.telephone
      if (parsed.etablissement && !prev.etablissement) next.etablissement = parsed.etablissement
      if (parsed.ville && !prev.ville) next.ville = parsed.ville
      if (parsed.siret && !prev.siret) next.siret = parsed.siret
      if (parsed.surface_local_m2 != null && !prev.surface_local_m2) next.surface_local_m2 = parsed.surface_local_m2
      if (parsed.loyer_mensuel != null && !prev.loyer_mensuel) next.loyer_mensuel = parsed.loyer_mensuel
      if (parsed.nombre_salaries != null && prev.nombre_salaries == null) next.nombre_salaries = parsed.nombre_salaries
      if (parsed.adresse && !prev.diaglocal_adresse) next.diaglocal_adresse = parsed.adresse

      // Champs spécifiques simulateur
      if (isSimu) {
        next.source = 'simulateur_precession'
        next.simulateur_valorisation = true
        next.type_dossier = 'cession_fonds'
        next.mode_honoraires = 'pourcentage'
        next.taux_pourcentage = 1.3
        if (parsed.simulateur_estimation) next.simulateur_estimation = parsed.simulateur_estimation
        if (parsed.base_calcul) next.base_calcul = parsed.base_calcul
        if (parsed.ca_annuel_declare != null && prev.ca_annuel_declare == null) next.ca_annuel_declare = parsed.ca_annuel_declare
        if (parsed.type_cuisine) next.type_cuisine = parsed.type_cuisine
        if (parsed.source_detail) next.source_detail = parsed.source_detail
      }

      return next
    })

    // Préparer la note avec les détails bail/juridique du simulateur
    if (isSimu && parsed._note_contenu) {
      setPendingNote(parsed._note_contenu)
    }

    const labels = {
      nom: 'Nom', email: 'Email', telephone: 'Téléphone', etablissement: 'Établissement',
      ville: 'Ville', siret: 'SIRET', surface_local_m2: 'Surface', loyer_mensuel: 'Loyer',
      nombre_salaries: 'Salariés', adresse: 'Adresse', source: 'Source', type_cuisine: 'Cuisine',
      ca_annuel_declare: 'CA annuel', simulateur_estimation: 'Valorisation', base_calcul: 'Base honoraires',
      source_detail: 'Détails simu',
    }
    const found = fieldsFound.map(f => labels[f] || f).filter(Boolean).join(', ')
    const msg = isSimu
      ? `Lead simulateur importé ! ${found}`
      : `Détecté : ${found}`
    setPasteResult({ success: true, message: msg })
    setTimeout(() => {
      setPasteResult(null)
      setShowPasteZone(false)
      setPasteText('')
    }, 4000)

    // Vérifier les doublons si c'est un nouveau prospect
    if (!prospect) {
      checkDuplicate({
        email: parsed.email,
        telephone: parsed.telephone,
      }).then(dup => {
        if (dup) setDuplicateWarning(dup)
      }).catch(() => {})
    }
  }

  const [pappersLoading, setPappersLoading] = useState(false)
  const [pappersError, setPappersError] = useState(null)
  const [pappersSuccess, setPappersSuccess] = useState(false)

  const handlePappersLookup = async () => {
    if (!form.siret || form.siret.replace(/\s/g, '').length < 14) {
      setPappersError('SIRET invalide (14 chiffres requis)')
      return
    }
    setPappersLoading(true)
    setPappersError(null)
    setPappersSuccess(false)
    try {
      const info = await fetchCompanyBySiret(form.siret)
      setForm(prev => ({
        ...prev,
        etablissement: info.etablissement || prev.etablissement,
        ca_annuel_declare: info.ca_annuel_declare ?? prev.ca_annuel_declare,
        nombre_salaries: info.nombre_salaries ?? prev.nombre_salaries,
        ville: info.ville || prev.ville,
        adresse_sirene: info.adresse || prev.adresse_sirene || '',
        code_postal: info.code_postal || prev.code_postal || '',
        code_naf: info.code_naf || prev.code_naf || '',
        libelle_naf: info.libelle_naf || prev.libelle_naf || '',
        forme_juridique: info.libelle_nature_juridique || prev.forme_juridique || '',
        date_creation_entreprise: info.date_creation_entreprise || prev.date_creation_entreprise || '',
        etat_administratif: info.etat_administratif || prev.etat_administratif || '',
      }))
      setPappersSuccess(true)
      setTimeout(() => setPappersSuccess(false), 3000)
    } catch (err) {
      setPappersError(err.message)
    } finally {
      setPappersLoading(false)
    }
  }

  const [submitChecking, setSubmitChecking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form }
    // Champs vides → null pour les enums et dates
    if (!data.date_relance) data.date_relance = null
    if (!data.type_prescripteur) data.type_prescripteur = null
    if (!data.date_derniere_interaction) data.date_derniere_interaction = null
    if (!data.intention) data.intention = null
    if (!data.type_cuisine) data.type_cuisine = null
    if (!data.source_detail) data.source_detail = null
    if (!data.type_dossier_detail) data.type_dossier_detail = null
    if (!data.honoraires_commentaire) data.honoraires_commentaire = null
    if (!data.enseigne_franchise) data.enseigne_franchise = null
    if (!data.simulateur_date && data.statut === 'lead_simulateur') {
      data.simulateur_date = new Date().toISOString().split('T')[0]
    } else if (!data.simulateur_date) {
      data.simulateur_date = null
    }
    if (!data.diaglocal_adresse) data.diaglocal_adresse = null
    if (!data.diaglocal_notes) data.diaglocal_notes = null
    if (!data.siret) data.siret = null
    if (!data.nom_expert_comptable) data.nom_expert_comptable = null
    if (!data.adresse_sirene) data.adresse_sirene = null
    if (!data.code_postal) data.code_postal = null
    if (!data.code_naf) data.code_naf = null
    if (!data.libelle_naf) data.libelle_naf = null
    if (!data.forme_juridique) data.forme_juridique = null
    if (!data.date_creation_entreprise) data.date_creation_entreprise = null
    if (!data.etat_administratif) data.etat_administratif = null
    // Numeric fields: empty string → null
    if (data.simulateur_estimation === '' || data.simulateur_estimation === null) data.simulateur_estimation = null
    if (data.nombre_salaries === '' || data.nombre_salaries === null) data.nombre_salaries = null
    if (data.ca_annuel_declare === '' || data.ca_annuel_declare === null) data.ca_annuel_declare = null
    if (data.surface_local_m2 === '' || data.surface_local_m2 === null) data.surface_local_m2 = null
    if (data.loyer_mensuel === '' || data.loyer_mensuel === null) data.loyer_mensuel = null
    if (data.honoraires_override === '' || data.honoraires_override === null) data.honoraires_override = null
    // Remove computed/system fields
    delete data.ca_estime
    delete data.id
    delete data.date_creation
    delete data.date_modification
    delete data.user_id
    delete data.position_kanban
    delete data.client_parent_id

    // Vérifier doublons si nouveau prospect et pas déjà averti
    if (!prospect && !duplicateWarning) {
      setSubmitChecking(true)
      try {
        const dup = await checkDuplicate({ email: form.email, telephone: form.telephone })
        if (dup) {
          setDuplicateWarning(dup)
          setSubmitChecking(false)
          return // Bloquer la soumission, l'utilisateur doit confirmer
        }
      } catch {
        // En cas d'erreur, on laisse passer
      }
      setSubmitChecking(false)
    }

    onSubmit(data, pendingNote)
  }

  const STEPS = [
    { key: 'contact', label: 'Contact & Dossier' },
    { key: 'profil', label: 'Profil restaurateur' },
    { key: 'honoraires', label: 'Honoraires' },
    { key: 'outils', label: 'Outils & Relance' },
  ]
  const [step, setStep] = useState(0)

  const inputClass =
    'w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary'
  const labelClass = 'block text-text-secondary text-xs mb-1'
  const sectionClass = 'border-t border-border pt-4'
  const sectionTitle = 'text-sm font-medium text-text-primary mb-3'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* --- Wizard steps indicator --- */}
      <div className="flex items-center gap-1 mb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(i)}
            className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-colors ${
              i === step
                ? 'bg-primary/15 text-primary'
                : i < step
                  ? 'bg-success/10 text-success'
                  : 'bg-bg-main text-text-secondary hover:text-text-primary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* --- Coller un email --- */}
      {!showPasteZone ? (
        <button
          type="button"
          onClick={() => setShowPasteZone(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
        >
          <ClipboardPaste size={16} />
          Coller un email pour remplir auto
        </button>
      ) : (
        <div className="p-3 bg-bg-main border border-border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Collez le contenu d'un email ou d'une signature
            </span>
            <button type="button" onClick={() => { setShowPasteZone(false); setPasteText(''); setPasteResult(null) }}>
              <X size={14} className="text-text-secondary hover:text-text-primary" />
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={"Ex:\nBonjour Maître,\nJe suis Jean Dupont, gérant du Restaurant Le Petit Bistrot.\nTéléphone : 06 12 34 56 78\njean.dupont@email.com\n12 rue de la Paix, 75002 Paris"}
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleParseEmail}
              disabled={!pasteText.trim()}
              className="flex items-center gap-1.5 bg-primary text-bg-main font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              <Check size={14} />
              Extraire les infos
            </button>
            {pasteResult && (
              <span className={`text-xs ${pasteResult.success ? 'text-success' : 'text-warning'}`}>
                {pasteResult.message}
              </span>
            )}
          </div>
        </div>
      )}

      {/* === STEP 0: Contact & Dossier === */}
      {step === 0 && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nom *</label>
          <input
            type="text"
            value={form.nom}
            onChange={set('nom')}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Établissement</label>
          <input
            type="text"
            value={form.etablissement}
            onChange={set('etablissement')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Téléphone</label>
          <input
            type="tel"
            value={form.telephone}
            onChange={set('telephone')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Ville</label>
          <input
            type="text"
            value={form.ville}
            onChange={set('ville')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Statut</label>
          <select value={form.statut} onChange={set('statut')} className={inputClass}>
            {STATUTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Type de dossier</label>
          <select
            value={form.type_dossier}
            onChange={set('type_dossier')}
            className={inputClass}
          >
            {TYPES_DOSSIER.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Intention</label>
          <select
            value={form.intention}
            onChange={set('intention')}
            className={inputClass}
          >
            {INTENTIONS.map(i => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Source</label>
          <select value={form.source} onChange={set('source')} className={inputClass}>
            {SOURCES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priorité</label>
          <select value={form.priorite} onChange={set('priorite')} className={inputClass}>
            {PRIORITES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {form.type_dossier === 'autre' && (
        <div>
          <label className={labelClass}>Détail type de dossier</label>
          <input
            type="text"
            value={form.type_dossier_detail}
            onChange={set('type_dossier_detail')}
            className={inputClass}
          />
        </div>
      )}

      {(form.source === 'recommandation' || form.source === 'autre') && (
        <div>
          <label className={labelClass}>
            {form.source === 'recommandation' ? 'Recommandé par' : 'Détail source'}
          </label>
          <input
            type="text"
            value={form.source_detail}
            onChange={set('source_detail')}
            placeholder={form.source === 'recommandation' ? 'Ex: recommandé par Maître X' : ''}
            className={inputClass}
          />
        </div>
      )}

      </>}

      {/* === STEP 1: Profil restaurateur === */}
      {step === 1 && <>
      <div>
        <h4 className={sectionTitle}>Profil restaurateur</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Profil</label>
            <select
              value={form.profil_restaurateur}
              onChange={set('profil_restaurateur')}
              className={inputClass}
            >
              {PROFILS_RESTAURATEUR.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {form.profil_restaurateur === 'multi_etablissements' && (
            <div>
              <label className={labelClass}>Nombre de restaurants</label>
              <input
                type="number"
                min="2"
                value={form.nombre_restaurants}
                onChange={setNumber('nombre_restaurants')}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Type de cuisine</label>
            <select
              value={form.type_cuisine}
              onChange={set('type_cuisine')}
              className={inputClass}
            >
              <option value="">— Non renseigné —</option>
              {TYPES_CUISINE.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Nombre de salariés</label>
            <input
              type="number"
              min="0"
              value={form.nombre_salaries ?? ''}
              onChange={setNullableNumber('nombre_salaries')}
              placeholder="Ex: 8"
              className={inputClass}
            />
          </div>
        </div>

        {/* Franchise */}
        <div className="space-y-3 mt-3">
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.est_franchise}
              onChange={toggle('est_franchise')}
              className="accent-primary w-4 h-4"
            />
            Franchisé
          </label>
          {form.est_franchise && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Enseigne</label>
                <input
                  type="text"
                  value={form.enseigne_franchise}
                  onChange={set('enseigne_franchise')}
                  placeholder="Ex: McDonald's, Subway, Paul..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nombre de franchises</label>
                <input
                  type="number"
                  min="1"
                  value={form.nombre_franchises}
                  onChange={setNumber('nombre_franchises')}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SIRET</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.siret}
                onChange={set('siret')}
                placeholder="Ex: 123 456 789 00012"
                maxLength={17}
                className={inputClass + ' flex-1'}
              />
              <button
                type="button"
                onClick={handlePappersLookup}
                disabled={pappersLoading}
                className="px-3 py-2 bg-primary text-bg-main rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Rechercher sur Pappers"
              >
                {pappersLoading ? (
                  <span className="text-xs">...</span>
                ) : (
                  <Search size={16} />
                )}
              </button>
            </div>
            {pappersError && (
              <p className="text-danger text-xs mt-1">{pappersError}</p>
            )}
            {pappersSuccess && (
              <p className="text-success text-xs mt-1">Données Pappers importées</p>
            )}
          </div>
          <div>
            <label className={labelClass}>CA annuel déclaré / Pappers</label>
            <input
              type="number"
              step="1000"
              value={form.ca_annuel_declare ?? ''}
              onChange={setNullableNumber('ca_annuel_declare')}
              placeholder="Ex: 450000"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* --- Expert Comptable --- */}
      <div className={sectionClass}>
        <h4 className={sectionTitle}>Expert-comptable</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.a_expert_comptable}
              onChange={toggle('a_expert_comptable')}
              className="accent-primary w-4 h-4"
            />
            Accompagné par un expert-comptable
          </label>
          {form.a_expert_comptable && (
            <div>
              <label className={labelClass}>Nom / Cabinet</label>
              <input
                type="text"
                value={form.nom_expert_comptable}
                onChange={set('nom_expert_comptable')}
                placeholder="Ex: Cabinet Dupont"
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* --- Infos Local --- */}
      <div className={sectionClass}>
        <h4 className={sectionTitle}>Infos local</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Surface (m²)</label>
            <input
              type="number"
              min="0"
              value={form.surface_local_m2 ?? ''}
              onChange={setNullableNumber('surface_local_m2')}
              placeholder="Ex: 120"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Loyer mensuel HT (EUR)</label>
            <input
              type="number"
              step="100"
              value={form.loyer_mensuel ?? ''}
              onChange={setNullableNumber('loyer_mensuel')}
              placeholder="Ex: 3500"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      </>}

      {/* === STEP 2: Honoraires === */}
      {step === 2 && <>
      <div>
        <h4 className={sectionTitle}>Honoraires</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Mode</label>
            <select
              value={form.mode_honoraires}
              onChange={set('mode_honoraires')}
              className={inputClass}
            >
              {MODES_HONORAIRES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {form.mode_honoraires === 'pourcentage' ? (
            <>
              <div>
                <label className={labelClass}>Taux (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.taux_pourcentage}
                  onChange={setNumber('taux_pourcentage')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Base de calcul (EUR)</label>
                <input
                  type="number"
                  step="100"
                  value={form.base_calcul}
                  onChange={setNumber('base_calcul')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Calcul auto</label>
                {(() => {
                  const raw = (form.base_calcul * form.taux_pourcentage) / 100
                  const ca = form.type_dossier === 'cession_fonds'
                    ? Math.max(raw, SEUIL_MINIMUM_CESSION_FONDS)
                    : raw
                  return (
                    <div className="text-text-secondary text-sm py-2">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(ca)}
                      {form.type_dossier === 'cession_fonds' && raw < SEUIL_MINIMUM_CESSION_FONDS && raw > 0 && (
                        <span className="text-xs ml-2">(seuil min. 2 000 EUR)</span>
                      )}
                    </div>
                  )
                })()}
              </div>
            </>
          ) : (
            <div>
              <label className={labelClass}>Montant forfaitaire HT (EUR)</label>
              <input
                type="number"
                step="100"
                value={form.montant_forfait}
                onChange={setNumber('montant_forfait')}
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Complément + Override */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div>
            <label className={labelClass}>Complément honoraires (EUR)</label>
            <input
              type="number"
              step="100"
              value={form.complement_honoraires}
              onChange={setNumber('complement_honoraires')}
              placeholder="Ex: 3500"
              className={inputClass}
            />
            <p className="text-[10px] text-text-secondary mt-0.5">S'ajoute au calcul auto (dossier complexe, multi-fonds...)</p>
          </div>
          <div>
            <label className={labelClass}>Override total (EUR)</label>
            <input
              type="number"
              step="100"
              value={form.honoraires_override ?? ''}
              onChange={setNullableNumber('honoraires_override')}
              placeholder="Laisser vide = calcul auto"
              className={inputClass}
            />
            <p className="text-[10px] text-text-secondary mt-0.5">Force le montant final (ignore le calcul auto)</p>
          </div>
        </div>

        {/* Commentaire honoraires */}
        {(form.complement_honoraires > 0 || form.honoraires_override != null) && (
          <div className="mt-3">
            <label className={labelClass}>Motif / commentaire</label>
            <input
              type="text"
              value={form.honoraires_commentaire}
              onChange={set('honoraires_commentaire')}
              placeholder="Ex: Dossier complexe, 2 fonds de commerce"
              className={inputClass}
            />
          </div>
        )}

        {/* Résumé final */}
        <div className="mt-3 p-3 bg-bg-main rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Honoraires finaux HT</span>
            {(() => {
              let base
              if (form.mode_honoraires === 'pourcentage') {
                const raw = (form.base_calcul * form.taux_pourcentage) / 100
                base = form.type_dossier === 'cession_fonds'
                  ? Math.max(raw, SEUIL_MINIMUM_CESSION_FONDS)
                  : raw
              } else {
                base = form.montant_forfait || 0
              }
              const total = form.honoraires_override != null
                ? form.honoraires_override
                : base + (form.complement_honoraires || 0)
              return (
                <span className="text-primary font-bold text-sm">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)}
                  {form.honoraires_override != null && (
                    <span className="text-text-secondary text-[10px] ml-1 font-normal">(forcé)</span>
                  )}
                  {form.honoraires_override == null && form.complement_honoraires > 0 && (
                    <span className="text-text-secondary text-[10px] ml-1 font-normal">
                      (dont +{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(form.complement_honoraires)} complément)
                    </span>
                  )}
                </span>
              )
            })()}
          </div>
          {form.honoraires_commentaire && (
            <p className="text-[10px] text-text-secondary mt-1">{form.honoraires_commentaire}</p>
          )}
        </div>
      </div>

      </>}

      {/* === STEP 3: Outils & Relance === */}
      {step === 3 && <>
      <div>
        <h4 className={sectionTitle}>Outils envoyés / utilisés</h4>
        <div className="flex flex-wrap gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.simulateur_valorisation}
              onChange={toggle('simulateur_valorisation')}
              className="accent-primary w-4 h-4"
            />
            Simulateur de valorisation
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.diaglocal}
              onChange={toggle('diaglocal')}
              className="accent-primary w-4 h-4"
            />
            DiagLocal
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.guide_recu}
              onChange={toggle('guide_recu')}
              className="accent-primary w-4 h-4"
            />
            Guide reçu
          </label>
        </div>

        {/* Résultat simulateur */}
        {form.simulateur_valorisation && (
          <div className="mt-3 p-3 bg-bg-main rounded-lg space-y-3">
            <p className="text-xs text-text-secondary font-medium">Résultat simulateur pré-cession</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Estimation valorisation (EUR)</label>
                <input
                  type="number"
                  step="1000"
                  value={form.simulateur_estimation ?? ''}
                  onChange={setNullableNumber('simulateur_estimation')}
                  placeholder="Ex: 250000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Date utilisation simulateur</label>
                <input
                  type="date"
                  value={form.simulateur_date || ''}
                  onChange={(e) => setForm(f => ({ ...f, simulateur_date: e.target.value || null }))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Détails DiagLocal */}
        {form.diaglocal && (
          <div className="mt-3 p-3 bg-bg-main rounded-lg space-y-3">
            <p className="text-xs text-text-secondary font-medium">Détails DiagLocal</p>
            <div>
              <label className={labelClass}>Adresse du local</label>
              <input
                type="text"
                value={form.diaglocal_adresse}
                onChange={set('diaglocal_adresse')}
                placeholder="Ex: 12 rue de la Paix, 75002 Paris"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notes / Résultat diagnostic</label>
              <textarea
                value={form.diaglocal_notes}
                onChange={set('diaglocal_notes')}
                rows={3}
                placeholder="Observations sur le local, points d'attention..."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- Prescripteur & Suivi (visible si statut dans tunnel suivi) --- */}
      {SUIVI_STATUTS.includes(form.statut) && (
        <div className={sectionClass}>
          <h4 className={sectionTitle}>Prescripteur & Suivi long terme</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.statut === 'prescripteur' && (
              <>
                <div>
                  <label className={labelClass}>Type de prescripteur</label>
                  <select
                    value={form.type_prescripteur}
                    onChange={set('type_prescripteur')}
                    className={inputClass}
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPES_PRESCRIPTEUR.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Deals apportés</label>
                  <input
                    type="number"
                    min="0"
                    value={form.nombre_deals_apportes}
                    onChange={setNumber('nombre_deals_apportes')}
                    className={inputClass}
                  />
                </div>
              </>
            )}
            <div>
              <label className={labelClass}>Nombre de relances effectuées</label>
              <input
                type="number"
                min="0"
                value={form.nombre_relances_effectuees}
                onChange={setNumber('nombre_relances_effectuees')}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- Relance --- */}
      <div>
        <label className={labelClass}>Date de relance</label>
        <input
          type="date"
          value={form.date_relance}
          onChange={set('date_relance')}
          className={inputClass}
        />
      </div>

      {/* Alerte doublon */}
      {duplicateWarning && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm text-warning font-medium mb-1">Doublon potentiel !</p>
          <p className="text-xs text-text-secondary mb-2">
            Un prospect similaire existe : <strong className="text-text-primary">{duplicateWarning.nom}</strong>
            {duplicateWarning.email && ` (${duplicateWarning.email})`}
            {duplicateWarning.telephone && ` — ${duplicateWarning.telephone}`}
          </p>
          <button
            type="button"
            onClick={() => setDuplicateWarning(null)}
            className="text-xs text-warning hover:text-warning/80 underline"
          >
            Ignorer et créer quand même
          </button>
        </div>
      )}

      </>}

      {/* Navigation + Submit */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-bg-card pb-2 -mb-2 border-t border-border mt-4 pt-4">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-bg-hover transition-colors text-sm"
          >
            Précédent
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex-1 bg-primary text-bg-main font-semibold py-2.5 rounded-lg hover:bg-primary-hover transition-colors text-sm"
          >
            Suivant
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitChecking}
            className="flex-1 bg-primary text-bg-main font-semibold py-2.5 rounded-lg hover:bg-primary-hover transition-colors text-sm disabled:opacity-50"
          >
            {submitChecking ? 'Vérification...' : prospect ? 'Enregistrer' : 'Créer le prospect'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-bg-hover transition-colors text-sm"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
