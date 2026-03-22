export const STATUTS = [
  { value: 'prospect_identifie', label: 'Prospect identifié', order: 1 },
  { value: 'premier_contact', label: 'Premier contact', order: 2 },
  { value: 'diagnostic_rdv', label: 'Diagnostic / RDV', order: 3 },
  { value: 'relance_en_attente', label: 'Relance en attente', order: 4 },
  { value: 'lettre_mission_envoyee', label: 'Lettre de mission envoyée', order: 5 },
  { value: 'mission_en_cours', label: 'Mission en cours', order: 6 },
  { value: 'facture', label: 'Facturé', order: 7 },
  { value: 'cloture', label: 'Clôturé', order: 8 },
  { value: 'perdu_refuse', label: 'Perdu / Refusé', order: 9 },
  { value: 'prescripteur', label: 'Prescripteur', order: 10 },
  { value: 'suivi_long_terme', label: 'Suivi long terme', order: 11 },
]

export const TUNNELS = [
  {
    id: 'prospection',
    label: 'Prospection',
    description: 'Premiers échanges avec le prospect',
    color: '#3b82f6',
    statuts: ['prospect_identifie', 'premier_contact', 'diagnostic_rdv'],
  },
  {
    id: 'closing',
    label: 'Closing',
    description: 'Du deal qualifié à la signature',
    color: '#8b5cf6',
    statuts: ['relance_en_attente', 'lettre_mission_envoyee', 'mission_en_cours', 'facture'],
  },
  {
    id: 'suivi',
    label: 'Suivi & Prescripteurs',
    description: 'Suivi long terme, prescripteurs à relancer trimestriellement',
    color: '#f59e0b',
    statuts: ['cloture', 'perdu_refuse', 'prescripteur', 'suivi_long_terme'],
  },
]

export const TYPES_PRESCRIPTEUR = [
  { value: 'expert_comptable', label: 'Expert-comptable' },
  { value: 'notaire', label: 'Notaire' },
  { value: 'agent_immobilier', label: 'Agent immobilier' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'banquier', label: 'Banquier' },
  { value: 'courtier', label: 'Courtier' },
  { value: 'autre', label: 'Autre' },
]

export const SUIVI_STATUTS = ['cloture', 'perdu_refuse', 'prescripteur', 'suivi_long_terme']

export const DELAI_RELANCE_SUIVI_JOURS = 90

export const TYPES_DOSSIER = [
  { value: 'cession_fonds', label: 'Cession de fonds de commerce', color: '#8b5cf6' },
  { value: 'cession_droit_bail', label: 'Cession de droit au bail', color: '#6366f1' },
  { value: 'bail_nu', label: 'Bail nu', color: '#3b82f6' },
  { value: 'franchise', label: 'Franchise', color: '#ec4899' },
  { value: 'liquidation', label: 'Liquidation', color: '#ef4444' },
  { value: 'contentieux', label: 'Contentieux', color: '#f97316' },
  { value: 'autre', label: 'Autre', color: '#6b7280' },
]

export const SEUIL_MINIMUM_CESSION_FONDS = 2000

export const SOURCES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'site_web', label: 'Site web' },
  { value: 'simulateur_precession', label: 'Simulateur pré-cession' },
  { value: 'diaglocal', label: 'DiagLocal' },
  { value: 'recommandation', label: 'Recommandation' },
  { value: 'autre', label: 'Autre' },
]

export const PRIORITES = [
  { value: 'haute', label: 'Haute', color: '#ff4d4d' },
  { value: 'moyenne', label: 'Moyenne', color: '#ffb84d' },
  { value: 'basse', label: 'Basse', color: '#4dff88' },
]

