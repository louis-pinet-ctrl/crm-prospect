import { useState, useEffect, useCallback } from 'react'
import {
  fetchProspects,
  fetchFacturesTotaux,
  createProspect,
  updateProspect,
  deleteProspect,
} from '../lib/supabase'

export function useProspects() {
  const [prospects, setProspects] = useState([])
  const [facturesTotaux, setFacturesTotaux] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [data, totaux] = await Promise.all([
        fetchProspects(),
        fetchFacturesTotaux(),
      ])
      setProspects(data)
      setFacturesTotaux(totaux)
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

  return { prospects, facturesTotaux, loading, error, reload: load, add, update, remove }
}
