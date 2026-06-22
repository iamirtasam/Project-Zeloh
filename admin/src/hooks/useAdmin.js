import { useState, useEffect } from 'react'
import { getToken, clearToken } from '../lib/api'

export function useAdmin() {
  const [admin, setAdmin] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const t = getToken()
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          setAdmin({ email: payload.email || payload.id, id: payload.id })
        } else {
          clearToken()
        }
      } catch {
        clearToken()
      }
    }
    setChecked(true)
  }, [])

  function logout() {
    clearToken()
    setAdmin(null)
    window.location.href = '/login'
  }

  return { admin, checked, logout, setAdmin }
}
