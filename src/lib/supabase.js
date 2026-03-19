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
