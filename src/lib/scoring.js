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
    qualification: { score: 0, max: 20, details: [] },
    engagement: { score: 0, max: 25, details: [] },
    financier: { score: 0, max: 30, details: [] },
    signaux: { score: 0, max: 25, details: [] },
  }

  // === QUALIFICATION (20 pts) — Complétude de la fiche ===

  // Contact (6 pts)
  if (prospect.email) {
    breakdown.qualification.score += 3
    breakdown.qualification.details.push('Email (+3)')
  }
  if (prospect.telephone) {
    breakdown.qualification.score += 3
    breakdown.qualification.details.push('Téléphone (+3)')
  }

  // Identité métier (8 pts)
  if (prospect.siret) {
    breakdown.qualification.score += 2
    breakdown.qualification.details.push('SIRET (+2)')
  }
  if (prospect.etablissement) {
    breakdown.qualification.score += 2
    breakdown.qualification.details.push('Établissement (+2)')
  }
  if (prospect.type_cuisine) {
    breakdown.qualification.score += 2
    breakdown.qualification.details.push('Type cuisine (+2)')
  }
  if (prospect.intention) {
    breakdown.qualification.score += 2
    breakdown.qualification.details.push('Intention (+2)')
  }

  // Profil et CA (6 pts)
  if (prospect.profil_restaurateur) {
    breakdown.qualification.score += 2
    breakdown.qualification.details.push('Profil (+2)')
  }
  if (prospect.ca_annuel_declare > 0) {
    breakdown.qualification.score += 4
    breakdown.qualification.details.push('CA renseigné (+4)')
  }

  // === ENGAGEMENT (25 pts) — Intérêt et interactions ===

  // Source d'acquisition (0-8)
  const sourcePoints = {
    simulateur_precession: 8,
    recommandation: 7,
    diaglocal: 6,
    site_web: 4,
    linkedin: 2,
    autre: 1,
  }
  const srcPts = sourcePoints[prospect.source] || 1
  breakdown.engagement.score += srcPts
  breakdown.engagement.details.push(`Source ${prospect.source || 'autre'} (+${srcPts})`)

  // Outils utilisés (0-7)
  if (prospect.simulateur_valorisation) {
    breakdown.engagement.score += 3
    breakdown.engagement.details.push('Simulateur (+3)')
  }
  if (prospect.diaglocal) {
    breakdown.engagement.score += 2
    breakdown.engagement.details.push('DiagLocal (+2)')
  }
  if (prospect.guide_recu) {
    breakdown.engagement.score += 2
    breakdown.engagement.details.push('Guide (+2)')
  }

  // Interactions et récence (0-10)
  const interactions = notes.filter(n =>
    ['appel', 'email', 'whatsapp', 'rdv'].includes(n.type_note)
  )
  if (interactions.length > 0) {
    // Volume
    const volPts = Math.min(5, Math.ceil(interactions.length / 2))
    breakdown.engagement.score += volPts
    breakdown.engagement.details.push(`${interactions.length} interaction${interactions.length > 1 ? 's' : ''} (+${volPts})`)

    // Récence de la dernière interaction
    const lastDate = new Date(interactions[0]?.created_at || interactions[0]?.date_creation)
    const joursDepuis = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24))
    if (joursDepuis <= 3) {
      breakdown.engagement.score += 5
      breakdown.engagement.details.push('Contact < 3j (+5)')
    } else if (joursDepuis <= 7) {
      breakdown.engagement.score += 4
      breakdown.engagement.details.push('Contact < 7j (+4)')
    } else if (joursDepuis <= 14) {
      breakdown.engagement.score += 3
      breakdown.engagement.details.push('Contact < 14j (+3)')
    } else if (joursDepuis <= 30) {
      breakdown.engagement.score += 1
      breakdown.engagement.details.push('Contact < 30j (+1)')
    }
  }

  // === POTENTIEL FINANCIER (30 pts) — Valeur du dossier ===

  // Montant estimé (0-18)
  const montant = prospect.base_calcul || prospect.simulateur_estimation || prospect.ca_annuel_declare || 0
  if (montant >= 400000) {
    breakdown.financier.score += 18
    breakdown.financier.details.push('Montant ≥ 400k (+18)')
  } else if (montant >= 250000) {
    breakdown.financier.score += 15
    breakdown.financier.details.push('Montant ≥ 250k (+15)')
  } else if (montant >= 150000) {
    breakdown.financier.score += 12
    breakdown.financier.details.push('Montant ≥ 150k (+12)')
  } else if (montant >= 80000) {
    breakdown.financier.score += 9
    breakdown.financier.details.push('Montant ≥ 80k (+9)')
  } else if (montant >= 30000) {
    breakdown.financier.score += 6
    breakdown.financier.details.push('Montant ≥ 30k (+6)')
  } else if (montant > 0) {
    breakdown.financier.score += 3
    breakdown.financier.details.push('Montant renseigné (+3)')
  }

  // Type de dossier (0-8)
  const typeDossierPoints = {
    cession_fonds: 8,
    cession_droit_bail: 6,
    franchise: 7,
    bail_nu: 4,
    liquidation: 3,
    contentieux: 5,
    autre: 2,
  }
  const typePts = typeDossierPoints[prospect.type_dossier] || 0
  if (typePts > 0) {
    breakdown.financier.score += typePts
    breakdown.financier.details.push(`Dossier ${prospect.type_dossier?.replace(/_/g, ' ') || '?'} (+${typePts})`)
  }

  // Franchise / multi-établissements (0-4)
  if (prospect.est_franchise && prospect.nombre_franchises > 1) {
    breakdown.financier.score += 4
    breakdown.financier.details.push(`Franchise ×${prospect.nombre_franchises} (+4)`)
  } else if (prospect.est_franchise) {
    breakdown.financier.score += 2
    breakdown.financier.details.push('Franchise (+2)')
  } else if (prospect.profil_restaurateur === 'multi_etablissements') {
    breakdown.financier.score += 3
    breakdown.financier.details.push('Multi-établissements (+3)')
  }

  // === SIGNAUX / MOMENTUM (25 pts) — Dynamique du dossier ===

  // Stade pipeline (0-10)
  const stadePoints = {
    mission_en_cours: 10,
    negociation: 9,
    lettre_mission_envoyee: 8,
    deal_maturation: 5,
    diagnostic_rdv: 6,
    relance_en_attente: 4,
    premier_contact: 2,
    lead_simulateur: 0,
    prospect_identifie: 0,
  }
  const stadePts = stadePoints[prospect.statut] ?? 0
  if (stadePts > 0) {
    breakdown.signaux.score += stadePts
    breakdown.signaux.details.push(`Pipeline avancé (+${stadePts})`)
  }

  // Dernier résultat d'interaction (0-8)
  if (interactions.length > 0) {
    const lastResultat = interactions[0]?.resultat
    const resultatPoints = {
      rdv_pris: 8,
      interesse: 6,
      info_envoyee: 4,
      a_rappeler: 3,
      message_laisse: 1,
      pas_de_reponse: 0,
      refus: -5,
    }
    const resPts = resultatPoints[lastResultat] ?? 0
    if (resPts !== 0) {
      breakdown.signaux.score += resPts
      breakdown.signaux.details.push(`Dernier retour: ${lastResultat?.replace(/_/g, ' ')} (${resPts > 0 ? '+' : ''}${resPts})`)
    }
  }

  // Expert-comptable impliqué (0-3)
  if (prospect.a_expert_comptable) {
    breakdown.signaux.score += 3
    breakdown.signaux.details.push('Expert-comptable (+3)')
  }

  // Priorité manuelle (0-4)
  if (prospect.priorite === 'haute') {
    breakdown.signaux.score += 4
    breakdown.signaux.details.push('Priorité haute (+4)')
  } else if (prospect.priorite === 'moyenne') {
    breakdown.signaux.score += 2
    breakdown.signaux.details.push('Priorité moyenne (+2)')
  }

  // Clamp signaux (le refus peut rendre négatif)
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
