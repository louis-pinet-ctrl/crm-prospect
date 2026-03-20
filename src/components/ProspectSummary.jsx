import { useState, useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { fetchNotes } from '../lib/supabase'
import {
  STATUTS,
  TYPES_DOSSIER,
  TYPES_CUISINE,
  SOURCES,
  RESULTATS_INTERACTION,
  formatCurrency,
  isRelanceOverdue,
} from '../lib/constants'

function getLabel(list, value) {
  return list.find(i => i.value === value)?.label || value || ''
}

export default function ProspectSummary({ prospect }) {
  const [notes, setNotes] = useState([])

  useEffect(() => {
    if (!prospect?.id) return
    fetchNotes(prospect.id).then(setNotes).catch(() => {})
  }, [prospect?.id])

  const summary = useMemo(() => {
    if (!prospect) return ''

    const parts = []

    // 1. Qui c'est
    const type = getLabel(TYPES_DOSSIER, prospect.type_dossier)
    const cuisine = prospect.type_cuisine ? getLabel(TYPES_CUISINE, prospect.type_cuisine) : ''
    const source = getLabel(SOURCES, prospect.source)

    let who = ''
    if (cuisine) {
      who = `${type} ${cuisine.toLowerCase()}`
    } else {
      who = type
    }
    if (prospect.etablissement) {
      who += ` (${prospect.etablissement})`
    }
    parts.push(who)

    // 2. Chiffres clés
    const chiffres = []
    if (prospect.ca_annuel_declare) {
      chiffres.push(`CA ${formatCurrency(prospect.ca_annuel_declare)}`)
    }
    if (prospect.simulateur_estimation) {
      chiffres.push(`valo ${formatCurrency(prospect.simulateur_estimation)}`)
    }
    if (prospect.ca_estime > 0) {
      chiffres.push(`honoraires ${formatCurrency(prospect.ca_estime)}`)
    }
    if (prospect.nombre_salaries != null) {
      chiffres.push(`${prospect.nombre_salaries} sal.`)
    }
    if (chiffres.length > 0) parts.push(chiffres.join(', '))

    // 3. Interactions
    const interactions = notes.filter(n =>
      ['appel', 'email', 'whatsapp', 'rdv'].includes(n.type_note)
    )
    if (interactions.length > 0) {
      const lastInteraction = interactions[0] // already sorted desc
      const lastResultat = lastInteraction.resultat
        ? RESULTATS_INTERACTION.find(r => r.value === lastInteraction.resultat)?.label?.toLowerCase()
        : null

      const interactionText = `${interactions.length} interaction${interactions.length > 1 ? 's' : ''}`
      if (lastResultat) {
        parts.push(`${interactionText}, dernier retour : ${lastResultat}`)
      } else {
        parts.push(interactionText)
      }
    } else {
      parts.push('aucune interaction')
    }

    // 4. Relance
    if (prospect.date_relance) {
      const d = new Date(prospect.date_relance).toLocaleDateString('fr-FR')
      if (isRelanceOverdue(prospect.date_relance)) {
        parts.push(`relance en retard (${d})`)
      } else {
        parts.push(`relance le ${d}`)
      }
    }

    // 5. Source
    parts.push(`via ${source}`)

    // 6. Stade
    const statut = getLabel(STATUTS, prospect.statut)
    parts.push(`stade : ${statut}`)

    return parts.join(' — ')
  }, [prospect, notes])

  if (!summary) return null

  return (
    <div className="flex gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
      <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
      <p className="text-xs text-text-primary leading-relaxed">{summary}</p>
    </div>
  )
}
