import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SkeletonCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 80, height: 80, borderRadius: 12, background: '#F3F4F6', flexShrink: 0, animation: 'shim 1.4s ease-in-out infinite' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <div style={{ height: 14, borderRadius: 5, background: '#F3F4F6', width: '70%', animation: 'shim 1.4s ease-in-out infinite' }} />
          <div style={{ height: 11, borderRadius: 5, background: '#F3F4F6', width: '50%', animation: 'shim 1.4s ease-in-out infinite' }} />
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 50, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ height: 28, width: 60, borderRadius: 6, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
        <div style={{ height: 28, width: 80, borderRadius: 6, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
        <div style={{ height: 28, width: 60, borderRadius: 6, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
      </div>
      <div style={{ height: 40, borderRadius: 50, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
    </div>
  )
}

export default function AllInvestments() {
  const navigate = useNavigate()
  const [tab, setTab]             = useState('stable')
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [myInvestments, setMyInv] = useState([])

  const load = useCallback((type) => {
    setLoading(true)
    fetch(`${API}/investments?type=${type}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load('stable')
    const token = getToken()
    if (token) {
      fetch(`${API}/my-investments`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setMyInv(d.investments || [])).catch(() => {})
    }
  }, [load])

  function switchTab(key) {
    setTab(key)
    load(key === 'stable' ? 'stable' : 'high_yield')
  }

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Film & Product Investment</span>
        <div style={{ width: 22 }} />
      </div>

      {/* Pill tab toggle */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', borderRadius: 50, border: '1.5px solid #E5E7EB', overflow: 'hidden', background: 'white' }}>
          {[{ key: 'stable', label: 'Stable Investment' }, { key: 'high', label: 'High Yield Investment' }].map((t, i) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{
                flex: 1, padding: '11px 4px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                background: tab === t.key ? GOLD : 'white',
                color: tab === t.key ? '#1a1a1a' : '#9CA3AF',
                borderRight: i === 0 ? '1.5px solid #E5E7EB' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <rect x="2" y="7" width="20" height="14" rx="3" stroke="#D1D5DB" strokeWidth="1.5"/>
              <path d="M16 7V5a2 2 0 00-4 0v2M12 12v4" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>No investments available yet</p>
          </div>
        ) : (
          products.map(card => {
            const myInv = myInvestments.find(inv => inv.product_id === card.id)
            const pct   = Math.min(100, Math.round((parseFloat(card.funded_amount) / parseFloat(card.funding_goal)) * 100))
            const full  = pct >= 100

            if (myInv) {
              const isFunded = card.is_funded
              return (
                <div key={card.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    {card.image_url ? (
                      <img src={card.image_url} alt={card.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0, background: isFunded ? 'linear-gradient(135deg,#F5C518,#E0B000)' : '#F3F4F6' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 14, color: '#111', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</p>
                      <p style={{ fontSize: 12, color: isFunded ? '#16a34a' : '#9CA3AF', fontWeight: 700 }}>{isFunded ? 'Active Investment' : 'Awaiting Funding Goal'}</p>
                    </div>
                  </div>
                  {isFunded ? (
                    <>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Day {myInv.days_elapsed} of {myInv.total_days}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{myInv.progress_percent}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 50, background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 50, background: GOLD, width: `${myInv.progress_percent}%`, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 18, fontWeight: 900, color: GOLD, lineHeight: 1 }}>${parseFloat(myInv.current_earnings).toFixed(2)}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Current Earnings</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 18, fontWeight: 900, color: '#111', lineHeight: 1 }}>${fmt(myInv.amount)}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Total Investment</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Matures in {myInv.days_remaining} day{myInv.days_remaining !== 1 ? 's' : ''}</p>
                    </>
                  ) : (
                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>${fmt(myInv.amount)} locked</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Earnings begin when funding goal is reached</p>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={card.id} style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0, background: full ? 'linear-gradient(135deg,#F5C518,#E0B000)' : 'linear-gradient(135deg,#1a237e,#283593)' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: '#111', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>Funded: ${parseFloat(card.funded_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{full ? 'Completed 100%' : `${pct}% Funded`}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 50, background: '#F3F4F6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 50, background: GOLD, width: `${pct}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{card.roi_percent}%</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>ROI</p>
                  </div>
                  <div style={{ width: 1, height: 36, background: '#F3F4F6' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#111', lineHeight: 1 }}>${fmt(card.min_investment)}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Min</p>
                  </div>
                  <div style={{ width: 1, height: 36, background: '#F3F4F6' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1 }}>{card.duration_days}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Days</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/investment/${card.id}`)}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 50, background: '#1a1a1a', border: 'none', fontWeight: 800, fontSize: 14, color: 'white', cursor: 'pointer' }}
                >
                  See Details
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
