import { useNavigate, useLocation } from 'react-router-dom'

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CryptoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8" />
      <path d="M9 8h4a2 2 0 010 4H9v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h5a2 2 0 010 4H9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="6" x2="12" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
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

export default function RechargeChannel() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const amount  = params.get('amount')  || '20'
  const network = params.get('network') || 'TRC20'

  function goToSubmit() {
    navigate(`/recharge-submit?amount=${amount}&network=${network}`)
  }

  return (
    <div className="bg-white min-h-screen">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <button onClick={() => navigate(`/recharge`)} className="p-1 -ml-1">
          <BackIcon />
        </button>
        <span className="font-bold text-base text-gray-900">Recharge channel</span>
        <div style={{ width: 22 }} />
      </div>

      <div className="px-4 pt-6">

        {/* Crypto recharge row */}
        <button
          onClick={goToSubmit}
          className="w-full flex items-center gap-4 bg-white rounded-2xl px-4 py-4 border border-gray-100 shadow-sm"
        >
          {/* Icon circle */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #F97316, #F5C518)' }}
          >
            <CryptoIcon />
          </div>

          {/* Label */}
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-900">Crypto Recharge</p>
            <p className="text-xs text-gray-400 mt-0.5">{network} · ${amount}</p>
          </div>

          {/* Click to recharge pill */}
          <span
            className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ border: '1.5px solid #F5C518', color: '#F5C518' }}
          >
            Click to recharge
          </span>

          <ChevronRightIcon />
        </button>

      </div>
    </div>
  )
}
