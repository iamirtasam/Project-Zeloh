import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' ·')
}

const STATUS_MAP = {
  pending:  { label: 'Pending',   bg: '#F5C518', color: '#1a1a1a' },
  approved: { label: 'Completed', bg: '#22c55e', color: '#ffffff' },
  rejected: { label: 'Rejected',  bg: '#ef4444', color: '#ffffff' },
}

function SkelDark({ w = '100%', h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
}

export default function WithdrawalRecord() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/my-withdrawals`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      setRecords(d.withdrawals || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/withdraw')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Withdrawal Record</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <SkelDark w={60} h={20} r={50} />
                <SkelDark w={80} h={20} r={50} />
              </div>
              <SkelDark w={120} h={14} r={5} />
              <SkelDark w={90} h={12} r={5} />
            </div>
          ))
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D1D5DB" strokeWidth="1.5"/>
              <path d="M8 12h8M8 8h8M8 16h5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>No withdrawal records yet</p>
          </div>
        ) : records.map(rec => {
          const st   = STATUS_MAP[rec.status] || STATUS_MAP.pending
          const fee  = Math.max(1, parseFloat((rec.amount * 0.10).toFixed(2)))
          const recv = Math.max(0, parseFloat((rec.amount - fee).toFixed(2)))
          return (
            <div key={rec.id} style={{ background: 'white', borderRadius: 16, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: '#F3F4F6', color: '#374151' }}>
                  {rec.wallet_type || 'Crypto'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14, color: '#111' }}>Amount: ${fmt(rec.amount)}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Fee: ${fmt(fee)}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>Received: ${fmt(recv)}</p>
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right' }}>{fmtDate(rec.submitted_at)}</p>
              </div>
              {rec.status === 'rejected' && rec.note && (
                <p style={{ fontSize: 12, color: '#ef4444', fontStyle: 'italic' }}>{rec.note}</p>
              )}
              {rec.reviewed_at && (
                <p style={{ fontSize: 10, color: '#D1D5DB', textAlign: 'right' }}>Reviewed: {fmtDate(rec.reviewed_at)}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
