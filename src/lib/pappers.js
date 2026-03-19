const PAPPERS_API_URL = 'https://api.pappers.fr/v2/entreprise'

export async function fetchCompanyBySiret(siret) {
  const token = import.meta.env.VITE_PAPPERS_API_KEY
  if (!token) throw new Error('Clé API Pappers non configurée (VITE_PAPPERS_API_KEY)')

  const cleanSiret = siret.replace(/\s/g, '')
  if (cleanSiret.length !== 14) {
    throw new Error('Le SIRET doit contenir 14 chiffres')
  }

  const res = await fetch(
    `${PAPPERS_API_URL}?siret=${cleanSiret}&api_token=${token}`
  )

  if (!res.ok) {
    if (res.status === 404) throw new Error('SIRET introuvable')
    if (res.status === 401) throw new Error('Clé API Pappers invalide')
    throw new Error('Erreur API Pappers')
  }

  const data = await res.json()

  return {
    etablissement: data.nom_entreprise || data.denomination || '',
    ville: data.siege?.ville || '',
    nombre_salaries: data.effectif
      ? parseInt(data.effectif, 10)
      : data.tranche_effectif
        ? parseInt(data.tranche_effectif, 10) || null
        : null,
    ca_annuel_declare: data.finances?.[0]?.chiffre_affaires ?? null,
  }
}
