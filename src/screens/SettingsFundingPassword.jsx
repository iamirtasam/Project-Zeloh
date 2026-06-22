import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'
import Toast, { useToast } from '../components/Toast'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

export default function SettingsFundingPassword() {
  const navigate         = useNavigate()
  const { toasts, show } = useToast()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [pw, setPw]           = useState('')
  const [pw2, setPw2]         = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      setUser(d.user || d)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const checks = [
    { label: 'At least 6 characters', ok: pw.length >= 6 },
    { label: 'At most 20 characters', ok: pw.length <= 20 && pw.length > 0 },
    { label: 'Passwords match',       ok: pw === pw2 && pw.length > 0 },
  ]
  const valid = checks.every(c => c.ok)

  async function handleSave() {
    setError('')
    if (!valid) return setError('Please meet all requirements')
    setSaving(true)
    try {
      const res = await fetch(`${API}/set-funding-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ funding_password: pw, confirm_funding_password: pw2 }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) return setError(d.message || 'Failed to set password')
      show('Funding password set successfully')
      setTimeout(() => navigate('/my'), 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const alreadySet = !!user?.has_funding_password

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>
      <Toast toasts={toasts} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Funding Password</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ height: 60, background: '#F3F4F6', borderRadius: 12 }} />
        ) : alreadySet ? (
          <>
            <div style={{ background: '#F3F4F6', borderRadius: 12, padding: '16px', fontSize: 14, color: '#374151', fontWeight: 600 }}>
              Funding password is already set.
            </div>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              To change your funding password, please contact support.
            </p>
          </>
        ) : (
          <>
            {/* Password input 1 */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>New Funding Password</p>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', gap: 8 }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="Enter funding password"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111' }}
                />
                <button onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="#9CA3AF" strokeWidth="1.8"/></svg>}
                </button>
              </div>
            </div>

            {/* Password input 2 */}
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Confirm Funding Password</p>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', gap: 8 }}>
                <input
                  type={showPw2 ? 'text' : 'password'}
                  value={pw2}
                  onChange={e => setPw2(e.target.value)}
                  placeholder="Re-enter funding password"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111' }}
                />
                <button onClick={() => setShowPw2(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw2
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="#9CA3AF" strokeWidth="1.8"/></svg>}
                </button>
              </div>
            </div>

            {/* Requirements checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {checks.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.ok ? '#22c55e' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {c.ok && <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 12, color: c.ok ? '#16a34a' : '#9CA3AF', fontWeight: 600 }}>{c.label}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#FEF9E7', border: '1px solid #F5C518', borderRadius: 12, padding: '14px', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
              Your funding password is required for withdrawals. Store it safely — it cannot be recovered without contacting support.
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!valid || saving}
              style={{ padding: '14px 0', borderRadius: 50, background: valid && !saving ? GOLD : '#E5E7EB', border: 'none', fontWeight: 700, fontSize: 14, color: valid && !saving ? '#1a1a1a' : '#9CA3AF', cursor: valid && !saving ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Saving...' : 'Set Funding Password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