export const TYPES_NOTE = [
  { value: 'appel', label: 'Appel', icon: 'Phone' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
  { value: 'rdv', label: 'RDV', icon: 'Calendar' },
  { value: 'courrier', label: 'Courrier', icon: 'FileText' },
  { value: 'note_libre', label: 'Note libre', icon: 'StickyNote' },
]

// Types qui correspondent à une interaction (vs note libre)
export const TYPES_INTERACTION = ['appel', 'email', 'whatsapp', 'rdv']

// Types qui comptent comme une relance
export const TYPES_RELANCE = ['appel', 'email', 'whatsapp']

export const RESULTATS_INTERACTION = [
  { value: '', label: '— Résultat —' },
  { value: 'pas_de_reponse', label: 'Pas de réponse' },
  { value: 'message_laisse', label: 'Message laissé' },
  { value: 'interesse', label: 'Intéressé' },
  { value: 'a_rappeler', label: 'À rappeler' },
  { value: 'rdv_pris', label: 'RDV pris' },
  { value: 'refus', label: 'Refus' },
  { value: 'info_envoyee', label: 'Info envoyée' },
]

export const INTENTIONS = [
  { value: '', label: '— Inconnu —' },
  { value: 'cedant', label: 'Cédant', color: '#f97316', icon: 'ArrowUpRight' },
  { value: 'acquereur', label: 'Acquéreur', color: '#3b82f6', icon: 'ArrowDownLeft' },
  { value: 'les_deux', label: 'Cédant + Acquéreur', color: '#8b5cf6', icon: 'ArrowLeftRight' },
]

export const MODES_HONORAIRES = [
  { value: 'pourcentage', label: 'Pourcentage' },
  { value: 'forfait', label: 'Forfait' },
]

export const PROFILS_RESTAURATEUR = [
  { value: 'primo_accedant', label: 'Primo-accédant' },
  { value: 'proprietaire_unique', label: 'Propriétaire (1 resto)' },
  { value: 'multi_etablissements', label: 'Groupe / Multi-établissements' },
]

export const TYPES_CUISINE = [
  { value: 'traditionnelle', label: 'Traditionnelle' },
  { value: 'gastronomique', label: 'Gastronomique' },
  { value: 'bistronomique', label: 'Bistronomique' },
  { value: 'brasserie', label: 'Brasserie' },
  { value: 'fast_food', label: 'Fast-food / Snack' },
  { value: 'pizzeria', label: 'Pizzeria' },
  { value: 'asiatique', label: 'Asiatique' },
  { value: 'italien', label: 'Italien' },
  { value: 'bar_restaurant', label: 'Bar-restaurant' },
  { value: 'traiteur', label: 'Traiteur' },
  { value: 'dark_kitchen', label: 'Dark kitchen' },
  { value: 'autre', label: 'Autre' },
]

export const STAGE_PROBABILITY = {
  prospect_identifie: 0.05,
  premier_contact: 0.15,
  diagnostic_rdv: 0.30,
  relance_en_attente: 0.25,
  lettre_mission_envoyee: 0.60,
  mission_en_cours: 0.90,
  facture: 1.0,
  cloture: 1.0,
  perdu_refuse: 0,
  prescripteur: 0,
  suivi_long_terme: 0.10,
}

export function getDateRelanceSuivi() {
  const date = new Date()
  date.setDate(date.getDate() + DELAI_RELANCE_SUIVI_JOURS)
  return date.toISOString().split('T')[0]
}

export function getTypePrescripteurLabel(type) {
  return TYPES_PRESCRIPTEUR.find(t => t.value === type)?.label || type || ''
}

export const CA_OBJECTIFS = [
  { key: 'minimum', label: 'Objectif minimum', amount: 115000, color: '#f97316' },
  { key: 'classique', label: 'Objectif classique', amount: 150000, color: '#c4e913' },
  { key: 'ambitieux', label: 'Objectif ambitieux', amount: 200000, color: '#4dff88' },
]

export const CA_OBJECTIF = CA_OBJECTIFS[CA_OBJECTIFS.length - 1].amount

// Objectifs dérivés par période (basés sur l'objectif classique)
export function getObjectifPeriode(period) {
  const classique = CA_OBJECTIFS.find(o => o.key === 'classique')?.amount || 150000
  switch (period) {
    case 'month': return Math.round(classique / 12)
    case 'quarter': return Math.round(classique / 4)
    default: return classique
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function getTypeDossierColor(type) {
  return TYPES_DOSSIER.find(t => t.value === type)?.color || '#6b7280'
}

export function getTypeDossierLabel(type) {
  return TYPES_DOSSIER.find(t => t.value === type)?.label || type
}

export function isRelanceOverdue(dateRelance) {
  if (!dateRelance) return false
  return new Date(dateRelance) <= new Date(new Date().toDateString())
}

// Seuil de jours sans interaction pour considérer un prospect comme dormant
export const SEUIL_DORMANT_JOURS = 14
