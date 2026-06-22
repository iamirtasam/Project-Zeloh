import { jwtDecode } from 'jwt-decode'
import { useNavigate } from 'react-router-dom'

const TOKEN_KEY = 'zeloh_token'

function decodeValid(token, storage) {
  try {
    const decoded = jwtDecode(token)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      storage.removeItem(TOKEN_KEY)
      return null
    }
    return decoded
  } catch {
    storage.removeItem(TOKEN_KEY)
    return null
  }
}

export function getToken() {
  // Check localStorage first (remember me), then sessionStorage
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null
}

export function getUser() {
  const lsToken = localStorage.getItem(TOKEN_KEY)
  if (lsToken) return decodeValid(lsToken, localStorage)
  const ssToken = sessionStorage.getItem(TOKEN_KEY)
  if (ssToken) return decodeValid(ssToken, sessionStorage)
  return null
}

export function isLoggedIn() {
  return getUser() !== null
}

export function saveToken(token, rememberMe = false) {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token)
    sessionStorage.removeItem(TOKEN_KEY)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function useAuth() {
  const navigate = useNavigate()
  const token = getToken()
  const user = getUser()

  function logout() {
    clearToken()
    navigate('/', { replace: true })
  }

  return { user, token, isLoggedIn: user !== null, logout }
}
