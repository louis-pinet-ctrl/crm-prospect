const SIRENE_API_URL = 'https://recherche-entreprises.api.gouv.fr/search'

// Mapping codes NAF → libellés (restauration et activités courantes)
const NAF_LABELS = {
  '56.10A': 'Restauration traditionnelle',
  '56.10B': 'Cafétérias et autres libres-services',
  '56.10C': 'Restauration rapide',
  '56.21Z': 'Services des traiteurs',
  '56.29A': 'Restauration collective sous contrat',
  '56.29B': 'Autres services de restauration',
  '56.30Z': 'Débits de boissons',
  '47.11A': 'Commerce de détail de produits surgelés',
  '47.11B': 'Commerce d\'alimentation générale',
  '47.11C': 'Supérettes',
  '47.11D': 'Supermarchés',
  '47.11F': 'Hypermarchés',
  '55.10Z': 'Hôtels et hébergement similaire',
  '10.71A': 'Fabrication industrielle de pain',
  '10.71B': 'Cuisson de produits de boulangerie',
  '10.71C': 'Boulangerie et boulangerie-pâtisserie',
  '10.71D': 'Pâtisserie',
}

// Mapping codes nature juridique → libellés
const NATURE_JURIDIQUE_LABELS = {
  '1000': 'Entrepreneur individuel',
  '5410': 'SARL',
  '5485': 'SARL unipersonnelle (EURL)',
  '5499': 'SARL (autre)',
  '5498': 'SARL à associé unique',
  '5710': 'SAS',
  '5720': 'SAS à associé unique (SASU)',
  '5699': 'SA (autre)',
  '5505': 'SA à conseil d\'administration',
  '5510': 'SA à directoire',
  '6210': 'SARL coopérative',
  '5560': 'SNC',
  '5306': 'SCI',
  '5307': 'SCI de construction-vente',
  '5308': 'SCI d\'attribution',
  '6540': 'SCP',
  '6220': 'Société coopérative',
  '6599': 'Autre société civile',
  '9220': 'Association déclarée',
  '9221': 'Association déclarée reconnue d\'utilité publique',
  '1200': 'Commerçant',
  '1300': 'Artisan',
}

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

  // Adresse complète (champ `adresse` = chaîne unique)
  const adresse = siege.adresse || ''
  const code_postal = siege.code_postal || ''

  // Activité (NAF)
  const code_naf = siege.activite_principale || company.activite_principale || ''
  const libelle_naf = NAF_LABELS[code_naf] || `Code ${code_naf}`

  // Forme juridique (code → libellé via mapping)
  const nature_juridique_code = company.nature_juridique || ''
  const forme_juridique = NATURE_JURIDIQUE_LABELS[nature_juridique_code]
    || (nature_juridique_code ? `Code ${nature_juridique_code}` : '')

  // Date de création
  const date_creation_entreprise = company.date_creation || siege.date_creation || ''

  // État administratif
  const etat_administratif = company.etat_administratif || siege.etat_administratif || ''

  // Dirigeants
  const dirigeants = (company.dirigeants || []).map(d => {
    const nom = [d.prenoms, d.nom].filter(Boolean).join(' ')
    return { nom, qualite: d.qualite || '' }
  })

  // Finances (dernière année disponible)
  let ca_sirene = null
  let resultat_net = null
  if (company.finances) {
    const annees = Object.keys(company.finances).sort().reverse()
    if (annees.length > 0) {
      const derniere = company.finances[annees[0]]
      ca_sirene = derniere.ca != null ? derniere.ca : null
      resultat_net = derniere.resultat_net != null ? derniere.resultat_net : null
    }
  }

  return {
    etablissement: company.nom_complet || company.nom_raison_sociale || '',
    ville: siege.libelle_commune || siege.commune || '',
    nombre_salaries: parseTrancheEffectif(
      company.tranche_effectif_salarie || siege.tranche_effectif_salarie
    ),
    ca_annuel_declare: ca_sirene,
    // Champs SIRENE enrichis
    adresse,
    code_postal,
    code_naf,
    libelle_naf,
    forme_juridique,
    date_creation_entreprise,
    etat_administratif,
    dirigeants,
    resultat_net,
  }
}

function parseTrancheEffectif(tranche) {
  if (!tranche || tranche === 'NN') return null
  const mapping = {
    '00': 0, '01': 1, '02': 3, '03': 6, '11': 10, '12': 20,
    '21': 50, '22': 100, '31': 200, '32': 250, '41': 500,
    '42': 1000, '51': 2000, '52': 5000, '53': 10000,
  }
  return mapping[tranche] ?? null
}
