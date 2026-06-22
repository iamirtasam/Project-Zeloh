import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function truncateAddr(addr) {
  if (!addr || addr.length <= 20) return addr
  return addr.slice(0, 14) + '...' + addr.slice(-6)
}

export default function WithdrawSubmit() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const params    = new URLSearchParams(location.search)
  const amount    = parseFloat(params.get('amount') || '0')
  const fee       = Math.max(1, parseFloat((amount * 0.10).toFixed(2)))
  const receive   = Math.max(0, parseFloat((amount - fee).toFixed(2)))

  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [fpwd, setFpwd]         = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [copied, setCopied]     = useState(false)

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

  async function handleSubmit() {
    setError('')
    if (!fpwd.trim()) return setError('Please enter your funding password')
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/submit-withdrawal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, funding_password: fpwd }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) return setError(d.message || 'Submission failed')
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
          <button onClick={() => navigate(`/withdraw-channel?amount=${amount}`)} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Submit Withdrawal</span>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary */}
          <div style={{ background: '#F9FAFB', borderRadius: 16, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Withdrawing:</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>${fmt(amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Fee (10%):</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4444' }}>-${fmt(fee)}</span>
            </div>
            <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>You will receive:</span>
              <span style={{ fontWeight: 900, fontSize: 15, color: '#16a34a' }}>${fmt(receive)}</span>
            </div>
            {user?.wallet_type && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'right' }}>Network: {user.wallet_type}</p>
            )}
          </div>

          {/* Wallet address */}
          {!loading && (
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 6 }}>Your withdrawal address:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F4F6', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#374151', wordBreak: 'break-all' }}>
                  {truncateAddr(user?.wallet_address || '')}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(user?.wallet_address || ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '5px 10px', fontWeight: 700, fontSize: 11, color: '#1a1a1a', cursor: 'pointer', flexShrink: 0 }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>Wrong address? Contact support to update it.</p>
            </div>
          )}

          {/* Funding password */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 6 }}>Funding Password</p>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', gap: 8 }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={fpwd}
                onChange={e => setFpwd(e.target.value)}
                placeholder="Enter your funding password"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111' }}
              />
              <button onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {showPwd
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="#9CA3AF" strokeWidth="1.8"/></svg>}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Withdrawal Instructions:</p>
            {[
              'Please confirm your wallet address is correct. We are not responsible for losses due to incorrect address.',
              'New users will only be able to withdraw their balance after 7 days of account creation.',
              'Withdrawal will be processed within 2-72 hours after admin approval.',
              'You can only apply for 1 withdrawal per day.',
              '10% fee is deducted from withdrawal amount. Minimum fee is $1.',
            ].map((t, i) => (
              <p key={i} style={{ fontSize: 12, color: '#6B7280', marginBottom: i < 3 ? 6 : 0, display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{i+1}.</span>
                <span>{t}</span>
              </p>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !fpwd.trim()}
            style={{ padding: '14px 0', borderRadius: 50, background: submitting || !fpwd.trim() ? '#E5E7EB' : GOLD, border: 'none', fontWeight: 700, fontSize: 15, color: submitting || !fpwd.trim() ? '#9CA3AF' : '#1a1a1a', cursor: submitting || !fpwd.trim() ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Confirm Withdrawal'}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 390, margin: '0 auto', left: 0, right: 0 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 28px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', margin: '0 24px' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px' }}>
              <circle cx="12" cy="12" r="11" fill={GOLD}/>
              <path d="M7 12l3.5 3.5L17 8" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontWeight: 900, fontSize: 18, color: '#111', marginBottom: 8 }}>Withdrawal Submitted!</p>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
              Your request is being reviewed. Funds will arrive within 2-72 hours.
            </p>
            <button onClick={() => navigate('/')} style={{ width: '100%', padding: '13px 0', borderRadius: 50, background: GOLD, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#1a1a1a' }}>
              Back to Home
            </button>
          </div>
        </div>
      )}
    </>
  )
}
