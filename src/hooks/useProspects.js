import { useState, useEffect, useCallback } from 'react'
import {
  fetchProspects,
  fetchAllFactures,
  createProspect,
  updateProspect,
  deleteProspect,
} from '../lib/supabase'

export function useProspects() {
  const [prospects, setProspects] = useState([])
  const [allFactures, setAllFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [data, factures] = await Promise.all([
        fetchProspects(),
        fetchAllFactures(),
      ])
      setProspects(data)
      setAllFactures(factures)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async (prospect) => {
    const data = await createProspect(prospect)
    setProspects(prev => [...prev, data])
    return data
  }

  const update = async (id, updates) => {
    const data = await updateProspect(id, updates)
    setProspects(prev => prev.map(p => (p.id === id ? data : p)))
    return data
  }

  const remove = async (id) => {
    await deleteProspect(id)
    setProspects(prev => prev.filter(p => p.id !== id))
  }

  return { prospects, allFactures, loading, error, reload: load, add, update, remove }
}
