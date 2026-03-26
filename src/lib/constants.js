export const STATUTS = [
  { value: 'lead_simulateur', label: 'Lead simulateur', order: 0, tooltip: 'Nouveau lead entrant via le simulateur — à contacter rapidement' },
  { value: 'prospect_identifie', label: 'Prospect identifié', order: 1, tooltip: 'Prospect repéré mais pas encore contacté' },
  { value: 'premier_contact', label: 'Premier contact', order: 2, tooltip: 'Premier échange réalisé — qualifier le besoin' },
  { value: 'diagnostic_rdv', label: 'Diagnostic / RDV', order: 3, tooltip: 'RDV fixé ou diagnostic en cours pour évaluer le dossier' },
  { value: 'relance_en_attente', label: 'Deal qualifié', order: 4, tooltip: 'Le besoin est confirmé — prêt à avancer vers une proposition' },
  { value: 'deal_maturation', label: 'Deal en maturation', order: 5, tooltip: 'Deal confirmé mais pas immédiat — à suivre régulièrement sans forcer' },
  { value: 'lettre_mission_envoyee', label: 'Lettre de mission envoyée', order: 6, tooltip: 'Proposition envoyée — en attente de retour du client' },
  { value: 'negociation', label: 'Négociation', order: 7, tooltip: 'Discussion en cours sur le périmètre ou les honoraires' },
  { value: 'mission_en_cours', label: 'Mission en cours', order: 8, tooltip: 'Mission signée et travail en cours' },
  { value: 'facture', label: 'Facturé', order: 9, tooltip: 'Mission terminée et facturée' },
  { value: 'cloture', label: 'Clôturé', order: 10, tooltip: 'Dossier terminé — rien à relancer pour le moment' },
  { value: 'perdu_refuse', label: 'Perdu / Refusé', order: 11, tooltip: 'Le prospect a décliné ou ne donne plus suite' },
  { value: 'prescripteur_a_activer', label: 'Prescripteur à activer', order: 12, tooltip: 'Nouveau prescripteur identifié — créer la relation et obtenir un premier deal' },
  { value: 'prescripteur', label: 'Prescripteur actif', order: 13, tooltip: 'Prescripteur qui apporte régulièrement des dossiers — entretenir la relation' },
  { value: 'suivi_long_terme', label: 'Suivi long terme', order: 14, tooltip: 'Pas de besoin immédiat — garder le contact pour plus tard' },
]

export const TUNNELS = [
  {
    id: 'prospection',
    label: 'Prospection',
    description: 'Premiers échanges avec le prospect',
    color: '#3b82f6',
    statuts: ['lead_simulateur', 'prospect_identifie', 'premier_contact', 'diagnostic_rdv'],
  },
  {
    id: 'closing',
    label: 'Closing',
    description: 'Du deal qualifié à la signature',
    color: '#8b5cf6',
    statuts: ['relance_en_attente', 'deal_maturation', 'lettre_mission_envoyee', 'negociation', 'mission_en_cours'],
  },
  {
    id: 'prescripteurs',
    label: 'Prescripteurs',
    description: 'Réseau d\'apporteurs d\'affaires à entretenir',
    color: '#f59e0b',
    statuts: ['prescripteur_a_activer', 'prescripteur'],
  },
  {
    id: 'suivi',
    label: 'Terminés / Suivi',
    description: 'Dossiers terminés et prospects en veille',
    color: '#6b7280',
    statuts: ['facture', 'cloture', 'perdu_refuse', 'suivi_long_terme'],
  },
]

export const TYPES_PRESCRIPTEUR = [
  { value: 'expert_comptable', label: 'Expert-comptable' },
  { value: 'notaire', label: 'Notaire' },
  { value: 'agent_immobilier', label: 'Agent immobilier' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'banquier', label: 'Banquier' },
  { value: 'courtier', label: 'Courtier' },
  { value: 'courtier_fonds', label: 'Courtier en fonds de commerce' },
  { value: 'conseil_cession', label: 'Conseil en cession / transmission' },
  { value: 'syndic', label: 'Syndic / Administrateur judiciaire' },
  { value: 'autre', label: 'Autre' },
]

export const SUIVI_STATUTS = ['facture', 'cloture', 'perdu_refuse', 'suivi_long_terme']
export const PRESCRIPTEUR_STATUTS = ['prescripteur_a_activer', 'prescripteur']

export const DELAI_RELANCE_SUIVI_JOURS = 90

// Délais de relance automatique par statut (en jours)
export const DELAIS_RELANCE_PAR_STATUT = {
  lead_simulateur: 0,         // Contacter immédiatement (sous 2h idéalement)
  prospect_identifie: 3,      // Relancer rapidement un prospect froid
  premier_contact: 7,         // Laisser le temps de réfléchir
  diagnostic_rdv: 5,          // Suivi post-RDV assez rapide
  relance_en_attente: 14,     // Deal qualifié — relance standard
  deal_maturation: 30,        // Deal en maturation — relance mensuelle
  lettre_mission_envoyee: 7,  // Suivi lettre de mission
  negociation: 5,             // Négociation — suivi rapide
  prescripteur_a_activer: 30,  // Mensuel — créer la relation
  prescripteur: 60,            // Bi-mensuel — entretenir la relation
  suivi_long_terme: 90,        // Trimestriel
}

/**
 * Calcule la prochaine date de relance en fonction du statut.
 * Retourne une date ISO string (YYYY-MM-DD) ou null.
 */
