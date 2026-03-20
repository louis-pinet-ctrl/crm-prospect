import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  TYPES_DOSSIER,
  SOURCES,
  PRIORITES,
  MODES_HONORAIRES,
  STATUTS,
  PROFILS_RESTAURATEUR,
  TYPES_CUISINE,
  TYPES_PRESCRIPTEUR,
  SEUIL_MINIMUM_CESSION_FONDS,
  SUIVI_STATUTS,
  getDateRelanceSuivi,
} from '../lib/constants'
import { fetchCompanyBySiret } from '../lib/pappers'

const defaultValues = {
  nom: '',
  telephone: '',
  email: '',
  etablissement: '',
  ville: '',
  type_dossier: 'cession_fonds',
  type_dossier_detail: '',
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
  // Expert comptable
  a_expert_comptable: false,
  nom_expert_comptable: '',
  // Infos local
  surface_local_m2: null,
  loyer_mensuel: null,
  // Outils résultats
  diaglocal_adresse: '',
  diaglocal_notes: '',
  simulateur_estimation: null,
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
      // Auto-set relance +90j quand on passe dans le tunnel Suivi
      if (field === 'statut') {
        const wasInSuivi = SUIVI_STATUTS.includes(prev.statut)
        const nowInSuivi = SUIVI_STATUTS.includes(value)
        if (!wasInSuivi && nowInSuivi && !prev.date_relance) {
          next.date_relance = getDateRelanceSuivi()
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
      }))
      setPappersSuccess(true)
      setTimeout(() => setPappersSuccess(false), 3000)
    } catch (err) {
      setPappersError(err.message)
    } finally {
      setPappersLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form }
    if (!data.date_relance) data.date_relance = null
    if (!data.type_prescripteur) data.type_prescripteur = null
    if (!data.date_derniere_interaction) data.date_derniere_interaction = null
    // Remove computed field
    delete data.ca_estime
    delete data.id
    delete data.date_creation
    delete data.date_modification
    delete data.user_id
    onSubmit(data)
  }

  const inputClass =
    'w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary'
  const labelClass = 'block text-text-secondary text-xs mb-1'
  const sectionClass = 'border-t border-border pt-4'
  const sectionTitle = 'text-sm font-medium text-text-primary mb-3'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* --- Contact --- */}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* --- Profil Restaurateur --- */}
      <div className={sectionClass}>
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

      {/* --- Honoraires --- */}
      <div className={sectionClass}>
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
                <label className={labelClass}>CA estimé</label>
                {(() => {
                  const raw = (form.base_calcul * form.taux_pourcentage) / 100
                  const ca = form.type_dossier === 'cession_fonds'
                    ? Math.max(raw, SEUIL_MINIMUM_CESSION_FONDS)
                    : raw
                  return (
                    <div className="text-primary font-medium text-sm py-2">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(ca)}
                      {form.type_dossier === 'cession_fonds' && raw < SEUIL_MINIMUM_CESSION_FONDS && raw > 0 && (
                        <span className="text-text-secondary text-xs ml-2">(seuil min. 2 000 EUR)</span>
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
      </div>

      {/* --- Outils envoyés / utilisés --- */}
      <div className={sectionClass}>
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

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-primary text-bg-main font-semibold py-2.5 rounded-lg hover:bg-primary-hover transition-colors text-sm"
        >
          {prospect ? 'Enregistrer' : 'Créer le prospect'}
        </button>
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
