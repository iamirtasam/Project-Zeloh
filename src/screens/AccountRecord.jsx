import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

const TX_CONFIG = {
  deposit:            { label: 'Recharge',           bg: '#dcfce7', color: '#16a34a' },
  withdrawal:         { label: 'Withdrawal',          bg: '#fee2e2', color: '#dc2626' },
  ticket_purchase:    { label: 'Ticket Purchase',     bg: '#dbeafe', color: '#2563eb' },
  investment_locked:  { label: 'Investment Locked',   bg: '#e0e7ff', color: '#4338ca' },
  ticket_profit:      { label: 'Profit Received',     bg: '#fef9c3', color: '#b45309' },
  team_earning:       { label: 'Team Earning',        bg: '#f3e8ff', color: '#7c3aed' },
  adjustment_pos:     { label: 'Reward',              bg: '#fff7ed', color: '#ea580c' },
  adjustment_neg:     { label: 'Admin Deduction',     bg: '#f3f4f6', color: '#6b7280' },
  deposit_bonus:      { label: 'Deposit Bonus',       bg: '#fff7ed', color: '#ea580c' },
  invite_bonus:       { label: 'Invite Bonus',        bg: '#f0fdfa', color: '#0d9488' },
  referral_bonus:     { label: 'Referral Bonus',      bg: '#f0fdfa', color: '#0d9488' },
}

const TX_ICONS = {
  deposit:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14m0 0l-5-5m5 5l5-5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  withdrawal:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19V5m0 0l-5 5m5-5l5 5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ticket_purchase:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z" stroke="#2563eb" strokeWidth="1.6"/></svg>,
  investment_locked: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#4338ca" strokeWidth="1.8"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#4338ca"/></svg>,
  ticket_profit:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#b45309" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  team_earning:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#7c3aed" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  adjustment_pos:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="20 12 20 22 4 22 4 12" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="7" width="20" height="5" rx="1" stroke="#ea580c" strokeWidth="1.8"/><line x1="12" y1="22" x2="12" y2="7" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" stroke="#ea580c" strokeWidth="1.8"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="#ea580c" strokeWidth="1.8"/></svg>,
  adjustment_neg:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="#6b7280" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  deposit_bonus:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="20 12 20 22 4 22 4 12" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="7" width="20" height="5" rx="1" stroke="#ea580c" strokeWidth="1.8"/><line x1="12" y1="22" x2="12" y2="7" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" stroke="#ea580c" strokeWidth="1.8"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="#ea580c" strokeWidth="1.8"/></svg>,
  referral_bonus:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  invite_bonus:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ` +
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function SkelDark({ w = '100%', h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
}

export default function AccountRecord() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/account-history`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      if (!res.ok) { setError(d.message || `Error ${res.status}`); return }
      setHistory(d.history || d.transactions || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Account Record</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '12px 14px' }}>
        {error ? (
          <div style={{ background: '#fee2e2', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</p>
            <button onClick={load} style={{ marginTop: 10, background: '#dc2626', color: 'white', border: 'none', borderRadius: 50, padding: '8px 20px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkelDark w="55%" h={12} r={5} />
                  <SkelDark w="35%" h={10} r={5} />
                </div>
                <SkelDark w={60} h={14} r={5} />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D1D5DB" strokeWidth="1.5"/>
              <path d="M8 12h8M8 8h8M8 16h5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>No records yet</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
            {history.map((tx, i) => {
              const isInvestment = tx.type === 'ticket_purchase' && tx.note && tx.note.startsWith('Investment')
              const txKey = tx.type === 'adjustment'
                ? (parseFloat(tx.amount) >= 0 ? 'adjustment_pos' : 'adjustment_neg')
                : isInvestment ? 'investment_locked' : tx.type
              const cfg = TX_CONFIG[txKey] || TX_CONFIG.adjustment_neg
              const icon = TX_ICONS[txKey] || TX_ICONS.adjustment_neg
              const amt = parseFloat(tx.amount || 0)
              const pos = amt >= 0
              return (
                <div key={tx.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 2 }}>{cfg.label}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(tx.created_at)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: pos ? '#16a34a' : '#dc2626' }}>
                        {pos ? '+' : ''}${Math.abs(amt).toFixed(2)}
                      </span>
                      {tx.status === 'pending' && (
                        <div style={{ marginTop: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 50, padding: '1px 6px' }}>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {i < history.length - 1 && <div style={{ height: 1, background: '#F9FAFB', margin: '0 14px' }} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
