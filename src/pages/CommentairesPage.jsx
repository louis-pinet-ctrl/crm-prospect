import { useState, useEffect } from 'react'
import { Trash2, Plus, MessageSquare } from 'lucide-react'
import { fetchCommentaires, createCommentaire, deleteCommentaire } from '../lib/supabase'

export default function CommentairesPage() {
  const [commentaires, setCommentaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [contenu, setContenu] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCommentaires()
  }, [])

  const loadCommentaires = async () => {
    try {
      const data = await fetchCommentaires()
      setCommentaires(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!contenu.trim()) return
    setSubmitting(true)
    try {
      const c = await createCommentaire(contenu.trim())
      setCommentaires(prev => [c, ...prev])
      setContenu('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCommentaire(id)
      setCommentaires(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={24} className="text-primary" />
        <h1 className="text-xl font-bold text-text-primary">Commentaires</h1>
        <span className="text-text-secondary text-sm">({commentaires.length})</span>
      </div>

      <form onSubmit={handleAdd} className="mb-6">
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Ajouter un commentaire..."
          rows={3}
          className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary resize-none mb-2"
        />
        <button
          type="submit"
          disabled={submitting || !contenu.trim()}
          className="flex items-center gap-2 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </form>

      {loading ? (
        <p className="text-text-secondary text-sm">Chargement...</p>
      ) : commentaires.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={48} className="text-text-secondary/30 mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Aucun commentaire pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commentaires.map(c => (
            <div
              key={c.id}
              className="bg-bg-card border border-border rounded-lg p-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-text-primary text-sm whitespace-pre-wrap break-words flex-1">
                  {c.contenu}
                </p>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-text-secondary text-xs mt-2">
                {formatDate(c.date_creation)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
