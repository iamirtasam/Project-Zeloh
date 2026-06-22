import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function Withdraw() {
  const navigate = useNavigate()
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')

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

  const amt     = parseFloat(amount) || 0
  const fee     = Math.max(1, parseFloat((amt * 0.10).toFixed(2)))
  const receive = Math.max(0, parseFloat((amt - fee).toFixed(2)))

  function handleOk() {
    if (amt < 10) return
    navigate(`/withdraw-channel?amount=${amt}`)
  }

  const hasWallet   = !!user?.wallet_address
  const hasFunding  = !!user?.has_funding_password

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Withdraw</span>
        <button onClick={() => navigate('/withdrawal-record')} style={{ background: 'none', border: 'none', fontWeight: 700, fontSize: 13, color: GOLD, cursor: 'pointer' }}>
          Withdrawal Record
        </button>
      </div>

      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Balance card */}
        <div style={{ background: '#1a1a1a', borderRadius: 18, padding: '24px 20px', textAlign: 'center' }}>
          {loading ? (
            <div style={{ height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 8, width: 140, margin: '0 auto' }} />
          ) : (
            <p style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>${fmt(user?.balance)}</p>
          )}
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Available balance</p>
        </div>

        {/* Wallet warning */}
        {!loading && !hasWallet && (
          <div style={{ background: '#FEF9E7', border: '1px solid #F5C518', borderRadius: 12, padding: '14px 14px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>You haven't set a withdrawal wallet yet</p>
            <button onClick={() => navigate('/settings-wallet')} style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '9px 18px', fontWeight: 700, fontSize: 12, color: '#1a1a1a', cursor: 'pointer' }}>
              Set Wallet Address
            </button>
          </div>
        )}

        {/* Funding password warning */}
        {!loading && !hasFunding && (
          <div style={{ background: '#FEF9E7', border: '1px solid #F5C518', borderRadius: 12, padding: '14px 14px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>You haven't set a funding password yet</p>
            <button onClick={() => navigate('/settings-funding-password')} style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '9px 18px', fontWeight: 700, fontSize: 12, color: '#1a1a1a', cursor: 'pointer' }}>
              Set Funding Password
            </button>
          </div>
        )}

        {/* Form (only shown when both are set) */}
        {!loading && hasWallet && hasFunding && (
          <>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 10 }}>Withdrawal Amount</p>
              <div style={{ borderBottom: '2px solid #F5C518', paddingBottom: 6 }}>
                <input
                  type="number"
                  min="10"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, color: '#111' }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>Min withdrawal: $10</p>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>10% withdrawal fee applies</p>
              {amt > 0 && (
                <p style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                  Fee: <span style={{ color: '#ef4444' }}>${fee.toFixed(2)}</span>
                  {' '}|{' '}
                  You receive: <span style={{ color: '#16a34a' }}>${receive.toFixed(2)}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleOk}
              disabled={amt < 10}
              style={{ padding: '14px 0', borderRadius: 50, background: amt >= 10 ? GOLD : '#E5E7EB', border: 'none', fontWeight: 700, fontSize: 15, color: amt >= 10 ? '#1a1a1a' : '#9CA3AF', cursor: amt >= 10 ? 'pointer' : 'not-allowed' }}
            >
              OK to Withdraw
            </button>
          </>
        )}
      </div>
    </div>
  )
}
