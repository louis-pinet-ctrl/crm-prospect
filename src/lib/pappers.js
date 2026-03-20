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

  return {
    etablissement: company.nom_complet || company.nom_raison_sociale || '',
    ville: siege.libelle_commune || siege.commune || '',
    nombre_salaries: parseTrancheEffectif(company.tranche_effectif_salarie),
    ca_annuel_declare: null,
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
