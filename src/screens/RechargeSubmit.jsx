/*
CREATE TABLE recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  network TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  -- statuses: pending, approved, rejected
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  note TEXT
);

CREATE TABLE wallet_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO wallet_addresses (network, address) VALUES
('TRC20', 'PLACEHOLDER_WALLET_ADDRESS_TRC20'),
('ERC20', 'PLACEHOLDER_WALLET_ADDRESS_ERC20');
*/

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const OTP_SERVER = import.meta.env.VITE_OTP_SERVER_URL

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="#D1D5DB" strokeWidth="1.5" />
      <rect x="5" y="5" width="3" height="3" fill="#D1D5DB" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="#D1D5DB" strokeWidth="1.5" />
      <rect x="16" y="5" width="3" height="3" fill="#D1D5DB" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="#D1D5DB" strokeWidth="1.5" />
      <rect x="5" y="16" width="3" height="3" fill="#D1D5DB" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="#D1D5DB" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D1D5DB" strokeWidth="1.8" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="#D1D5DB" />
      <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#D1D5DB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#F5C518" />
      <path d="M7 12l3.5 3.5L17 8" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function truncateAddress(addr) {
  if (!addr || addr.length <= 20) return addr
  return addr.slice(0, 15) + '...' + addr.slice(-4)
}

export default function RechargeSubmit() {
  const navigate = useNavigate()
  const location = useLocation()
  const params  = new URLSearchParams(location.search)
  const amount  = params.get('amount')  || '20'
  const network = params.get('network') || 'TRC20'

  const [walletAddress, setWalletAddress] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [txHash, setTxHash]   = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast]     = useState(false)
  const fileRef = useRef(null)
  const toastRef = useRef(null)

  // Fetch wallet address + QR code dynamically
  useEffect(() => {
    fetch(`${OTP_SERVER}/wallet-address/${network}`)
      .then(r => r.json())
      .then(d => {
        console.log('Wallet data from API:', d)
        console.log('QR code URL:', d?.qr_code_url)
        if (d.address) setWalletAddress(d.address)
        setQrCodeUrl(d.qr_code_url || null)
      })
      .catch(() => setWalletAddress(`PLACEHOLDER_WALLET_ADDRESS_${network}`))
  }, [network])

  function handleCopy() {
    navigator.clipboard.writeText(walletAddress).then(() => {
      setToast(true)
      clearTimeout(toastRef.current)
      toastRef.current = setTimeout(() => setToast(false), 2000)
    })
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  function removeScreenshot() {
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    setError('')
    if (!txHash.trim()) return setError('Please fill all required fields')
    if (!screenshot) return setError('Please fill all required fields')
    setLoading(true)
    try {
      const token = getToken()
      const formData = new FormData()
      formData.append('amount', amount)
      formData.append('network', network)
      formData.append('transaction_hash', txHash.trim())
      formData.append('screenshot', screenshot)

      const res = await fetch(`${OTP_SERVER}/submit-recharge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) return setError(data.message || 'Submission failed.')
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white min-h-screen" style={{ paddingBottom: 32 }}>

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <button onClick={() => navigate(`/recharge-channel?amount=${amount}&network=${network}`)} className="p-1 -ml-1">
            <BackIcon />
          </button>
          <span className="font-bold text-base text-gray-900">Submit recharge</span>
          <div style={{ width: 22 }} />
        </div>

        <div className="px-4 pt-5 flex flex-col gap-5">

          {/* Network badge */}
          <div className="flex justify-center">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: '#FEF9E7', color: '#F5C518', border: '1.5px solid #F5C518' }}
            >
              {network}
            </span>
          </div>

          {/* Wallet address */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Deposit Address:</p>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-gray-200 bg-gray-50">
              <span className="flex-1 text-xs text-gray-700 font-mono truncate">
                {walletAddress ? truncateAddress(walletAddress) : 'Loading...'}
              </span>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: '#F5C518', color: '#1a1a1a' }}
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code */}
          {qrCodeUrl ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}>
              <img
                src={qrCodeUrl}
                alt="Wallet QR Code"
                draggable="false"
                onContextMenu={e => e.preventDefault()}
                onDragStart={e => e.preventDefault()}
                style={{
                  width: 180,
                  height: 180,
                  objectFit: 'contain',
                  WebkitUserDrag: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
              />
              <p style={{ display: 'none', color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>QR code unavailable</p>
              <p className="text-xs text-gray-400 mt-2 text-center">Scan to get wallet address</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 py-8">
              <QrIcon />
              <p className="text-xs font-semibold text-gray-500 mt-1">QR Code — Scan to deposit</p>
              <p className="text-xs text-gray-400 text-center px-6 leading-relaxed">
                QR code will be available soon. Use the address above to deposit.
              </p>
            </div>
          )}

          {/* Amount display */}
          <p className="text-center text-sm font-bold" style={{ color: '#F5C518' }}>
            Amount to send: ${amount} ({network})
          </p>

          {/* Transaction number */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Transaction number</p>
            <div className="border-b border-gray-300 pb-1 focus-within:border-zeloh-yellow">
              <input
                type="text"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                placeholder="Please enter your transaction hash"
                className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-300 py-1"
              />
            </div>
          </div>

          {/* Screenshot upload */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Recharge screenshot</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            {screenshotPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: 160 }}>
                <img src={screenshotPreview} alt="screenshot" className="w-full h-full object-cover" />
                <button
                  onClick={removeScreenshot}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-8 bg-gray-50"
              >
                <ImageIcon />
                <span className="text-xs text-gray-400">Tap to upload payment screenshot</span>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-bold text-sm disabled:opacity-50"
            style={{ background: '#F5C518', color: '#1a1a1a' }}
          >
            {loading ? 'Submitting...' : 'Submit Recharge'}
          </button>

        </div>
      </div>

      {/* Copied toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg z-50"
          style={{ background: '#1a1a1a' }}
        >
          Copied!
        </div>
      )}

      {/* Success modal */}
      {success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', maxWidth: 390, margin: '0 auto', left: 0, right: 0 }}
        >
          <div className="bg-white rounded-3xl mx-6 px-6 py-8 flex flex-col items-center text-center shadow-2xl">
            <CheckCircleIcon />
            <p className="text-base font-extrabold text-gray-900 mt-4">Recharge submitted successfully!</p>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Our team will verify your payment within 30 minutes. Your balance will be updated after confirmation.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 w-full py-3 rounded-full font-bold text-sm"
              style={{ background: '#F5C518', color: '#1a1a1a' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </>
  )
}
