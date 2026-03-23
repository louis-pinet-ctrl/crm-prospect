import { useState, useMemo } from 'react'
import { Plus, Search, ArrowUpDown, AlertCircle, CheckSquare, Square, Mail, MessageCircle, CalendarPlus, X } from 'lucide-react'
import RelancesWidget from '../components/RelancesWidget'
import { ScoreBadge } from '../components/ScoreBadge'
import { calculateScore } from '../lib/scoring'
import { generateRelanceTemplates } from '../lib/relanceTemplates'
import { createNote, updateProspectAfterInteraction, updateProspect } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  STATUTS,
  TYPES_DOSSIER,
  SOURCES,
  PRIORITES,
  formatCurrency,
  getTypeDossierLabel,
  getTypeDossierColor,
  isRelanceOverdue,
  getDateRelanceParStatut,
} from '../lib/constants'

export default function ListPage({
  prospects,
  loading,
  onSelectProspect,
  onAddProspect,
  reload,
}) {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortField, setSortField] = useState('date_creation')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(new Set())
  const [batchSending, setBatchSending] = useState(false)

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...prospects]

    const q = search.toLowerCase()
    if (q) {
      result = result.filter(
        p =>
          p.nom?.toLowerCase().includes(q) ||
          p.etablissement?.toLowerCase().includes(q) ||
          p.ville?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
      )
    }
    if (filterStatut) result = result.filter(p => p.statut === filterStatut)
    if (filterType) result = result.filter(p => p.type_dossier === filterType)

    result.sort((a, b) => {
      let va = a[sortField]
      let vb = b[sortField]
      if (typeof va === 'string') va = va?.toLowerCase() || ''
      if (typeof vb === 'string') vb = vb?.toLowerCase() || ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [prospects, search, filterStatut, filterType, sortField, sortDir])

  const getLabel = (list, value) =>
    list.find(i => i.value === value)?.label || value

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(p => p.id)))
    }
  }

  const selectedProspects = filtered.filter(p => selected.has(p.id))

  // Batch : envoyer email à tous les sélectionnés
  const handleBatchEmail = async () => {
    const withEmail = selectedProspects.filter(p => p.email && generateRelanceTemplates(p))
    if (withEmail.length === 0) {
      toast.error('Aucun prospect sélectionné n\'a d\'email ou de template disponible')
      return
    }

    setBatchSending(true)
    let sent = 0
    for (const p of withEmail) {
      const templates = generateRelanceTemplates(p)
      if (!templates) continue
      try {
        await createNote({
          prospect_id: p.id,
          contenu: `Email envoyé (batch)\n---\nObjet : ${templates.email.subject}\n\n${templates.email.body}`,
          type_note: 'email',
          date_interaction: new Date().toISOString(),
          resultat: 'message_laisse',
        })
        await updateProspectAfterInteraction(p.id, 'email', new Date().toISOString())
        sent++
      } catch (err) {
        console.error(`Erreur batch email ${p.nom}:`, err)
      }
    }

    // Ouvrir le client mail pour le premier (les autres sont logués)
    if (withEmail.length === 1) {
      const p = withEmail[0]
      const t = generateRelanceTemplates(p)
      if (t) {
        window.location.href = `mailto:${p.email}?subject=${encodeURIComponent(t.email.subject)}&body=${encodeURIComponent(t.email.body)}`
      }
    }

    setBatchSending(false)
    setSelected(new Set())
    if (reload) reload()
    toast.success(`${sent} email${sent > 1 ? 's' : ''} logué${sent > 1 ? 's' : ''} avec template personnalisé`)
  }

  // Batch : envoyer WhatsApp à tous les sélectionnés
  const handleBatchWhatsApp = async () => {
    const withPhone = selectedProspects.filter(p => p.telephone && generateRelanceTemplates(p))
    if (withPhone.length === 0) {
      toast.error('Aucun prospect sélectionné n\'a de téléphone ou de template disponible')
      return
    }

    setBatchSending(true)
    let sent = 0
    for (const p of withPhone) {
      const templates = generateRelanceTemplates(p)
      if (!templates) continue
      try {
        await createNote({
          prospect_id: p.id,
          contenu: `Message WhatsApp envoyé (batch)\n---\n${templates.whatsapp}`,
          type_note: 'whatsapp',
          date_interaction: new Date().toISOString(),
          resultat: 'message_laisse',
        })
        await updateProspectAfterInteraction(p.id, 'whatsapp', new Date().toISOString())
        sent++
      } catch (err) {
        console.error(`Erreur batch WhatsApp ${p.nom}:`, err)
      }
    }

    // Ouvrir WhatsApp pour le premier
    if (withPhone.length === 1) {
      const p = withPhone[0]
      const t = generateRelanceTemplates(p)
      if (t) {
        const digits = p.telephone.replace(/[\s./-]/g, '')
        const num = digits.startsWith('0') && digits.length === 10
          ? `33${digits.slice(1)}`
          : digits.startsWith('+33') || digits.startsWith('33')
            ? digits.replace('+', '')
            : digits
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(t.whatsapp)}`, '_blank')
      }
    }

    setBatchSending(false)
    setSelected(new Set())
    if (reload) reload()
    toast.success(`${sent} WhatsApp logué${sent > 1 ? 's' : ''} avec template personnalisé`)
  }

  // Batch : planifier relance
  const handleBatchPlanRelance = async () => {
    setBatchSending(true)
    let planned = 0
    for (const p of selectedProspects) {
      const dateRelance = getDateRelanceParStatut(p.statut) || (() => {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        return d.toISOString().split('T')[0]
      })()
      try {
        await updateProspect(p.id, { date_relance: dateRelance })
        planned++
      } catch (err) {
        console.error(`Erreur batch plan ${p.nom}:`, err)
      }
    }
    setBatchSending(false)
    setSelected(new Set())
    if (reload) reload()
    toast.success(`${planned} relance${planned > 1 ? 's' : ''} planifiée${planned > 1 ? 's' : ''}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Chargement...</p>
      </div>
    )
  }

  const sortHeader = (field, label) => (
    <th
      key={field}
      className="text-left text-xs font-medium text-text-secondary px-4 py-3 cursor-pointer hover:text-text-primary select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <ArrowUpDown size={12} className="text-primary" />
        )}
      </span>
    </th>
  )

  return (
    <div className="p-6 space-y-4">
      {/* Relances widget */}
      <RelancesWidget prospects={prospects} onSelectProspect={onSelectProspect} onReload={reload} />

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleBatchEmail}
              disabled={batchSending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors font-medium disabled:opacity-50"
            >
              <Mail size={13} />
              Relancer par email
            </button>
            <button
              onClick={handleBatchWhatsApp}
              disabled={batchSending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium disabled:opacity-50"
            >
              <MessageCircle size={13} />
              Relancer par WhatsApp
            </button>
            <button
              onClick={handleBatchPlanRelance}
              disabled={batchSending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium disabled:opacity-50"
            >
              <CalendarPlus size={13} />
              Planifier relances
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
              title="Désélectionner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-text-primary mr-auto">
          Liste des prospects
        </h2>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bg-main border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary w-48"
          />
        </div>

        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Tous les types</option>
          {TYPES_DOSSIER.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={onAddProspect}
          className="flex items-center gap-2 bg-primary text-bg-main font-medium px-4 py-2 rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Prospect</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="border-b border-border">
            <tr>
              <th className="px-3 py-3 w-10">
                <button onClick={toggleSelectAll} className="text-text-secondary hover:text-primary transition-colors">
                  {selected.size === filtered.length && filtered.length > 0
                    ? <CheckSquare size={16} className="text-primary" />
                    : <Square size={16} />
                  }
                </button>
              </th>
              {sortHeader('nom', 'Nom')}
              {sortHeader('etablissement', 'Établissement')}
              {sortHeader('ville', 'Ville')}
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Statut</th>
              {sortHeader('ca_estime', 'CA estimé')}
              {sortHeader('date_relance', 'Relance')}
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Priorité</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-text-secondary text-sm">
                  Aucun prospect trouvé
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const overdue = isRelanceOverdue(p.date_relance)
                const isSelected = selected.has(p.id)
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProspect(p)}
                    className={`border-b border-border/50 hover:bg-bg-hover cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => toggleSelect(p.id, e)}
                        className="text-text-secondary hover:text-primary transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare size={16} className="text-primary" />
                          : <Square size={16} />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {p.nom}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {p.etablissement || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {p.ville || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: getTypeDossierColor(p.type_dossier) + '25',
                          color: getTypeDossierColor(p.type_dossier),
                        }}
                      >
                        {getTypeDossierLabel(p.type_dossier)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {getLabel(STATUTS, p.statut)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {formatCurrency(p.ca_estime)}
                    </td>
                    <td className="px-4 py-3">
                      {p.date_relance ? (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-warning' : 'text-text-secondary'}`}>
                          {overdue && <AlertCircle size={12} />}
                          {new Date(p.date_relance).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs"
                        style={{
                          color: PRIORITES.find(pr => pr.value === p.priorite)?.color,
                        }}
                      >
                        {getLabel(PRIORITES, p.priorite)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={calculateScore(p).total} size="xs" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-secondary">
        {filtered.length} prospect{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
