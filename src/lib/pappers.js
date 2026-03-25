const SIRENE_API_URL = 'https://recherche-entreprises.api.gouv.fr/search'

export async function fetchCompanyBySiret(siret) {
  const cleanSiret = siret.replace(/\s/g, '')
  if (cleanSiret.length !== 14) {
    throw new Error('Le SIRET doit contenir 14 chiffres')
  }

  const res = await fetch(
    `${SIRENE_API_URL}?q=${cleanSiret}&mtm_campaign=crm-prospect`
  )

  if (!res.ok) {
    throw new Error('Erreur API SIRENE')
  }

  const data = await res.json()

  if (!data.results || data.results.length === 0) {
    throw new Error('SIRET introuvable')
  }

  const company = data.results[0]
  const siege = company.siege || {}

  // Debug: log pour voir tous les champs disponibles
  console.log('[SIRENE] Réponse complète:', JSON.stringify(company, null, 2))

  // Adresse : l'API peut retourner soit un champ `adresse` complet, soit les composants séparés
  const adresseComplete = siege.adresse || ''
  const adresseParts = [
    siege.numero_voie,
    siege.type_voie,
    siege.libelle_voie,
  ].filter(Boolean)
  const adresse = adresseComplete || (adresseParts.length > 0 ? adresseParts.join(' ') : '')
  const code_postal = siege.code_postal || ''

  // Activité (NAF) — plusieurs noms possibles selon la version de l'API
  const code_naf = siege.activite_principale
    || company.activite_principale
    || company.naf_entreprise
    || ''
  const libelle_naf = siege.libelle_activite_principale
    || company.libelle_activite_principale
    || company.libelle_naf_entreprise
    || ''

  // Forme juridique — code + libellé
  const forme_juridique = company.libelle_nature_juridique
    || company.forme_juridique
    || company.categorie_juridique
    || ''
  const nature_juridique_code = company.nature_juridique
    || company.forme_juridique_code
    || ''

  // Date de création
  const date_creation_entreprise = company.date_creation
    || siege.date_creation
    || ''

  // État administratif
  const etat_administratif = company.etat_administratif
    || siege.etat_administratif
    || ''

  return {
    etablissement: company.nom_complet || company.nom_raison_sociale || '',
    ville: siege.libelle_commune || siege.commune || '',
    nombre_salaries: parseTrancheEffectif(
      company.tranche_effectif_salarie || siege.tranche_effectif_salarie
    ),
    ca_annuel_declare: null,
    // Champs SIRENE enrichis
    adresse,
    code_postal,
    code_naf,
    libelle_naf,
    forme_juridique,
    nature_juridique_code,
    date_creation_entreprise,
    etat_administratif,
  }
}

function parseTrancheEffectif(tranche) {
  if (!tranche) return null
  const mapping = {
    '00': 0, '01': 1, '02': 3, '03': 6, '11': 10, '12': 20,
    '21': 50, '22': 100, '31': 200, '32': 250, '41': 500,
    '42': 1000, '51': 2000, '52': 5000, '53': 10000,
  }
  return mapping[tranche] ?? null
}
