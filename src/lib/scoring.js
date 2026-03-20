// Scoring prospect sur 100 points
// Adapté pour un avocat spécialisé en cession de fonds de commerce de restauration

const SCORE_COLORS = [
  { min: 75, label: 'Chaud', color: '#ff4d4d', bg: '#ff4d4d25' },
  { min: 50, label: 'Tiède', color: '#ffb84d', bg: '#ffb84d25' },
  { min: 25, label: 'Froid', color: '#4da6ff', bg: '#4da6ff25' },
  { min: 0, label: 'Glacial', color: '#6b7280', bg: '#6b728025' },
]

export function getScoreDisplay(score) {
  const tier = SCORE_COLORS.find(t => score >= t.min) || SCORE_COLORS[SCORE_COLORS.length - 1]
  return { score, ...tier }
}

export function calculateScore(prospect, notes = []) {
  const breakdown = {
    qualification: { score: 0, max: 25, details: [] },
    engagement: { score: 0, max: 30, details: [] },
    financier: { score: 0, max: 25, details: [] },
    signaux: { score: 0, max: 20, details: [] },
  }

  // === QUALIFICATION (25 pts) ===
  if (prospect.email) {
    breakdown.qualification.score += 5
    breakdown.qualification.details.push('Email (+5)')
  }
  if (prospect.telephone) {
    breakdown.qualification.score += 5
    breakdown.qualification.details.push('Téléphone (+5)')
  }
  if (prospect.siret) {
    breakdown.qualification.score += 5
    breakdown.qualification.details.push('SIRET (+5)')
  }
  if (prospect.ca_annuel_declare > 0) {
    breakdown.qualification.score += 5
    breakdown.qualification.details.push('CA renseigné (+5)')
  }
  if (prospect.etablissement) {
    breakdown.qualification.score += 3
    breakdown.qualification.details.push('Établissement (+3)')
  }
  if (prospect.type_cuisine) {
    breakdown.qualification.score += 2
    breakdown.qualification.details.push('Cuisine (+2)')
  }

  // === ENGAGEMENT (30 pts) ===
  // Source (0-12)
  const sourcePoints = {
    simulateur_precession: 12,
    recommandation: 10,
    diaglocal: 8,
    site_web: 5,
    linkedin: 3,
    autre: 2,
  }
  const srcPts = sourcePoints[prospect.source] || 2
  breakdown.engagement.score += srcPts
  breakdown.engagement.details.push(`Source ${prospect.source || 'autre'} (+${srcPts})`)

  // Outils utilisés (0-10)
  if (prospect.simulateur_valorisation) {
    breakdown.engagement.score += 5
    breakdown.engagement.details.push('Simulateur (+5)')
  }
  if (prospect.diaglocal) {
    breakdown.engagement.score += 3
    breakdown.engagement.details.push('DiagLocal (+3)')
  }
  if (prospect.guide_recu) {
    breakdown.engagement.score += 2
    breakdown.engagement.details.push('Guide (+2)')
  }

  // Interactions (0-8)
  const interactions = notes.filter(n =>
    ['appel', 'email', 'whatsapp', 'rdv'].includes(n.type_note)
  )
  if (interactions.length >= 5) {
    breakdown.engagement.score += 8
    breakdown.engagement.details.push(`${interactions.length} interactions (+8)`)
  } else if (interactions.length >= 3) {
    breakdown.engagement.score += 5
    breakdown.engagement.details.push(`${interactions.length} interactions (+5)`)
  } else if (interactions.length >= 1) {
    breakdown.engagement.score += 3
    breakdown.engagement.details.push(`${interactions.length} interaction${interactions.length > 1 ? 's' : ''} (+3)`)
  }

  // === POTENTIEL FINANCIER (25 pts) ===
  const montant = prospect.base_calcul || prospect.simulateur_estimation || prospect.ca_annuel_declare || 0
  if (montant >= 500000) {
    breakdown.financier.score += 25
    breakdown.financier.details.push('Montant >= 500k (+25)')
  } else if (montant >= 300000) {
    breakdown.financier.score += 20
    breakdown.financier.details.push('Montant >= 300k (+20)')
  } else if (montant >= 150000) {
    breakdown.financier.score += 15
    breakdown.financier.details.push('Montant >= 150k (+15)')
  } else if (montant >= 50000) {
    breakdown.financier.score += 10
    breakdown.financier.details.push('Montant >= 50k (+10)')
  } else if (montant > 0) {
    breakdown.financier.score += 5
    breakdown.financier.details.push('Montant renseigné (+5)')
  }

  // === SIGNAUX POSITIFS (20 pts) ===
  // Dernier résultat d'interaction (0-12)
  if (interactions.length > 0) {
    const lastResultat = interactions[0]?.resultat
    const resultatPoints = {
      rdv_pris: 12,
      interesse: 10,
      info_envoyee: 6,
      a_rappeler: 4,
      message_laisse: 2,
      pas_de_reponse: 0,
      refus: -5,
    }
    const resPts = resultatPoints[lastResultat] ?? 0
    if (resPts !== 0) {
      breakdown.signaux.score += resPts
      breakdown.signaux.details.push(`Dernier retour: ${lastResultat} (${resPts > 0 ? '+' : ''}${resPts})`)
    }
  }

  // Expert-comptable (0-4)
  if (prospect.a_expert_comptable) {
    breakdown.signaux.score += 4
    breakdown.signaux.details.push('Expert-comptable (+4)')
  }

  // Stade avancé (0-4)
  const stadePoints = {
    lettre_mission_envoyee: 4,
    mission_en_cours: 4,
    diagnostic_rdv: 3,
    relance_en_attente: 2,
    premier_contact: 1,
  }
  const stadePts = stadePoints[prospect.statut] || 0
  if (stadePts > 0) {
    breakdown.signaux.score += stadePts
    breakdown.signaux.details.push(`Stade avancé (+${stadePts})`)
  }

  // Malus : refus = score négatif possible, on clamp à 0
  breakdown.signaux.score = Math.max(0, breakdown.signaux.score)

  // Score total
  const total = Math.min(100,
    breakdown.qualification.score +
    breakdown.engagement.score +
    breakdown.financier.score +
    breakdown.signaux.score
  )

  return { total, breakdown }
}
