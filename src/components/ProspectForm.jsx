import { useState } from 'react'
import {
  TYPES_DOSSIER,
  SOURCES,
  PRIORITES,
  MODES_HONORAIRES,
  STATUTS,
} from '../lib/constants'

const defaultValues = {
  nom: '',
  telephone: '',
  email: '',
  etablissement: '',
  ville: '',
  type_dossier: 'bail',
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

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const setNumber = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form }
    if (!data.date_relance) data.date_relance = null
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {form.source === 'recommandation' && (
        <div>
          <label className={labelClass}>Détail source</label>
          <input
            type="text"
            value={form.source_detail}
            onChange={set('source_detail')}
            placeholder="Ex: recommandé par Maître X"
            className={inputClass}
          />
        </div>
      )}

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">Honoraires</h4>
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
                <div className="text-primary font-medium text-sm py-2">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format((form.base_calcul * form.taux_pourcentage) / 100)}
                </div>
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
