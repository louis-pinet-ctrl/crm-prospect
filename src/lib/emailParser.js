// Parse un texte d'email pour en extraire les infos prospect
// Fonctionne avec des emails, signatures, corps de mail collés
// Détecte aussi le format structuré "NOUVEAU LEAD VALORISATION" du simulateur

// Emails à ignorer lors du parsing (expéditeur / destinataire système)
const IGNORED_EMAILS = new Set([
  'contact@louispinetavocat.fr',
  'noreply@louispinetavocat.fr',
  'no-reply@louispinetavocat.fr',
])

// --- Mapping segment simulateur → type_cuisine ---
const SEGMENT_TO_CUISINE = {
  'fast-food': 'fast_food',
  'fast food': 'fast_food',
  'snack': 'fast_food',
  'traditionnelle': 'traditionnelle',
  'traditionnel': 'traditionnelle',
  'gastronomique': 'gastronomique',
  'gastro': 'gastronomique',
  'bistronomique': 'bistronomique',
  'brasserie': 'brasserie',
  'pizzeria': 'pizzeria',
  'pizza': 'pizzeria',
  'asiatique': 'asiatique',
  'japonais': 'asiatique',
  'chinois': 'asiatique',
  'sushi': 'asiatique',
  'italien': 'italien',
  'bar-restaurant': 'bar_restaurant',
  'bar restaurant': 'bar_restaurant',
  'bar': 'bar_restaurant',
  'traiteur': 'traiteur',
  'dark kitchen': 'dark_kitchen',
  'dark-kitchen': 'dark_kitchen',
}

// --- Mapping type utilisateur simulateur → profil ---
const TYPE_TO_PROFIL = {
  'restaurateur': null, // on garde le défaut
  'exploitant': null,
  'franchisé': null, // pas de mapping direct, on le met dans source_detail
  'expert-comptable': null,
  'agent immobilier': null,
  'avocat': null,
  'conseiller': null,
  'investisseur': null,
}

function parseNumber(str) {
  if (!str) return null
  return parseInt(str.replace(/[\s€]/g, '').replace(',', '.')) || null
}

