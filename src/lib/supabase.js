import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Variables Supabase manquantes. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// --- Prospects ---

export async function fetchProspects() {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('position_kanban', { ascending: true })
  if (error) throw error
  return data
}

export async function createProspect(prospect) {
  const { data, error } = await supabase
    .from('prospects')
    .insert(prospect)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProspect(id, updates) {
  const { data, error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProspect(id) {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) throw error
}

// --- Clone / Dossiers liés ---

export async function cloneProspectAsDossier(parentProspect, newTypeDossier) {
  // Copier les infos client, vider les infos dossier
  // Convertir les chaînes vides en null pour les enums
  const clean = (val) => val || null

  const clone = {
    nom: parentProspect.nom,
    telephone: parentProspect.telephone || null,
    email: parentProspect.email || null,
    etablissement: parentProspect.etablissement || null,
    ville: parentProspect.ville || null,
    siret: parentProspect.siret || null,
    profil_restaurateur: parentProspect.profil_restaurateur || 'primo_accedant',
    nombre_restaurants: parentProspect.nombre_restaurants || 1,
    type_cuisine: clean(parentProspect.type_cuisine),
    nombre_salaries: parentProspect.nombre_salaries,
    ca_annuel_declare: parentProspect.ca_annuel_declare,
    a_expert_comptable: parentProspect.a_expert_comptable || false,
    nom_expert_comptable: parentProspect.nom_expert_comptable || null,
    surface_local_m2: parentProspect.surface_local_m2,
    loyer_mensuel: parentProspect.loyer_mensuel,
    est_franchise: parentProspect.est_franchise || false,
    enseigne_franchise: parentProspect.enseigne_franchise || null,
    nombre_franchises: parentProspect.nombre_franchises || 1,
    intention: clean(parentProspect.intention),
    // Nouveau dossier
    type_dossier: newTypeDossier || 'cession_fonds',
    statut: 'prospect_identifie',
    priorite: 'moyenne',
    source: parentProspect.source || 'autre',
    // Lien vers le client parent (ou le parent du parent si c'est déjà un clone)
    client_parent_id: parentProspect.client_parent_id || parentProspect.id,
    // Reset des champs dossier
    base_calcul: 0,
    montant_forfait: 0,
    taux_pourcentage: 1.3,
    mode_honoraires: 'pourcentage',
    complement_honoraires: 0,
    simulateur_valorisation: false,
    simulateur_estimation: null,
    diaglocal: false,
    guide_recu: false,
    nombre_relances_effectuees: 0,
    date_derniere_interaction: null,
    date_relance: null,
  }

  const { data, error } = await supabase
    .from('prospects')
    .insert(clone)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchDossiersLies(prospectId) {
  // Trouver le "root" client id
  const { data: self, error: selfErr } = await supabase
    .from('prospects')
    .select('id, client_parent_id')
    .eq('id', prospectId)
    .single()

  if (selfErr || !self) return []

  const rootId = self.client_parent_id || prospectId

  // Récupérer le parent
  const { data: parent } = await supabase
    .from('prospects')
    .select('id, nom, type_dossier, statut, ca_estime, date_creation, client_parent_id')
    .eq('id', rootId)

  // Récupérer les enfants
  const { data: children } = await supabase
    .from('prospects')
    .select('id, nom, type_dossier, statut, ca_estime, date_creation, client_parent_id')
    .eq('client_parent_id', rootId)
    .order('date_creation', { ascending: true })

  const all = [...(parent || []), ...(children || [])]
  // Exclure soi-même, dédupliquer par id
  const seen = new Set()
  return all.filter(d => {
    if (d.id === prospectId || seen.has(d.id)) return false
    seen.add(d.id)
    return true
  })
}

// --- Doublons ---

export async function checkDuplicate({ email, telephone, excludeId }) {
  const results = []

  if (email) {
    const { data } = await supabase
      .from('prospects')
      .select('id, nom, email, telephone')
      .eq('email', email.toLowerCase())
      .limit(1)
    if (data?.length && data[0].id !== excludeId) results.push(data[0])
  }

  if (telephone && results.length === 0) {
    // Normaliser : garder que les chiffres pour comparer
    const digits = telephone.replace(/[\s./-]/g, '')
    const { data } = await supabase
      .from('prospects')
      .select('id, nom, email, telephone')
      .limit(100) // on filtre côté client car Supabase ne supporte pas le replace dans les filtres
    if (data) {
      const match = data.find(p =>
        p.id !== excludeId &&
        p.telephone &&
        p.telephone.replace(/[\s./-]/g, '') === digits
      )
      if (match) results.push(match)
    }
  }

  return results.length > 0 ? results[0] : null
}

// --- Notes ---

export async function fetchNotes(prospectId) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('date_creation', { ascending: false })
  if (error) throw error
  return data
}

export async function createNote(note) {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNote(id, updates) {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

// Met à jour le prospect après ajout d'une interaction
// - date_derniere_interaction = date de l'interaction
// - nombre_relances_effectuees += 1 si c'est un appel/email/whatsapp
export async function updateProspectAfterInteraction(prospectId, typeNote, dateInteraction) {
  const TYPES_RELANCE = ['appel', 'email', 'whatsapp']
  const updates = {
    date_derniere_interaction: dateInteraction || new Date().toISOString(),
  }

  if (TYPES_RELANCE.includes(typeNote)) {
    // Récupérer le compteur actuel
    const { data: prospect } = await supabase
      .from('prospects')
      .select('nombre_relances_effectuees')
      .eq('id', prospectId)
      .single()
    updates.nombre_relances_effectuees = (prospect?.nombre_relances_effectuees || 0) + 1
  }

  const { error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', prospectId)
  if (error) throw error
}

// --- Factures ---

export async function fetchFactures(prospectId) {
  const { data, error } = await supabase
    .from('factures')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('date_facture', { ascending: true })
  if (error) throw error
  return data
}

export async function createFacture(facture) {
  const { data, error } = await supabase
    .from('factures')
    .insert(facture)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFacture(id, updates) {
  const { data, error } = await supabase
    .from('factures')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFacture(id) {
  const { error } = await supabase.from('factures').delete().eq('id', id)
  if (error) throw error
}

// --- Commentaires ---

export async function fetchCommentaires() {
  const { data, error } = await supabase
    .from('commentaires')
    .select('*')
    .order('date_creation', { ascending: false })
  if (error) throw error
  return data
}

export async function createCommentaire(contenu) {
  const { data, error } = await supabase
    .from('commentaires')
    .insert({ contenu })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCommentaire(id) {
  const { error } = await supabase.from('commentaires').delete().eq('id', id)
  if (error) throw error
}

// --- Auth ---

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
