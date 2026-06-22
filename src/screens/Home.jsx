/*
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  profit_percent DECIMAL(5,2) NOT NULL,
  duration_hours INTEGER NOT NULL,
  min_investment DECIMAL(10,2) DEFAULT 10,
  section TEXT DEFAULT 'popular',
  -- sections: popular, showing_up
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE investment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  type TEXT NOT NULL,
  -- types: stable, high_yield
  funded_amount DECIMAL(14,2) DEFAULT 0,
  funding_goal DECIMAL(14,2) NOT NULL,
  roi_percent DECIMAL(7,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  min_investment DECIMAL(10,2) DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW()
);
*/

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useStatusBarColor } from '../hooks/useStatusBarColor'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL

// ── SVG Icons ────────────────────────────────────────────────
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M2 10h20" stroke="white" strokeWidth="1.8" />
      <circle cx="17" cy="15" r="1.5" fill="white" />
      <path d="M16 6l2-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5m0 0l-7 7m7-7l7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilmIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M7 4v4M7 16v4M12 4v16M17 4v4M17 16v4M2 8h20M2 16h20" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function HeadphonesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 18v-6a9 9 0 0118 0v6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="14" width="4" height="6" rx="2" stroke="white" strokeWidth="1.8" />
      <rect x="17" y="14" width="4" height="6" rx="2" stroke="white" strokeWidth="1.8" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Static action buttons data ────────────────────────────────
const ACTIONS = [
  { label: 'Recharge Balance',    bg: '#F5C518', route: '/recharge', Icon: WalletIcon },
  { label: 'Withdrawal Balance',  bg: '#3B82F6', route: '/withdraw', Icon: ArrowUpIcon },
  { label: 'ROI Investment',     bg: '#F97316', route: '/all-investments', Icon: FilmIcon },
  { label: 'Help Center',         bg: '#14B8A6', route: '/service',  Icon: HeadphonesIcon },
]

