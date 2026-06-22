import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AMOUNTS = ['20', '50', '100', '500', '1000', '2000', '5000', '10000', '20000', '50000', '100000']
const NETWORKS = ['TRC20', 'ERC20']

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Recharge() {
  const navigate = useNavigate()
  const [amount, setAmount]   = useState('20')
  const [network, setNetwork] = useState('TRC20')

  function handleChip(val) {
    setAmount(val)
  }

  function handleOk() {
    const a = parseFloat(amount)
    if (!a || a < 20) return
    navigate(`/recharge-channel?amount=${a}&network=${network}`)
  }

  return (
    <div className="bg-white min-h-screen" style={{ paddingBottom: 32 }}>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <button onClick={() => navigate('/')} className="p-1 -ml-1">
          <BackIcon />
        </button>
        <span className="font-bold text-base text-gray-900">Recharge</span>
        <button
          onClick={() => navigate('/recharge-record')}
          className="text-sm font-semibold"
          style={{ color: '#F5C518' }}
        >
          Recharge History
        </button>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Balance card */}
        <div className="rounded-2xl px-6 py-5 flex flex-col items-center" style={{ background: '#1a1a1a' }}>
          <span className="text-3xl font-extrabold text-white">0.00</span>
          <span className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Current balance</span>
        </div>

        {/* Amount input */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-2">Recharge amount ($)</p>
          <div className="border-b-2 pb-1 flex items-center" style={{ borderColor: '#F5C518' }}>
            <input
              type="number"
              min="20"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent outline-none text-lg font-bold"
              style={{ color: '#F5C518' }}
              placeholder="Enter amount"
            />
            <span className="text-lg font-bold ml-1" style={{ color: '#F5C518' }}>$</span>
          </div>
        </div>

        {/* Quick select chips */}
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => handleChip(a)}
              className="py-2 rounded-full text-xs font-bold transition-all"
              style={
                amount === a
                  ? { background: '#F5C518', color: '#1a1a1a' }
                  : { background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' }
              }
            >
              {a}$
            </button>
          ))}
        </div>

        {/* Recharge type */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-2">Recharge Type</p>
          <div className="flex gap-3">
            {NETWORKS.map(n => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                className="px-5 py-2 rounded-full text-sm font-bold transition-all"
                style={
                  network === n
                    ? { background: '#F5C518', color: '#1a1a1a' }
                    : { background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' }
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* OK button */}
        <button
          onClick={handleOk}
          className="w-full py-3.5 rounded-full font-bold text-sm"
          style={{ background: '#F5C518', color: '#1a1a1a' }}
        >
          Continue
        </button>

        {/* Instructions */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-2">Recharge Instructions:</p>
          <ol className="flex flex-col gap-2">
            {[
              'The payment amount must be the same as the order amount, otherwise it will not be automatically credited.',
              'Minimum recharge amount is $20.',
              'Please contact online customer service if you face any issues with your recharge.',
              'Crypto transactions may take 10 minutes upto 24 hours to confirm on the blockchain.',
            ].map((txt, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                <span className="font-bold flex-shrink-0" style={{ color: '#9CA3AF' }}>{i + 1}.</span>
                <span>{txt}</span>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  )
}
