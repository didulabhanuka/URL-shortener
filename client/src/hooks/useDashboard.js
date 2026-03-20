import { useState, useEffect } from 'react'
import api from '../lib/api'

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchOverview() {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await api.get('/api/analytics/overview')
      setData(res)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOverview() }, [])

  return { data, loading, error, refetch: fetchOverview }
}