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
]

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
  { value: 'rdv', label: 'RDV', icon: 'Calendar' },
  { value: 'courrier', label: 'Courrier', icon: 'FileText' },
  { value: 'note_libre', label: 'Note libre', icon: 'StickyNote' },
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

export const CA_OBJECTIF = 300000

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
