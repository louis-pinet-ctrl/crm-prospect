import { useState, useEffect, useRef } from 'react'
import {
  CheckSquare, Square, Plus, Trash2, Calendar, User, Tag,
  ChevronDown, ChevronRight, X, Search,
} from 'lucide-react'
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../lib/supabase'
import { useToast } from '../components/Toast'

const CATEGORIES = [
  { value: 'appel', label: 'Appeler', color: '#f59e0b' },
  { value: 'email', label: 'Email à envoyer', color: '#3b82f6' },
  { value: 'dossier', label: 'Préparer dossier', color: '#8b5cf6' },
  { value: 'document', label: 'Document à envoyer', color: '#10b981' },
  { value: 'rdv', label: 'RDV à préparer', color: '#ec4899' },
  { value: 'facturation', label: 'Facturation', color: '#f97316' },
  { value: 'admin', label: 'Administratif', color: '#6b7280' },
  { value: 'autre', label: 'Autre', color: '#94a3b8' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

function getCategoryBadge(cat) {
  const c = CATEGORY_MAP[cat]
  if (!c) return null
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: c.color + '20', color: c.color }}
    >
      {c.label}
    </span>
  )
}

function isOverdue(echeance) {
  if (!echeance) return false
  return new Date(echeance) < new Date(new Date().toDateString())
}

function isToday(echeance) {
  if (!echeance) return false
  return echeance === new Date().toISOString().split('T')[0]
}