// ── Carousel ─────────────────────────────────────────────────
function Carousel() {
  const navigate    = useNavigate()
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex]     = useState(0)
  const timerRef    = useRef(null)
  const startXRef   = useRef(null)

  useEffect(() => {
    fetch(`${API}/banners`)
      .then(r => r.json())
      .then(d => setBanners(d.banners || []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false))
  }, [])

  const total = banners.length

  const resetTimer = useCallback((nextIndex, bannerCount) => {
    clearInterval(timerRef.current)
    if (bannerCount < 2) return
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % bannerCount)
    }, 3000)
  }, [])

  useEffect(() => {
    resetTimer(index, total)
    return () => clearInterval(timerRef.current)
  }, [total, resetTimer])

  function goTo(i) {
    setIndex(i)
    resetTimer(i, total)
  }

  const onTouchStart = e => {
    clearInterval(timerRef.current)
    startXRef.current = e.touches[0].clientX
  }

  const onTouchEnd = e => {
    const diff = startXRef.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50 && total > 1) {
      const next = diff > 0 ? (index + 1) % total : (index - 1 + total) % total
      goTo(next)
    } else {
      resetTimer(index, total)
    }
  }

  if (loading) {
    return (
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ height: 148 }}>
        <div className="skeleton w-full h-full" style={{ borderRadius: 16 }} />
        <div className="flex gap-1.5 justify-center mt-2">
          {[0,1,2].map(i => <div key={i} className="skeleton rounded-full" style={{ width: i === 0 ? 18 : 6, height: 6 }} />)}
        </div>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="mx-4 rounded-2xl overflow-hidden skeleton" style={{ height: 148, borderRadius: 16 }} />
    )
  }

  return (
    <div className="mx-4 rounded-2xl overflow-hidden" style={{ height: 148, position: 'relative' }}>
      {/* Sliding track */}
      <div
        style={{
          display: 'flex',
          width: `${total * 100}%`,
          height: '100%',
          transform: `translateX(-${(index / total) * 100}%)`,
          transition: 'transform 0.35s ease-in-out',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {banners.map((b, i) => (
          <div
            key={b.id}
            style={{ width: `${100 / total}%`, height: '100%', flexShrink: 0, cursor: b.link_url ? 'pointer' : 'default' }}
            onClick={() => {
              // L5 — only follow the link when it's an internal path or a
              // safe http(s) URL. Anything else (javascript:, data:, etc.) is
              // ignored to prevent admin-controlled open-redirect / XSS.
              const url = b.link_url
              if (!url) return
              if (typeof url === 'string' && url.startsWith('/')) {
                navigate(url)
              } else {
                try {
                  const parsed = new URL(url)
                  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }
                } catch { /* invalid URL — ignore */ }
              }
            }}
          >
            <img
              src={b.image_url}
              alt=""
              draggable="false"
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                userSelect: 'none',
                WebkitUserDrag: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
          {banners.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 50,
                background: i === index ? 'white' : 'rgba(255,255,255,0.45)',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ticker ────────────────────────────────────────────────────
function Ticker() {
  return (
    <div
      className="flex items-center gap-2 px-3 overflow-hidden"
      style={{ background: '#F5C518', height: 32 }}
    >
      <span className="flex-shrink-0"><SpeakerIcon /></span>
      <div className="overflow-hidden flex-1" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            animation: 'tickerScroll 18s linear infinite',
            fontSize: 12,
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Welcome to Zeloh! Invest in movies and earn daily profits. New movies added every week.
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Welcome to Zeloh! Invest in movies and earn daily profits. New movies added every week.
        </div>
      </div>
    </div>
  )
}

// ── Skeleton helpers ──────────────────────────────────────────
function SkeletonPopularRow() {
  return (
    <div className="flex px-4 gap-3 overflow-hidden">
      {[0,1,2,3].map(i => (
        <div key={i} className="flex-shrink-0 w-28">
          <div className="skeleton rounded-xl" style={{ width: 112, height: 112 }} />
          <div className="skeleton mt-2 rounded" style={{ height: 10, width: '80%' }} />
          <div className="skeleton mt-1 rounded" style={{ height: 8, width: '55%' }} />
        </div>
      ))}
    </div>
  )
}

function SkeletonGridCard() {
  return (
    <div>
      <div className="skeleton rounded-xl" style={{ height: 140 }} />
      <div className="skeleton mt-2 rounded" style={{ height: 10, width: '80%' }} />
      <div className="skeleton mt-1 rounded" style={{ height: 8, width: '60%' }} />
    </div>
  )
}

function SkeletonInvestCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="skeleton rounded-xl flex-shrink-0" style={{ width: 52, height: 52 }} />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <div className="skeleton rounded" style={{ height: 11, width: '70%' }} />
          <div className="skeleton rounded" style={{ height: 9, width: '50%' }} />
        </div>
      </div>
      <div className="skeleton rounded-full" style={{ height: 6 }} />
      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <div className="skeleton rounded" style={{ height: 22, width: 50 }} />
          <div className="skeleton rounded" style={{ height: 8, width: 28 }} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          <div className="skeleton rounded" style={{ height: 22, width: 60 }} />
          <div className="skeleton rounded" style={{ height: 8, width: 80 }} />
        </div>
      </div>
      <div className="skeleton rounded-xl" style={{ height: 38 }} />
    </div>
  )
}

function SkeletonNewsRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="skeleton rounded-xl flex-shrink-0" style={{ width: 52, height: 52 }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton rounded" style={{ height: 10, width: '90%' }} />
        <div className="skeleton rounded" style={{ height: 10, width: '70%' }} />
        <div className="skeleton rounded" style={{ height: 8, width: '35%' }} />
      </div>
    </div>
  )
}

// ── Main Screen ───────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  useStatusBarColor('#1a1a1a')

  const [popular,   setPopular]   = useState([])
  const [showing,   setShowing]   = useState([])
  const [news,      setNews]      = useState([])
  const [popLoad,   setPopLoad]   = useState(true)
  const [showLoad,  setShowLoad]  = useState(true)
  const [newsLoad,  setNewsLoad]  = useState(true)
  const [testMode,  setTestMode]  = useState(null)
  const [popup,     setPopup]     = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    if (!API) return
    const check = async () => {
      try {
        const res = await fetch(`${API}/config/test-mode`)
        if (res.ok) setTestMode(await res.json())
      } catch { /* non-critical — never crash the app */ }
    }
    check()
  }, [])

  useEffect(() => {
    if (!API) return
    const fetchPopup = async () => {
      try {
        const res = await fetch(`${API}/popup-settings`)
        if (!res.ok) return
        const data = await res.json()
        if (!data.enabled || !data.image_url) return
        if (data.show_once && sessionStorage.getItem('zeloh_popup_shown')) return
        setPopup(data)
        setTimeout(() => {
          setShowPopup(true)
          if (data.show_once) sessionStorage.setItem('zeloh_popup_shown', '1')
        }, 500)
      } catch { /* popup is non-critical — never crash */ }
    }
    fetchPopup()
  }, [])

  function closePopup() {
    setShowPopup(false)
    setTimeout(() => setPopup(null), 300)
  }

  useEffect(() => {
    const t1 = setTimeout(() => setPopLoad(false), 1500)
    const t2 = setTimeout(() => setShowLoad(false), 1500)
    const t3 = setTimeout(() => setNewsLoad(false), 1500)

    fetch(`${API}/movies?section=popular&limit=6`)
      .then(r => r.json()).then(d => setPopular(d.movies || [])).catch(() => setPopular([])).finally(() => { setPopLoad(false); clearTimeout(t1) })

    fetch(`${API}/movies?section=showing_up&limit=10`)
      .then(r => r.json()).then(d => setShowing(d.movies || [])).catch(() => setShowing([])).finally(() => { setShowLoad(false); clearTimeout(t2) })

    fetch(`${API}/news?limit=5`)
      .then(r => r.json()).then(d => setNews(d.news || [])).catch(() => setNews([])).finally(() => { setNewsLoad(false); clearTimeout(t3) })

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-white" style={{ paddingBottom: 72 }}>

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pb-3" style={{ background: '#1a1a1a', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
          <span className="text-xl font-extrabold tracking-tight" style={{ color: '#F5C518' }}>Zeloh</span>
          <button className="relative p-1" onClick={() => navigate('/notifications')}>
            <BellIcon />
            <span className="absolute top-1 right-1 rounded-full" style={{ width: 7, height: 7, background: '#EF4444' }} />
          </button>
        </div>

        {/* Ticker */}
        <Ticker />

        {/* Carousel */}
        <div className="mt-4"><Carousel /></div>

        {/* Action Buttons */}
        <div className="flex items-start justify-between px-4 mt-5 gap-1">
          {ACTIONS.map(({ label, bg, route, Icon }) => (
            <button key={route} onClick={() => navigate(route)} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
              <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: bg }}>
                <Icon />
              </div>
              <span className="text-center text-gray-700 font-medium leading-tight" style={{ fontSize: 10, maxWidth: 60 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Popular List */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <span className="font-bold text-sm text-gray-900">Popular List</span>
            <button onClick={() => navigate('/movies')} className="flex items-center gap-0.5 text-gray-400 text-xs font-medium">
              More <ChevronRightIcon />
            </button>
          </div>
          {popLoad ? <SkeletonPopularRow /> : (
            popular.length === 0
              ? <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: '8px 0 4px' }}>This section is currently empty</p>
              : <div className="flex px-4 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {popular.map(m => (
                    <div key={m.id} className="flex-shrink-0 w-28 mr-3" onClick={() => navigate(`/movie/${m.id}`)} style={{ cursor: 'pointer' }}>
                      <div className="relative w-28 rounded-xl overflow-hidden" style={{ height: 112 }}>
                        {m.poster_url
                          ? <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full skeleton" style={{ borderRadius: 12 }} />
                        }
                        <span className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#F5C518', color: '#1a1a1a' }}>Buy</span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-gray-900 truncate">{m.title}</p>
                      <p className="text-xs text-gray-400">+{m.profit_percent}% / {m.duration_hours}hrs</p>
                    </div>
                  ))
              }
            </div>
          )}
        </div>

        {/* Showing Up */}
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <span className="font-bold text-sm text-gray-900">Showing Up</span>
            <button onClick={() => navigate('/movies')} className="flex items-center gap-0.5 text-gray-400 text-xs font-medium">
              View All <ChevronRightIcon />
            </button>
          </div>
          {showLoad ? (
            <div className="grid grid-cols-2 gap-3 px-4">
              {[0,1,2,3,4,5].map(i => <SkeletonGridCard key={i} />)}
            </div>
          ) : showing.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: '8px 0 4px' }}>This section is currently empty</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4">
              {showing.map((m, i) =>
                m ? (
                  <div key={m.id} onClick={() => navigate(`/movie/${m.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="relative rounded-xl overflow-hidden" style={{ height: 140 }}>
                      {m.poster_url
                        ? <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full skeleton" style={{ borderRadius: 12 }} />
                      }
                      <span className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#F5C518', color: '#1a1a1a' }}>Buy</span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-400 truncate">{m.description}</p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Film Investment */}
        <FilmInvestmentSection />

        {/* News */}
        <NewsSection news={news} loading={newsLoad} navigate={navigate} />

        {/* Test mode badge — only visible when TEST_MODE=true on the server */}
        {testMode?.testMode && (
          <div style={{
            textAlign: 'center',
            padding: '6px 12px 10px',
            fontSize: 10,
            color: '#9CA3AF',
            letterSpacing: 0.3,
            userSelect: 'none',
          }}>
            TEST MODE — 1 day = {testMode.testMinutes} min
          </div>
        )}

      </div>

      <BottomNav active="home" />

      {showPopup && popup && (
        <div
          onClick={closePopup}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.3s ease',
            maxWidth: 390, margin: '0 auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 320,
              background: 'white', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <button
              onClick={closePopup}
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, background: 'rgba(0,0,0,0.6)',
                border: 'none', borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000, padding: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div
              onClick={() => {
                if (popup.link_url) window.open(popup.link_url, '_blank', 'noopener,noreferrer')
              }}
              style={{ cursor: popup.link_url ? 'pointer' : 'default', position: 'relative' }}
            >
              <img
                src={popup.image_url}
                alt="Promotion"
                draggable="false"
                onContextMenu={e => e.preventDefault()}
                onDragStart={e => e.preventDefault()}
                style={{ width: '100%', display: 'block', userSelect: 'none', WebkitUserDrag: 'none' }}
              />
              {popup.link_url && (
                <div style={{
                  position: 'absolute', bottom: 12, left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#F5C518', color: '#1a1a1a',
                  fontSize: 12, fontWeight: 600,
                  padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  Tap to view →
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Film Investment Section ────────────────────────────────────
function FilmInvestmentSection() {
  const navigate = useNavigate()
  const [tab, setTab]               = useState('stable')
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [myInvestments, setMyInv]   = useState([])

  const load = useCallback((type) => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 1500)
    fetch(`${API}/investments?type=${type}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => { setLoading(false); clearTimeout(t) })
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
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm text-gray-900">Film & Product Investment</span>
      </div>

      <div style={{ display: 'flex', borderRadius: 50, border: '1.5px solid #E5E7EB', overflow: 'hidden', marginBottom: 12 }}>
        {[{ key: 'stable', label: 'Stable Investment' }, { key: 'high', label: 'High Yield' }].map((t, i) => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            style={{
              flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
              background: tab === t.key ? '#F5C518' : 'white',
              color: tab === t.key ? '#1a1a1a' : '#9CA3AF',
              borderRight: i === 0 ? '1.5px solid #E5E7EB' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {loading
          ? [0,1].map(i => <SkeletonInvestCard key={i} />)
          : products.length === 0
          ? <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: '8px 0 4px' }}>This section is currently empty</p>
          : products.map((card) => {
              const myInv = myInvestments.find(inv => inv.product_id === card.id)
              const pct   = Math.min(100, Math.round((parseFloat(card.funded_amount) / parseFloat(card.funding_goal)) * 100))
              const full  = pct >= 100
              if (myInv) {
                const isFunded = card.is_funded
                return (
                  <div key={card.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {card.image_url
                        ? <img src={card.image_url} alt={card.name} className="rounded-xl flex-shrink-0 object-cover" style={{ width: 52, height: 52 }} />
                        : <div className="rounded-xl flex-shrink-0" style={{ width: 52, height: 52, background: isFunded ? 'linear-gradient(135deg,#F5C518,#E0B000)' : '#F3F4F6' }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{card.name}</p>
                        <p className="text-xs mt-0.5 font-bold" style={{ color: isFunded ? '#16a34a' : '#9CA3AF' }}>
                          {isFunded ? 'Active Investment' : 'Awaiting Funding Goal'}
                        </p>
                      </div>
                    </div>
                    {isFunded ? (
                      <>
                        <div className="mb-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-400">Day {myInv.days_elapsed} of {myInv.total_days}</span>
                            <span className="text-xs font-semibold" style={{ color: '#F5C518' }}>{myInv.progress_percent}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 50, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 50, background: '#F5C518', width: `${myInv.progress_percent}%`, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 mb-1">
                          <div>
                            <p className="text-base font-extrabold" style={{ color: '#F5C518' }}>${parseFloat(myInv.current_earnings).toFixed(2)}</p>
                            <p className="text-xs text-gray-400">Current Earnings</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-extrabold text-gray-900">${parseFloat(myInv.amount).toFixed(2)}</p>
                            <p className="text-xs text-gray-400">Total Investment</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-2">Matures in {myInv.days_remaining} day{myInv.days_remaining !== 1 ? 's' : ''}</p>
                      </>
                    ) : (
                      <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                        <p className="text-sm font-bold text-gray-700">${parseFloat(myInv.amount).toFixed(2)} locked</p>
                        <p className="text-xs text-gray-400 mt-1">Earnings begin when funding goal is reached</p>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <div key={card.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {card.image_url
                      ? <img src={card.image_url} alt={card.name} className="rounded-xl flex-shrink-0 object-cover" style={{ width: 52, height: 52 }} />
                      : <div className="rounded-xl flex-shrink-0" style={{ width: 52, height: 52, background: full ? 'linear-gradient(135deg,#F5C518,#E0B000)' : 'linear-gradient(135deg,#1a237e,#283593)' }} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{card.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Funded: ${parseFloat(card.funded_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-end mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#F5C518' }}>{full ? 'Completed 100%' : `${pct}% Funded`}</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#F3F4F6' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: '#F5C518', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xl font-extrabold" style={{ color: '#F5C518' }}>{card.roi_percent}%</p>
                      <p className="text-xs text-gray-400">ROI</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-gray-900">{card.duration_days} Days</p>
                      <p className="text-xs text-gray-400">${card.min_investment} From US Dollars</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/investment/${card.id}`)} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#1a1a1a' }}>See details</button>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}

// ── News Section ───────────────────────────────────────────────
function NewsSection({ news, loading, navigate }) {
  return (
    <div className="mt-6 px-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm text-gray-900">News</span>
        <button className="flex items-center gap-0.5 text-gray-400 text-xs font-medium"><ChevronRightIcon /></button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading
          ? [0,1,2,3].map(i => <SkeletonNewsRow key={i} />)
          : news.length === 0
          ? <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>This section is currently empty</p>
          : (true &&
              news.map((item, i) => (
                <div key={item.id} onClick={() => navigate(`/news/${item.id}`)}
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                  style={{ borderBottom: i < news.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt="" className="rounded-xl flex-shrink-0 object-cover" style={{ width: 52, height: 52 }} />
                    : <div className="skeleton rounded-xl flex-shrink-0" style={{ width: 52, height: 52 }} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRightIcon />
                </div>
              ))
          )
        }
      </div>
    </div>
  )
}
