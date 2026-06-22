import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'
import Toast, { useToast } from '../components/Toast'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

export default function SettingsWallet() {
  const navigate       = useNavigate()
  const { toasts, show } = useToast()
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [walletType, setWalletType] = useState('TRC20')
  const [address, setAddress]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

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

  async function handleSave() {
    setError('')
    if (!address.trim()) return setError('Please enter a wallet address')
    setSaving(true)
    try {
      const res = await fetch(`${API}/set-wallet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address.trim(), wallet_type: walletType }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) return setError(d.message || 'Failed to save')
      show('Wallet address saved successfully')
      setTimeout(() => navigate('/my'), 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const alreadySet = !!user?.wallet_address

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>
      <Toast toasts={toasts} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Wallet Address</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ height: 60, background: '#F3F4F6', borderRadius: 12 }} />
        ) : alreadySet ? (
          <>
            <div style={{ background: '#F3F4F6', borderRadius: 12, padding: '14px', fontFamily: 'monospace', fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>
              {user.wallet_type}: {user.wallet_address}
            </div>
            <div style={{ background: '#FEF9E7', border: '1px solid #F5C518', borderRadius: 12, padding: '14px', fontSize: 13, color: '#92400e' }}>
              Wallet address can only be set once. Contact support to change it.
            </div>
          </>
        ) : (
          <>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Wallet Type</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {['TRC20', 'ERC20'].map(t => (
                  <button key={t} onClick={() => setWalletType(t)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    background: walletType === t ? GOLD : '#F3F4F6',
                    color: walletType === t ? '#1a1a1a' : '#6B7280',
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Wallet Address</p>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={`Enter your ${walletType} address`}
                style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ background: '#FEF9E7', border: '1px solid #F5C518', borderRadius: 12, padding: '14px', fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
              Please double-check your wallet address. Once saved, it cannot be changed without contacting support. We are not responsible for funds sent to wrong addresses.
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '14px 0', borderRadius: 50, background: saving ? '#E5E7EB' : GOLD, border: 'none', fontWeight: 700, fontSize: 14, color: saving ? '#9CA3AF' : '#1a1a1a', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save Wallet Address'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
