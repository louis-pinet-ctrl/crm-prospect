// Parse un texte d'email pour en extraire les infos prospect
// Fonctionne avec des emails, signatures, corps de mail collés

export function parseEmailText(text) {
  const result = {}

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i)
  if (emailMatch) result.email = emailMatch[0].toLowerCase()

  // Téléphone (formats FR : 06, 07, +33, 01-09, avec espaces/points/tirets)
  const phoneMatch = text.match(
    /(?:\+33\s?[1-9]|0[1-9])[\s./-]?(?:\d{2}[\s./-]?){4}/
  )
  if (phoneMatch) result.telephone = phoneMatch[0].trim()

  // SIRET (14 chiffres consécutifs ou avec espaces)
  const siretMatch = text.match(/\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b/)
  if (siretMatch) result.siret = siretMatch[1]

  // Ville — cherche les patterns courants dans les signatures
  // "75002 Paris", "69001 Lyon", "13001 Marseille", etc.
  const cpVilleMatch = text.match(/\b(\d{5})\s+([A-ZÀ-Ü][a-zà-ü]+(?:[\s-][A-ZÀ-Ü][a-zà-ü]+)*)/m)
  if (cpVilleMatch) result.ville = cpVilleMatch[2]

  // Adresse complète (pour diaglocal_adresse si besoin)
  const adresseMatch = text.match(
    /(\d+[\s,]+(?:rue|avenue|boulevard|bd|av|place|impasse|allée|chemin|quai|passage|cours)\s+[^\n,]+)/i
  )
  if (adresseMatch) result.adresse = adresseMatch[1].trim()

  // Nom — essayer plusieurs patterns, du plus fiable au moins fiable
  if (!result.nom) {
    // Pattern 1: "De : Prénom Nom" ou "From: Prénom Nom"
    const fromMatch = text.match(/(?:De|From)\s*:\s*([A-ZÀ-Üa-zà-ü][a-zà-ü]+\s+[A-ZÀ-Üa-zà-ü][A-ZÀ-Üa-zà-ü]+)/i)
    if (fromMatch) result.nom = fromMatch[1].trim()
  }
  if (!result.nom) {
    // Pattern 2: "je suis Prénom Nom" / "je m'appelle Prénom Nom"
    const jeSuisMatch = text.match(/(?:je suis|je m'appelle|moi c'est|c'est)\s+([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)/i)
    if (jeSuisMatch) result.nom = jeSuisMatch[1].trim()
  }
  if (!result.nom) {
    // Pattern 3: après "Cordialement," etc. suivi d'un saut de ligne puis Prénom Nom
    const sigMatch = text.match(
      /(?:cordialement|bien [àa] vous|cdlt|salutations|regards|merci|bonne (?:journée|soirée|réception))[,.\s]*\n\s*\n?\s*([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)/im
    )
    if (sigMatch) result.nom = sigMatch[1].trim()
  }
  if (!result.nom) {
    // Pattern 4: ligne juste avant ou après l'email/téléphone (signature classique)
    // "Jean Dupont\njean.dupont@email.com" ou "jean@email.com\nJean Dupont"
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Ligne qui contient un email ou téléphone — regarder la ligne d'avant/après
      const hasContact = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(line) ||
        /(?:\+33|0[1-9])[\s./-]?\d{2}/.test(line)
      if (hasContact) {
        // Regarder la ligne précédente
        if (i > 0) {
          const prev = lines[i - 1]
          const nameMatch = prev.match(/^([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)$/)
          if (nameMatch) { result.nom = nameMatch[1]; break }
        }
        // Regarder la ligne suivante
        if (i < lines.length - 1) {
          const next = lines[i + 1]
          const nameMatch = next.match(/^([A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][A-ZÀ-Üa-zà-ü]+)$/)
          if (nameMatch) { result.nom = nameMatch[1]; break }
        }
      }
    }
  }
  if (!result.nom && result.email) {
    // Pattern 5: déduire du préfixe email — jean.dupont@... → Jean Dupont
    const prefix = result.email.split('@')[0]
    const parts = prefix.split(/[._-]/).filter(p => p.length > 1 && !/^\d+$/.test(p))
    if (parts.length >= 2) {
      result.nom = parts
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(' ')
    }
  }

  // Établissement — cherche après "Restaurant", "Brasserie", "Café", etc.
  const etabMatch = text.match(
    /(?:restaurant|brasserie|café|cafe|bistrot|pizzeria|traiteur|bar|snack|hôtel|hotel)\s+(?:le |la |l'|les |du |de |des )?[^\n,.(]+/i
  )
  if (etabMatch) {
    // Nettoyer : enlever les espaces de fin et tout ce qui suit un code postal
    result.etablissement = etabMatch[0].trim().replace(/\s*\d{5}\s.*$/, '').replace(/\s+$/, '')
  }

  // Surface m² — "120 m²", "120m2", "120 m2"
  const surfaceMatch = text.match(/(\d+)\s*m[²2]/i)
  if (surfaceMatch) result.surface_local_m2 = parseInt(surfaceMatch[1])

  // Loyer — "loyer 3500", "loyer de 3 500 €", "loyer mensuel : 3500"
  const loyerMatch = text.match(/loyer[^€\d]*(\d[\d\s]*)\s*€?/i)
  if (loyerMatch) result.loyer_mensuel = parseInt(loyerMatch[1].replace(/\s/g, ''))

  // Nombre de salariés — "8 salariés", "12 employés"
  const salMatch = text.match(/(\d+)\s*(?:salariés?|employés?)/i)
  if (salMatch) result.nombre_salaries = parseInt(salMatch[1])

  return result
}
