import { useNavigate, useLocation } from 'react-router-dom'

const GOLD = '#F5C518'

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function WithdrawChannel() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const amount = params.get('amount') || '0'

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate(`/withdraw`)} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Withdrawal Channel</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '20px 16px' }}>
        <button
          onClick={() => navigate(`/withdraw-submit?amount=${amount}`)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: 'white', border: '1px solid #F3F4F6', borderRadius: 18, padding: '16px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', cursor: 'pointer' }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#F97316,#F5C518)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8"/><path d="M9 8h4a2 2 0 010 4H9v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12h5a2 2 0 010 4H9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="6" x2="12" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="16" x2="12" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#111' }}>Crypto Withdrawal</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>TRC20 / ERC20 · ${amount}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 50, border: `1.5px solid ${GOLD}`, color: GOLD, whiteSpace: 'nowrap' }}>
            Click to withdraw
          </span>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}