// --- Parser spécifique pour le format simulateur ---
// Les champs sont souvent sur la même ligne : "Nom : X Prénom : Y Téléphone : Z"
function parseSimulateurLead(text) {
  const result = {
    _isSimulateur: true,
    source: 'simulateur_precession',
    simulateur_valorisation: true,
  }

  // Contact — utiliser des patterns précis qui capturent jusqu'au prochain champ
  const nomMatch = text.match(/Nom\s*:\s*(\S+)/i)
  const prenomMatch = text.match(/Prénom\s*:\s*(\S+)/i)
  if (prenomMatch && nomMatch) {
    result.nom = `${prenomMatch[1].trim()} ${nomMatch[1].trim()}`
  } else if (nomMatch) {
    result.nom = nomMatch[1].trim()
  }

  const telMatch = text.match(/Téléphone\s*:\s*(\S+)/i)
  if (telMatch) result.telephone = telMatch[1].trim()

  const emailMatch = text.match(/Email\s*:\s*([\w.+-]+@[\w-]+\.[\w.-]+)/i)
  if (emailMatch && !IGNORED_EMAILS.has(emailMatch[1].trim().toLowerCase())) {
    result.email = emailMatch[1].trim().toLowerCase()
  }

  // Type utilisateur
  const typeMatch = text.match(/Type\s*:\s*(\S+)/i)
  if (typeMatch) result.type_utilisateur = typeMatch[1].trim()

  // Données business — capturer les nombres avec espaces + €
  const segmentMatch = text.match(/Segment\s*:\s*([A-Za-zÀ-ü-]+(?:[/\s-][A-Za-zÀ-ü-]+)*?)(?=\s+CA\b|\s*$)/i)
  if (segmentMatch) {
    const segment = segmentMatch[1].trim().toLowerCase()
    result.type_cuisine = SEGMENT_TO_CUISINE[segment] || ''
    result._segment = segmentMatch[1].trim()
  }

  const caMatch = text.match(/CA année N\s*:\s*([\d\s]+)\s*€/i)
  if (caMatch) result.ca_annuel_declare = parseNumber(caMatch[1])

  const caN1Match = text.match(/CA année N-1\s*:\s*([\d\s]+)\s*€/i)
  const caN2Match = text.match(/CA année N-2\s*:\s*([\d\s]+)\s*€/i)
  result._ca_n1 = caN1Match ? parseNumber(caN1Match[1]) : null
  result._ca_n2 = caN2Match ? parseNumber(caN2Match[1]) : null

  const ebeMatch = text.match(/EBE retraité\s*:\s*([\d\s]+)\s*€/i)
  result._ebe = ebeMatch ? parseNumber(ebeMatch[1]) : null

  const loyerMatch = text.match(/Loyer annuel\s*:\s*([\d\s]+)\s*€/i)
  if (loyerMatch) {
    const annuel = parseNumber(loyerMatch[1])
    if (annuel) result.loyer_mensuel = Math.round(annuel / 12)
  }

  const salMatch = text.match(/Nombre salariés\s*:\s*(\d+)/i)
  if (salMatch) result.nombre_salaries = parseInt(salMatch[1])

  const locMatch = text.match(/Localisation\s*:\s*([A-Za-zÀ-ü-]+(?:\s+[A-Za-zÀ-ü-]+)?)(?=\s+Terrasse|$)/i)
  result._localisation = locMatch ? locMatch[1].trim() : null

  const terrasseMatch = text.match(/Terrasse\s*:\s*(Oui|Non)/i)
  result._terrasse = terrasseMatch ? terrasseMatch[1].trim() : null

  // Bail — chaque champ capturé précisément
  const bailDuree = text.match(/Durée restante\s*:\s*([^\n]+?)(?=\s+Destination|$)/i)
  const bailDest = text.match(/Destination\s*:\s*([^\n]+?)(?=\s+Agrément|$)/i)
  const bailFDC = text.match(/Agrément FDC\s*:\s*(Oui|Non)/i)
  const bailDAB = text.match(/Agrément DAB\s*:\s*(Oui|Non)/i)
  const bailIndex = text.match(/Indexation\s*:\s*([^\n]+?)(?=\s+Extraction|$)/i)
  const bailExtraction = text.match(/Extraction\s*:\s*([^\n]+?)(?=\s+Loyer vs|$)/i)
  const bailLoyer = text.match(/Loyer vs marché\s*:\s*([^\n]+?)(?=\s+JURIDIQUE|$)/i)

  result._bail = {
    duree_restante: bailDuree?.[1]?.trim(),
    destination: bailDest?.[1]?.trim(),
    agrement_fdc: bailFDC?.[1]?.trim(),
    agrement_dab: bailDAB?.[1]?.trim(),
    indexation: bailIndex?.[1]?.trim(),
    extraction: bailExtraction?.[1]?.trim(),
    loyer_vs_marche: bailLoyer?.[1]?.trim(),
  }

  // Juridique — chaque champ capturé précisément
  const jurConf = text.match(/Conformité ERP\s*:\s*([^\n]+?)(?=\s+Litiges|$)/i)
  const jurLitige = text.match(/Litiges\s*:\s*(Oui|Non)/i)
  const jurLicence = text.match(/Licence\s*:\s*([^\n]+?)(?=\s+Dettes|$)/i)
  const jurDettes = text.match(/Dettes\s*:\s*([^\n]+?)(?=\s+VALORISATION|$)/i)

  result._juridique = {
    conformite_erp: jurConf?.[1]?.trim(),
    litiges: jurLitige?.[1]?.trim(),
    licence: jurLicence?.[1]?.trim(),
    dettes: jurDettes?.[1]?.trim(),
  }

  // Valorisation
  const fourchMatch = text.match(/Fourchette\s*:\s*([\d\s]+)\s*€\s*-\s*([\d\s]+)\s*€/i)
  result._valo_min = fourchMatch ? parseNumber(fourchMatch[1]) : null
  result._valo_max = fourchMatch ? parseNumber(fourchMatch[2]) : null

  const medMatch = text.match(/MÉDIANE\s*:\s*([\d\s]+)\s*€/i)
  if (medMatch) {
    result.simulateur_estimation = parseNumber(medMatch[1])
    // Utiliser la médiane comme base de calcul pour les honoraires
    result.base_calcul = result.simulateur_estimation
  }

  const dateSimMatch = text.match(/Date simulation\s*:\s*(.+)/i)
  if (dateSimMatch) {
    const raw = dateSimMatch[1].trim()
    // Essayer de parser en ISO date (YYYY-MM-DD) pour Supabase
    const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
    const frMatch = raw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
    if (isoMatch) {
      result.simulateur_date = isoMatch[0]
    } else if (frMatch) {
      result.simulateur_date = `${frMatch[3]}-${frMatch[2].padStart(2, '0')}-${frMatch[1].padStart(2, '0')}`
    }
    result._date_simulation_raw = raw
  }
  // Fallback : si pas de date trouvée dans l'email, utiliser la date du jour
  if (!result.simulateur_date) {
    result.simulateur_date = new Date().toISOString().split('T')[0]
  }

  // Construire le source_detail avec toutes les infos complémentaires
  const details = []
  if (result.type_utilisateur) details.push(`Type: ${result.type_utilisateur}`)
  if (result._segment) details.push(`Segment: ${result._segment}`)
  if (result._localisation) details.push(`Localisation: ${result._localisation}`)
  if (result._terrasse) details.push(`Terrasse: ${result._terrasse}`)
  if (result._ebe) details.push(`EBE retraité: ${result._ebe.toLocaleString('fr-FR')} €`)
  if (result._ca_n1) details.push(`CA N-1: ${result._ca_n1.toLocaleString('fr-FR')} €`)
  if (result._ca_n2) details.push(`CA N-2: ${result._ca_n2.toLocaleString('fr-FR')} €`)
  if (result._valo_min && result._valo_max) {
    details.push(`Valorisation: ${result._valo_min.toLocaleString('fr-FR')} € - ${result._valo_max.toLocaleString('fr-FR')} €`)
  }
  if (result.simulateur_estimation) {
    details.push(`Médiane: ${result.simulateur_estimation.toLocaleString('fr-FR')} €`)
  }
  if (result._date_simulation_raw) details.push(`Simulation du ${result._date_simulation_raw}`)
  result.source_detail = details.join(' | ')

  // Construire les notes bail + juridique
  const noteLines = []
  noteLines.push('=== DONNÉES SIMULATEUR ===')

  if (result._bail.duree_restante) {
    noteLines.push('')
    noteLines.push('BAIL :')
    if (result._bail.duree_restante) noteLines.push(`  Durée restante : ${result._bail.duree_restante}`)
    if (result._bail.destination) noteLines.push(`  Destination : ${result._bail.destination}`)
    if (result._bail.agrement_fdc) noteLines.push(`  Agrément FDC : ${result._bail.agrement_fdc}`)
    if (result._bail.agrement_dab) noteLines.push(`  Agrément DAB : ${result._bail.agrement_dab}`)
    if (result._bail.indexation) noteLines.push(`  Indexation : ${result._bail.indexation}`)
    if (result._bail.extraction) noteLines.push(`  Extraction : ${result._bail.extraction}`)
    if (result._bail.loyer_vs_marche) noteLines.push(`  Loyer vs marché : ${result._bail.loyer_vs_marche}`)
  }

  if (result._juridique.conformite_erp) {
    noteLines.push('')
    noteLines.push('JURIDIQUE :')
    if (result._juridique.conformite_erp) noteLines.push(`  Conformité ERP : ${result._juridique.conformite_erp}`)
    if (result._juridique.litiges) noteLines.push(`  Litiges : ${result._juridique.litiges}`)
    if (result._juridique.licence) noteLines.push(`  Licence : ${result._juridique.licence}`)
    if (result._juridique.dettes) noteLines.push(`  Dettes : ${result._juridique.dettes}`)
  }

  result._note_contenu = noteLines.join('\n')

  // Nettoyer les champs internes avant de retourner
  const clean = {}
  for (const [k, v] of Object.entries(result)) {
    if (!k.startsWith('_') && v != null && v !== '') clean[k] = v
  }
  // Garder les champs internes pour le formulaire
  clean._isSimulateur = true
  clean._note_contenu = result._note_contenu
  return clean
}

