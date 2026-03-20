import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Receipt } from 'lucide-react'
import { fetchFactures, createFacture, deleteFacture } from '../lib/supabase'
import { formatCurrency } from '../lib/constants'

export default function FacturesSection({ prospectId, caEstime }) {
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ montant: '', description: '', numero_facture: '', date_facture: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!prospectId) return
    setLoading(true)
    fetchFactures(prospectId)
      .then(setFactures)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [prospectId])

  const totalFacture = factures.reduce((sum, f) => sum + (f.montant || 0), 0)
  const pctFacture = caEstime > 0 ? Math.min(100, Math.round((totalFacture / caEstime) * 100)) : 0
  const resteAFacturer = Math.max(0, (caEstime || 0) - totalFacture)

  const resetForm = () => {
    setFormData({ montant: '', description: '', numero_facture: '', date_facture: '' })
    setShowForm(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formData.montant) return
    setSubmitting(true)
    try {
      const facture = await createFacture({
        prospect_id: prospectId,
        montant: parseFloat(formData.montant),
        description: formData.description || null,
        numero_facture: formData.numero_facture || null,
        date_facture: formData.date_facture || new Date().toISOString().split('T')[0],
      })
      setFactures(prev => [...prev, facture])
      resetForm()
    } catch (err) {
      console.error('Erreur création facture:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteFacture(id)
      setFactures(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error('Erreur suppression facture:', err)
    }
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
          <Receipt size={14} />
          Facturation
        </h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {/* Barre de progression */}
      {caEstime > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-secondary">
              {formatCurrency(totalFacture)} / {formatCurrency(caEstime)}
            </span>
            <span className={`font-medium ${pctFacture >= 100 ? 'text-success' : 'text-text-primary'}`}>
              {pctFacture}%
            </span>
          </div>
          <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pctFacture}%`,
                backgroundColor: pctFacture >= 100 ? '#4dff88' : pctFacture > 0 ? '#c4e913' : '#3a3a3a',
              }}
            />
          </div>
          {resteAFacturer > 0 && (
            <p className="text-[10px] text-text-secondary mt-1">
              Reste à facturer : {formatCurrency(resteAFacturer)}
            </p>
          )}
        </div>
      )}

      {/* Formulaire ajout */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-3 p-3 bg-bg-main border border-border rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-text-secondary text-[10px] mb-0.5">Montant HT *</label>
              <input
                type="number"
                step="0.01"
                value={formData.montant}
                onChange={(e) => setFormData(prev => ({ ...prev, montant: e.target.value }))}
                placeholder="Ex: 2000"
                required
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[10px] mb-0.5">Date</label>
              <input
                type="date"
                value={formData.date_facture}
                onChange={(e) => setFormData(prev => ({ ...prev, date_facture: e.target.value }))}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-text-secondary text-[10px] mb-0.5">N° facture</label>
              <input
                type="text"
                value={formData.numero_facture}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_facture: e.target.value }))}
                placeholder="Ex: F-2026-042"
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-[10px] mb-0.5">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Acompte, Solde..."
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !formData.montant}
              className="bg-primary text-bg-main font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des factures */}
      {loading ? (
        <p className="text-text-secondary text-xs">Chargement...</p>
      ) : factures.length === 0 ? (
        <p className="text-text-secondary text-xs">Aucune facture enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {factures.map(f => (
            <FactureItem key={f.id} facture={f} onDelete={handleDelete} formatDate={formatDate} />
          ))}
        </div>
      )}
    </div>
  )
}

function FactureItem({ facture, onDelete, formatDate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex items-center gap-3 p-2 bg-bg-main border border-border rounded-lg text-sm group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-text-primary font-medium">
            {formatCurrency(facture.montant)}
          </span>
          {facture.numero_facture && (
            <span className="text-[10px] text-text-secondary font-mono">
              {facture.numero_facture}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-secondary">
          <span>{formatDate(facture.date_facture)}</span>
          {facture.description && <span>— {facture.description}</span>}
        </div>
      </div>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-0.5 rounded hover:bg-bg-hover transition-colors"
          >
            <Trash2 size={12} className="text-text-secondary hover:text-danger" />
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(facture.id); setConfirmDelete(false) }}
              className="p-0.5 rounded hover:bg-danger/20 transition-colors"
            >
              <Check size={12} className="text-danger" />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-0.5 rounded hover:bg-bg-hover transition-colors"
            >
              <X size={12} className="text-text-secondary" />
            </button>
          </span>
        )}
      </span>
    </div>
  )
}
