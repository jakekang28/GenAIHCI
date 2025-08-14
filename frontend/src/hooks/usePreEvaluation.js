import { useState, useEffect } from 'react'
import apiService from '../services/apiService' // Add this import

export function usePreEvaluation(
  initQ,
  persona
) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false) // Remove TypeScript syntax
  const [error, setError] = useState(null) // Remove TypeScript syntax

  useEffect(() => {
    if (!initQ) return

    let isCancelled = false
    setLoading(true)
    setError(null)

    // Fix: Call the API service properly
    apiService.preEvaluation(initQ, persona)
      .then((json) => {
        if (!isCancelled) {
          console.log('PreEvaluation response received:', json); // Debug log
          setData(json)
        }
      })
      .catch(err => {
        if (!isCancelled) {
          console.error('PreEvaluation error:', err); // Debug log
          setError(err)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [initQ, persona])

  return { data, loading, error }
}