// --- Parser générique pour emails classiques ---
function parseGenericEmail(text) {
  const result = {}

  // Email — trouver la première adresse qui n'est pas l'expéditeur système
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi
  let emailMatch
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    const candidate = emailMatch[0].toLowerCase()
    if (!IGNORED_EMAILS.has(candidate)) {
      result.email = candidate
      break
    }
  }

  // Téléphone (formats FR : 06, 07, +33, 01-09, avec espaces/points/tirets)
  const phoneMatch = text.match(
    /(?:\+33\s?[1-9]|0[1-9])[\s./-]?(?:\d{2}[\s./-]?){4}/
  )
  if (phoneMatch) result.telephone = phoneMatch[0].trim()

  // SIRET (14 chiffres consécutifs ou avec espaces)
  const siretMatch = text.match(/\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b/)
  if (siretMatch) result.siret = siretMatch[1]

  // Ville — cherche les patterns courants dans les signatures
  const cpVilleMatch = text.match(/\b(\d{5})\s+([A-ZÀ-Ü][a-zà-ü]+(?:[\s-][A-ZÀ-Ü][a-zà-ü]+)*)/m)
  if (cpVilleMatch) result.ville = cpVilleMatch[2]

  // Adresse complète
  const adresseMatch = text.match(
    /(\d+[\s,]+(?:rue|avenue|boulevard|bd|av|place|impasse|allée|chemin|quai|passage|cours)\s+[^\n,]+)/i
  )
  if (adresseMatch) result.adresse = adresseMatch[1].trim()

  // Nom — essayer plusieurs patterns, du plus fiable au moins fiable
  if (!result.nom) {
    // Chercher "De: Prénom Nom" mais ignorer les lignes qui contiennent un email système
    const fromLine = text.match(/^(?:De|From)\s*:.*$/im)
    if (fromLine && ![...IGNORED_EMAILS].some(e => fromLine[0].toLowerCase().includes(e.split('@')[0]))) {
      const fromMatch = fromLine[0].match(/(?:De|From)\s*:\s*([A-ZÀ-Üa-zà-ü][a-zà-ü]+\s+[A-ZÀ-Üa-zà-ü][A-ZÀ-Üa-zà-ü]+)/i)
      if (fromMatch) result.nom = fromMatch[1].trim()
    }
  }
  if (!result.nom) {
    const jeSuisMatch = text.match(/(?:je suis|je m'appelle|moi c'est|c'est)\s+([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)/i)
    if (jeSuisMatch) result.nom = jeSuisMatch[1].trim()
  }
  if (!result.nom) {
    const sigMatch = text.match(
      /(?:cordialement|bien [àa] vous|cdlt|salutations|regards|merci|bonne (?:journée|soirée|réception))[,.\s]*\n\s*\n?\s*([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)/im
    )
    if (sigMatch) result.nom = sigMatch[1].trim()
  }
  if (!result.nom) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const hasContact = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(line) ||
        /(?:\+33|0[1-9])[\s./-]?\d{2}/.test(line)
      if (hasContact) {
        if (i > 0) {
          const prev = lines[i - 1]
          const nameMatch = prev.match(/^([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)$/)
          if (nameMatch) { result.nom = nameMatch[1]; break }
        }
        if (i < lines.length - 1) {
          const next = lines[i + 1]
          const nameMatch = next.match(/^([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)$/)
          if (nameMatch) { result.nom = nameMatch[1]; break }
        }
      }
    }
  }
  if (!result.nom && result.email) {
    const prefix = result.email.split('@')[0]
    const parts = prefix.split(/[._-]/).filter(p => p.length > 1 && !/^\d+$/.test(p))
    if (parts.length >= 2) {
      result.nom = parts
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(' ')
    }
  }

  // Établissement
  const etabMatch = text.match(
    /(?:restaurant|brasserie|café|cafe|bistrot|pizzeria|traiteur|bar|snack|hôtel|hotel)\s+(?:le |la |l'|les |du |de |des )?[^\n,.(]+/i
  )
  if (etabMatch) {
    result.etablissement = etabMatch[0].trim().replace(/\s*\d{5}\s.*$/, '').replace(/\s+$/, '')
  }

  // Surface m²
  const surfaceMatch = text.match(/(\d+)\s*m[²2]/i)
  if (surfaceMatch) result.surface_local_m2 = parseInt(surfaceMatch[1])

  // Loyer
  const loyerMatch = text.match(/loyer[^€\d]*(\d[\d\s]*)\s*€?/i)
  if (loyerMatch) result.loyer_mensuel = parseInt(loyerMatch[1].replace(/\s/g, ''))

  // Nombre de salariés
  const salMatch = text.match(/(\d+)\s*(?:salariés?|employés?)/i)
  if (salMatch) result.nombre_salaries = parseInt(salMatch[1])

  return result
}

// --- Point d'entrée principal ---
export function parseEmailText(text) {
  // Détecter si c'est un email du simulateur de valorisation
  if (text.includes('NOUVEAU LEAD VALORISATION') || text.includes('VALORISATION CALCULÉE')) {
    return parseSimulateurLead(text)
  }
  return parseGenericEmail(text)
}
