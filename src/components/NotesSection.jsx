import { useState, useEffect } from 'react'
import { Phone, Mail, MessageCircle, Calendar, FileText, StickyNote, CalendarClock, Pencil, Trash2, Check, X } from 'lucide-react'
import { fetchNotes, createNote, updateNote, deleteNote, updateProspectAfterInteraction, updateProspect } from '../lib/supabase'
import { TYPES_NOTE, TYPES_INTERACTION, RESULTATS_INTERACTION } from '../lib/constants'

const ICONS = {
  appel: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  rdv: Calendar,
  courrier: FileText,
  note_libre: StickyNote,
}

const RESULTAT_COLORS = {
  pas_de_reponse: 'text-text-secondary',
  message_laisse: 'text-yellow-400',
  interesse: 'text-green-400',
  a_rappeler: 'text-orange-400',
  rdv_pris: 'text-primary',
  refus: 'text-red-400',
  info_envoyee: 'text-blue-400',
}

export default function NotesSection({ prospectId, onProspectUpdate }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [contenu, setContenu] = useState('')
  const [typeNote, setTypeNote] = useState('appel')
  const [resultat, setResultat] = useState('')
  const [dateInteraction, setDateInteraction] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isInteraction = TYPES_INTERACTION.includes(typeNote)

  // Initialiser la date au moment présent quand on change de type
  useEffect(() => {
    if (isInteraction && !dateInteraction) {
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
      setDateInteraction(now.toISOString().slice(0, 16))
    }
  }, [isInteraction, dateInteraction])

  useEffect(() => {
    if (!prospectId) return
    setLoading(true)
    fetchNotes(prospectId)
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [prospectId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!contenu.trim()) return
    setSubmitting(true)
    try {
      const noteData = {
        prospect_id: prospectId,
        contenu: contenu.trim(),
        type_note: typeNote,
      }

      if (isInteraction) {
        noteData.date_interaction = dateInteraction
          ? new Date(dateInteraction).toISOString()
          : new Date().toISOString()
        if (resultat) noteData.resultat = resultat
      }

      const note = await createNote(noteData)
      setNotes(prev => [note, ...prev])

      // Auto-update prospect (date_derniere_interaction + compteur relances)
      if (isInteraction) {
        try {
          await updateProspectAfterInteraction(prospectId, typeNote, noteData.date_interaction)
          if (onProspectUpdate) onProspectUpdate()
        } catch (err) {
          console.error('Erreur mise à jour prospect:', err)
        }
      }

      // Reset form
      setContenu('')
      setTypeNote('appel')
      setResultat('')
      setDateInteraction('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateNote = async (noteId, newContenu) => {
    try {
      const updated = await updateNote(noteId, { contenu: newContenu })
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n))
    } catch (err) {
      console.error('Erreur mise à jour note:', err)
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      console.error('Erreur suppression note:', err)
    }
  }

  const handleSetRelance = async (dateStr) => {
    try {
      await updateProspect(prospectId, { date_relance: dateStr })
      if (onProspectUpdate) onProspectUpdate()
    } catch (err) {
      console.error('Erreur mise à jour relance:', err)
    }
  }

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getResultatLabel = (val) =>
    RESULTATS_INTERACTION.find(r => r.value === val)?.label || val

  return (
    <div>
      <h4 className="text-sm font-medium text-text-primary mb-3">Historique</h4>

      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        {/* Ligne 1 : type + bouton */}
        <div className="flex gap-2">
          <select
            value={typeNote}
            onChange={(e) => {
              setTypeNote(e.target.value)
              if (!TYPES_INTERACTION.includes(e.target.value)) {
                setResultat('')
                setDateInteraction('')
              } else if (!dateInteraction) {
                const now = new Date()
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                setDateInteraction(now.toISOString().slice(0, 16))
              }
            }}
            className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {TYPES_NOTE.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting || !contenu.trim()}
            className="bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
          >
            Ajouter
          </button>
        </div>

        {/* Ligne 2 : date + résultat (interactions uniquement) */}
        {isInteraction && (
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={dateInteraction}
              onChange={(e) => setDateInteraction(e.target.value)}
              className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary flex-1"
            />
            <select
              value={resultat}
              onChange={(e) => setResultat(e.target.value)}
              className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary flex-1"
            >
              {RESULTATS_INTERACTION.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder={isInteraction ? 'Notes sur l\'échange...' : 'Ajouter une note...'}
          rows={2}
          className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary resize-none"
        />
      </form>

      {loading ? (
        <p className="text-text-secondary text-sm">Chargement...</p>
      ) : notes.length === 0 ? (
        <p className="text-text-secondary text-sm">Aucune note pour le moment.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {notes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
              onSetRelance={handleSetRelance}
              formatDate={formatDate}
              getResultatLabel={getResultatLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Note individuelle avec edit/delete ---
function NoteItem({ note, onUpdate, onDelete, onSetRelance, formatDate, getResultatLabel }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(note.contenu)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const Icon = ICONS[note.type_note] || StickyNote
  const typeLabel = TYPES_NOTE.find(t => t.value === note.type_note)?.label || ''
  const displayDate = note.date_interaction || note.date_creation
  const resultatColor = RESULTAT_COLORS[note.resultat] || 'text-text-secondary'

  const handleSave = () => {
    if (editText.trim() && editText !== note.contenu) {
      onUpdate(note.id, editText.trim())
    }
    setEditing(false)
  }

  return (
    <div className="flex gap-3 text-sm group">
      <div className="mt-0.5 shrink-0">
        <Icon size={16} className="text-text-secondary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-text-secondary text-xs font-medium">{typeLabel}</span>
          <span className="text-text-secondary text-xs">
            {formatDate(displayDate)}
          </span>
          {note.resultat && (
            <span className={`text-xs font-medium ${resultatColor}`}>
              {getResultatLabel(note.resultat)}
            </span>
          )}
          {/* Actions edit/delete — visible au hover */}
          <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { setEditing(true); setEditText(note.contenu) }}
              className="p-0.5 rounded hover:bg-bg-hover transition-colors"
              title="Modifier"
            >
              <Pencil size={11} className="text-text-secondary hover:text-primary" />
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-0.5 rounded hover:bg-bg-hover transition-colors"
                title="Supprimer"
              >
                <Trash2 size={11} className="text-text-secondary hover:text-danger" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => { onDelete(note.id); setConfirmDelete(false) }}
                  className="p-0.5 rounded hover:bg-danger/20 transition-colors"
                  title="Confirmer"
                >
                  <Check size={11} className="text-danger" />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="p-0.5 rounded hover:bg-bg-hover transition-colors"
                  title="Annuler"
                >
                  <X size={11} className="text-text-secondary" />
                </button>
              </>
            )}
          </span>
        </div>

        {editing ? (
          <div className="space-y-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="w-full bg-bg-main border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-primary resize-none"
              autoFocus
            />
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded hover:bg-primary/30 transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="text-text-primary whitespace-pre-wrap break-words">
            {note.contenu}
          </p>
        )}

        {/* Bouton rapide "Planifier relance" si résultat = à rappeler */}
        {note.resultat === 'a_rappeler' && (
          <RelanceQuickAction onSetRelance={onSetRelance} />
        )}
      </div>
    </div>
  )
}

// Petit composant pour planifier une relance rapidement
function RelanceQuickAction({ onSetRelance }) {
  const [show, setShow] = useState(false)
  const [dateRelance, setDateRelance] = useState('')

  if (!show) {
    return (
      <button
        onClick={() => {
          // Pré-remplir à demain 10h
          const d = new Date()
          d.setDate(d.getDate() + 1)
          d.setHours(10, 0, 0, 0)
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
          setDateRelance(d.toISOString().slice(0, 16))
          setShow(true)
        }}
        className="mt-1 flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
      >
        <CalendarClock size={12} />
        Planifier relance
      </button>
    )
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="datetime-local"
        value={dateRelance}
        onChange={(e) => setDateRelance(e.target.value)}
        className="bg-bg-main border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
      />
      <button
        onClick={() => {
          if (dateRelance) {
            onSetRelance(new Date(dateRelance).toISOString())
            setShow(false)
          }
        }}
        className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded hover:bg-orange-500/30 transition-colors"
      >
        OK
      </button>
      <button
        onClick={() => setShow(false)}
        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        Annuler
      </button>
    </div>
  )
}
