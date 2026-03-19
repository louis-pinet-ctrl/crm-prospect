import { useState, useEffect } from 'react'
import { Phone, Mail, Calendar, FileText, StickyNote } from 'lucide-react'
import { fetchNotes, createNote } from '../lib/supabase'
import { TYPES_NOTE } from '../lib/constants'

const ICONS = {
  appel: Phone,
  email: Mail,
  rdv: Calendar,
  courrier: FileText,
  note_libre: StickyNote,
}

export default function NotesSection({ prospectId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [contenu, setContenu] = useState('')
  const [typeNote, setTypeNote] = useState('note_libre')
  const [submitting, setSubmitting] = useState(false)

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
      const note = await createNote({
        prospect_id: prospectId,
        contenu: contenu.trim(),
        type_note: typeNote,
      })
      setNotes(prev => [note, ...prev])
      setContenu('')
      setTypeNote('note_libre')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
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

  return (
    <div>
      <h4 className="text-sm font-medium text-text-primary mb-3">Historique</h4>

      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <select
            value={typeNote}
            onChange={(e) => setTypeNote(e.target.value)}
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
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Ajouter une note..."
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
          {notes.map(note => {
            const Icon = ICONS[note.type_note] || StickyNote
            const typeLabel = TYPES_NOTE.find(t => t.value === note.type_note)?.label || ''
            return (
              <div key={note.id} className="flex gap-3 text-sm">
                <div className="mt-0.5 shrink-0">
                  <Icon size={16} className="text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-text-secondary text-xs">{typeLabel}</span>
                    <span className="text-text-secondary text-xs">
                      {formatDate(note.date_creation)}
                    </span>
                  </div>
                  <p className="text-text-primary whitespace-pre-wrap break-words">
                    {note.contenu}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