export default function TodosPage({ prospects, onSelectProspect }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [filterCat, setFilterCat] = useState(null)
  const toast = useToast()

  // Quick add state
  const [titre, setTitre] = useState('')
  const [categorie, setCategorie] = useState('')
  const [echeance, setEcheance] = useState('')
  const [prospectId, setProspectId] = useState(null)
  const [prospectNom, setProspectNom] = useState('')
  const [showProspectSearch, setShowProspectSearch] = useState(false)
  const [prospectQuery, setProspectQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => { loadTodos() }, [])

  const loadTodos = async () => {
    try {
      const data = await fetchTodos()
      setTodos(data)
    } catch (err) {
      console.error(err)
      toast.error('Erreur chargement des tâches')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!titre.trim()) return
    setSubmitting(true)
    try {
      const todo = await createTodo({
        titre: titre.trim(),
        categorie: categorie || null,
        echeance: echeance || null,
        prospect_id: prospectId,
        prospect_nom: prospectNom || null,
      })
      setTodos(prev => [todo, ...prev].sort(sortTodos))
      setTitre('')
      setCategorie('')
      setEcheance('')
      setProspectId(null)
      setProspectNom('')
      inputRef.current?.focus()
      toast.success('Tâche ajoutée')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (todo) => {
    try {
      const updated = await updateTodo(todo.id, { fait: !todo.fait })
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t).sort(sortTodos))
    } catch (err) {
      console.error(err)
      toast.error('Erreur')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTodo(id)
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Erreur suppression')
    }
  }

  // Sort: pending first, then by due date, then by creation
  function sortTodos(a, b) {
    if (a.fait !== b.fait) return a.fait ? 1 : -1
    if (a.echeance && b.echeance) return a.echeance.localeCompare(b.echeance)
    if (a.echeance) return -1
    if (b.echeance) return 1
    return (b.date_creation || '').localeCompare(a.date_creation || '')
  }

  const pendingTodos = todos.filter(t => !t.fait && (!filterCat || t.categorie === filterCat))
  const doneTodos = todos.filter(t => t.fait && (!filterCat || t.categorie === filterCat))
  const overdueTodos = pendingTodos.filter(t => isOverdue(t.echeance))
  const todayTodos = pendingTodos.filter(t => isToday(t.echeance))

  // Prospect search results
  const filteredProspects = prospectQuery.length >= 2
    ? (prospects || [])
        .filter(p =>
          p.nom?.toLowerCase().includes(prospectQuery.toLowerCase()) ||
          p.etablissement?.toLowerCase().includes(prospectQuery.toLowerCase())
        )
        .slice(0, 8)
    : []

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckSquare size={24} className="text-primary" />
          <h1 className="text-xl font-bold text-text-primary">To Do</h1>
          <span className="text-text-secondary text-sm">
            ({pendingTodos.length} en cours)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {overdueTodos.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-medium">
              {overdueTodos.length} en retard
            </span>
          )}
          {todayTodos.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary font-medium">
              {todayTodos.length} aujourd'hui
            </span>
          )}
        </div>
      </div>

      {/* Quick add form */}
      <form onSubmit={handleAdd} className="mb-6 bg-bg-card border border-border rounded-lg p-4">
        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Nouvelle tâche..."
            className="flex-1 bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={submitting || !titre.trim()}
            className="flex items-center gap-1.5 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Catégorie */}
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="bg-bg-main border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-primary"
          >
            <option value="">Catégorie...</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Échéance */}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-text-secondary" />
            <input
              type="date"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              className="bg-bg-main border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Lier un prospect */}
          <div className="relative">
            {prospectId ? (
              <button
                type="button"
                onClick={() => { setProspectId(null); setProspectNom('') }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
              >
                <User size={12} />
                {prospectNom}
                <X size={12} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setShowProspectSearch(!showProspectSearch); setTimeout(() => searchRef.current?.focus(), 50) }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-bg-main border border-border text-text-secondary hover:border-primary transition-colors"
              >
                <User size={12} />
                Lier un prospect
              </button>
            )}
            {showProspectSearch && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <div className="flex items-center gap-2 bg-bg-main border border-border rounded-lg px-2.5 py-1.5">
                    <Search size={12} className="text-text-secondary" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={prospectQuery}
                      onChange={(e) => setProspectQuery(e.target.value)}
                      placeholder="Chercher un prospect..."
                      className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredProspects.length === 0 ? (
                    <p className="text-text-secondary text-xs p-3">
                      {prospectQuery.length < 2 ? 'Tapez 2 caractères...' : 'Aucun résultat'}
                    </p>
                  ) : (
                    filteredProspects.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProspectId(p.id)
                          setProspectNom(p.nom + (p.etablissement ? ` (${p.etablissement})` : ''))
                          setShowProspectSearch(false)
                          setProspectQuery('')
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-bg-hover transition-colors"
                      >
                        <span className="text-text-primary font-medium">{p.nom}</span>
                        {p.etablissement && (
                          <span className="text-text-secondary ml-1.5">— {p.etablissement}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button
          onClick={() => setFilterCat(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            !filterCat ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary/50'
          }`}
        >
          Toutes
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilterCat(filterCat === c.value ? null : c.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterCat === c.value ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary/50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Todo list */}
      {loading ? (
        <p className="text-text-secondary text-sm">Chargement...</p>
      ) : pendingTodos.length === 0 && doneTodos.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare size={48} className="text-text-secondary/30 mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Aucune tâche. Ajoutez votre première tâche ci-dessus.</p>
        </div>
      ) : (
        <>
          {/* Pending todos */}
          <div className="space-y-1.5 mb-4">
            {pendingTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onSelectProspect={onSelectProspect}
                prospects={prospects}
              />
            ))}
          </div>

          {/* Done todos */}
          {doneTodos.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-text-secondary text-sm mb-2 hover:text-text-primary transition-colors"
              >
                {showDone ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Terminées ({doneTodos.length})
              </button>
              {showDone && (
                <div className="space-y-1.5">
                  {doneTodos.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onSelectProspect={onSelectProspect}
                      prospects={prospects}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TodoItem({ todo, onToggle, onDelete, onSelectProspect, prospects }) {
  const overdue = !todo.fait && isOverdue(todo.echeance)
  const today = !todo.fait && isToday(todo.echeance)

  const handleProspectClick = () => {
    if (!todo.prospect_id || !onSelectProspect || !prospects) return
    const p = prospects.find(pr => pr.id === todo.prospect_id)
    if (p) onSelectProspect(p)
  }

  return (
    <div className={`flex items-start gap-3 bg-bg-card border rounded-lg px-3.5 py-2.5 group transition-colors ${
      todo.fait ? 'border-border/50 opacity-60' : overdue ? 'border-red-500/30' : 'border-border'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        className="mt-0.5 shrink-0 text-text-secondary hover:text-primary transition-colors"
      >
        {todo.fait ? (
          <CheckSquare size={18} className="text-primary" />
        ) : (
          <Square size={18} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${todo.fait ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
          {todo.titre}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {getCategoryBadge(todo.categorie)}
          {todo.echeance && (
            <span className={`text-[10px] flex items-center gap-1 ${
              overdue ? 'text-red-400 font-medium' : today ? 'text-primary font-medium' : 'text-text-secondary'
            }`}>
              <Calendar size={10} />
              {overdue ? 'En retard — ' : today ? "Aujourd'hui — " : ''}
              {new Date(todo.echeance).toLocaleDateString('fr-FR')}
            </span>
          )}
          {todo.prospect_nom && (
            <button
              onClick={handleProspectClick}
              className="text-[10px] flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
            >
              <User size={10} />
              {todo.prospect_nom}
            </button>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className="shrink-0 p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