/**
 * Calcule la prochaine date de relance en fonction du statut.
 * Retourne une date ISO string (YYYY-MM-DD) ou null.
 */
export function getDateRelanceParStatut(statut) {
  const delai = DELAIS_RELANCE_PAR_STATUT[statut]
  if (delai == null) return null
  const date = new Date()
  date.setDate(date.getDate() + delai)
  return date.toISOString().split('T')[0]
}

// Délais de replanification selon le résultat de la relance (en jours)
// null = pas de replanification auto
export const DELAIS_PAR_RESULTAT = {
  pas_de_reponse: 7,       // Réessayer dans 1 semaine
  message_laisse: 5,       // Suivi du message dans 5 jours
  interesse: 3,            // Battre le fer tant qu'il est chaud
  a_rappeler: 2,           // Rappel rapide
  rdv_pris: null,          // RDV pris, pas de relance auto
  refus: null,             // Refus, pas de relance
  info_envoyee: 7,         // Suivi info dans 1 semaine
}

/**
 * Calcule la prochaine date de relance selon le résultat d'une interaction.
 * Retourne une date ISO string ou null si pas de replanification.
 */
export function getDateRelanceParResultat(resultat) {
  const delai = DELAIS_PAR_RESULTAT[resultat]
  if (delai == null) return null
  const date = new Date()
  date.setDate(date.getDate() + delai)
  return date.toISOString().split('T')[0]
}

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
  lead_simulateur: 0.03,
  prospect_identifie: 0.05,
  premier_contact: 0.15,
  diagnostic_rdv: 0.30,
  relance_en_attente: 0.25,
  deal_maturation: 0.20,
  lettre_mission_envoyee: 0.60,
  negociation: 0.70,
  mission_en_cours: 0.90,
  facture: 1.0,
  cloture: 1.0,
  perdu_refuse: 0,
  prescripteur_a_activer: 0,
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

// Templates d'étapes par type de dossier (pour la gestion des dossiers clients)
export const DOSSIER_TEMPLATES = {
  cession_fonds: {
    label: 'Cession de fonds de commerce',
    etapes: [
      { nom: 'Avant-contrat', description: 'LOI, collecte de documents, due diligence' },
      { nom: 'Promesse sous conditions', description: 'Rédaction de la promesse, conditions suspensives' },
      { nom: 'Période intermédiaire', description: 'Levée des conditions suspensives, obtention des autorisations' },
      { nom: 'Signature', description: 'Signature de l\'acte définitif' },
      { nom: 'Formalités', description: 'Enregistrement, publications légales, transferts' },
    ],
  },
  cession_droit_bail: {
    label: 'Cession de droit au bail',
    etapes: [
      { nom: 'Avant-contrat', description: 'Analyse du bail, collecte de documents' },
      { nom: 'Accord du bailleur', description: 'Notification au bailleur, obtention de l\'agrément' },
      { nom: 'Rédaction de l\'acte', description: 'Rédaction de l\'acte de cession' },
      { nom: 'Signature', description: 'Signature de l\'acte de cession' },
      { nom: 'Formalités', description: 'Signification, enregistrement' },
    ],
  },
  bail_nu: {
    label: 'Bail nu',
    etapes: [
      { nom: 'Négociation', description: 'Conditions du bail, loyer, durée' },
      { nom: 'Rédaction du bail', description: 'Rédaction du contrat de bail commercial' },
      { nom: 'Signature', description: 'Signature du bail' },
      { nom: 'État des lieux', description: 'État des lieux d\'entrée' },
    ],
  },
  franchise: {
    label: 'Franchise',
    etapes: [
      { nom: 'DIP & Analyse', description: 'Document d\'information précontractuelle, analyse du réseau' },
      { nom: 'Négociation du contrat', description: 'Négociation des termes du contrat de franchise' },
      { nom: 'Rédaction', description: 'Rédaction / revue du contrat de franchise' },
      { nom: 'Signature', description: 'Signature du contrat de franchise' },
      { nom: 'Mise en place', description: 'Formation, ouverture, formalités' },
    ],
  },
  liquidation: {
    label: 'Liquidation',
    etapes: [
      { nom: 'Analyse de la situation', description: 'Audit, état des dettes, actifs' },
      { nom: 'Déclaration de cessation', description: 'Déclaration au tribunal' },
      { nom: 'Procédure', description: 'Suivi de la procédure de liquidation' },
      { nom: 'Clôture', description: 'Clôture de la liquidation, radiation' },
    ],
  },
  contentieux: {
    label: 'Contentieux',
    etapes: [
      { nom: 'Analyse du litige', description: 'Étude du dossier, stratégie' },
      { nom: 'Phase amiable', description: 'Mise en demeure, négociation' },
      { nom: 'Phase judiciaire', description: 'Assignation, conclusions, audiences' },
      { nom: 'Décision & exécution', description: 'Jugement, appel éventuel, exécution' },
    ],
  },
  autre: {
    label: 'Autre',
    etapes: [
      { nom: 'Étape 1', description: '' },
      { nom: 'Étape 2', description: '' },
      { nom: 'Étape 3', description: '' },
    ],
  },
}

export const STATUTS_ETAPE = [
  { value: 'a_faire', label: 'À faire', color: '#6b7280' },
  { value: 'en_cours', label: 'En cours', color: '#3b82f6' },
  { value: 'termine', label: 'Terminé', color: '#22c55e' },
]
