import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Receipt } from 'lucide-react'
import { fetchFactures, createFacture, updateFacture, deleteFacture } from '../lib/supabase'
import { formatCurrency } from '../lib/constants'
import { useToast } from './Toast'

export default function FacturesSection({ prospectId, caEstime, onFacturesChange }) {
  const toast = useToast()
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
      toast.success('Facture ajoutée')
      if (onFacturesChange) onFacturesChange()
    } catch (err) {
      console.error('Erreur création facture:', err)
      toast.error('Erreur lors de l\'ajout de la facture')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    try {
      const updated = await updateFacture(id, updates)
      setFactures(prev => prev.map(f => (f.id === id ? updated : f)))
      toast.success('Facture modifiée')
      if (onFacturesChange) onFacturesChange()
      return true
    } catch (err) {
      console.error('Erreur mise à jour facture:', err)
      toast.error('Erreur lors de la modification')
      return false
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteFacture(id)
      setFactures(prev => prev.filter(f => f.id !== id))
      toast.success('Facture supprimée')
      if (onFacturesChange) onFacturesChange()
    } catch (err) {
      console.error('Erreur suppression facture:', err)
      toast.error('Erreur lors de la suppression')
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
        <FactureForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleAdd}
          onCancel={resetForm}
          submitting={submitting}
        />
      )}

      {/* Liste des factures */}
      {loading ? (
        <p className="text-text-secondary text-xs">Chargement...</p>
      ) : factures.length === 0 ? (
        <p className="text-text-secondary text-xs">Aucune facture enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {factures.map(f => (
            <FactureItem
              key={f.id}
              facture={f}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FactureForm({ data, onChange, onSubmit, onCancel, submitting }) {
  return (
    <form onSubmit={onSubmit} className="mb-3 p-3 bg-bg-main border border-border rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-text-secondary text-[10px] mb-0.5">Montant HT *</label>
          <input
            type="number"
            step="0.01"
            value={data.montant}
            onChange={(e) => onChange(prev => ({ ...prev, montant: e.target.value }))}
            placeholder="Ex: 2000"
            required
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-[10px] mb-0.5">Date</label>
          <input
            type="date"
            value={data.date_facture}
            onChange={(e) => onChange(prev => ({ ...prev, date_facture: e.target.value }))}
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-text-secondary text-[10px] mb-0.5">N° facture</label>
          <input
            type="text"
            value={data.numero_facture}
            onChange={(e) => onChange(prev => ({ ...prev, numero_facture: e.target.value }))}
            placeholder="Ex: F-2026-042"
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-[10px] mb-0.5">Description</label>
          <input
            type="text"
            value={data.description}
            onChange={(e) => onChange(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ex: Acompte, Solde..."
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !data.montant}
          className="bg-primary text-bg-main font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting ? '...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

function FactureItem({ facture, onUpdate, onDelete, formatDate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setEditData({
      montant: facture.montant || '',
      description: facture.description || '',
      numero_facture: facture.numero_facture || '',
      date_facture: facture.date_facture || '',
    })
    setEditing(true)
    setConfirmDelete(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editData.montant) return
    setSaving(true)
    try {
      const ok = await onUpdate(facture.id, {
        montant: parseFloat(editData.montant),
        description: editData.description || null,
        numero_facture: editData.numero_facture || null,
        date_facture: editData.date_facture || null,
      })
      if (ok) setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="p-3 bg-bg-main border border-primary/40 rounded-lg space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-text-secondary text-[10px] mb-0.5">Montant HT *</label>
            <input
              type="number"
              step="0.01"
              value={editData.montant}
              onChange={(e) => setEditData(prev => ({ ...prev, montant: e.target.value }))}
              required
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary text-[10px] mb-0.5">Date</label>
            <input
              type="date"
              value={editData.date_facture}
              onChange={(e) => setEditData(prev => ({ ...prev, date_facture: e.target.value }))}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-text-secondary text-[10px] mb-0.5">N° facture</label>
            <input
              type="text"
              value={editData.numero_facture}
              onChange={(e) => setEditData(prev => ({ ...prev, numero_facture: e.target.value }))}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary text-[10px] mb-0.5">Description</label>
            <input
              type="text"
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !editData.montant}
            className="bg-primary text-bg-main font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? '...' : 'Sauvegarder'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    )
  }

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
      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={startEdit}
          className="p-0.5 rounded hover:bg-bg-hover transition-colors"
        >
          <Pencil size={12} className="text-text-secondary hover:text-primary" />
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-0.5 rounded hover:bg-bg-hover transition-colors"
          >
            <Trash2 size={12} className="text-text-secondary hover:text-danger" />
          </button>
        ) : (
          <>
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
          </>
        )}
      </span>
    </div>
  )
}
