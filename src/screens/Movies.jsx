import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_OTP_SERVER_URL

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilmEmptyIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#D1D5DB" strokeWidth="1.5" />
      <path d="M2 8h20M2 16h20M7 4v4M7 16v4M12 4v16M17 4v4M17 16v4" stroke="#D1D5DB" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function SkeletonGridCard() {
  return (
    <div>
      <div className="skeleton rounded-xl" style={{ height: 160 }} />
      <div className="skeleton mt-2 rounded" style={{ height: 10, width: '80%' }} />
      <div className="skeleton mt-1 rounded" style={{ height: 8, width: '55%' }} />
      <div className="skeleton mt-1 rounded" style={{ height: 8, width: '70%' }} />
    </div>
  )
}

export default function Movies() {
  const navigate = useNavigate()
  const [movies, setMovies]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/movies?limit=50`)
      .then(r => r.json())
      .then(d => setMovies(d.movies || []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white min-h-screen" style={{ paddingBottom: 32 }}>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <button onClick={() => navigate('/')} className="p-1 -ml-1">
          <BackIcon />
        </button>
        <span className="font-bold text-base text-gray-900">All Movies</span>
        <div style={{ width: 22 }} />
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0,1,2,3,4,5].map(i => <SkeletonGridCard key={i} />)}
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 gap-2">
            <FilmEmptyIcon />
            <p className="text-sm font-bold text-gray-400 mt-2">No movies available yet</p>
            <p className="text-xs text-gray-300">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {movies.map(m => (
              <div key={m.id}>
                <div className="relative rounded-xl overflow-hidden" style={{ height: 160 }}>
                  {m.poster_url
                    ? <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full skeleton" style={{ borderRadius: 12 }} />
                  }
                  <span className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#F5C518', color: '#1a1a1a' }}>Buy</span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-gray-900 truncate">{m.title}</p>
                <p className="text-xs text-gray-400">+{m.profit_percent}% / {m.duration_hours}hrs</p>
                {m.description && <p className="text-xs text-gray-300 truncate">{m.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
