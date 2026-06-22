import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ToastContainer } from './ToastContainer'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'

const ToastCtx = createContext(null)
export const useAppToast = () => useContext(ToastCtx)

const PAGE_TITLES = {
  '/dashboard':            'Dashboard',
  '/users':                'Users',
  '/movies':               'Movies',
  '/recharges':            'Recharge Requests',
  '/withdrawals':          'Withdrawal Requests',
  '/banners':              'Banners',
  '/news-admin':           'News',
  '/notifications-admin':  'Notifications',
  '/investments-admin':    'Investment Products',
  '/services-admin':       'Services',
  '/settings':             'Settings',
}

export function AdminLayout({ admin, logout }) {
  const location = useLocation()
  const { toasts, addToast, removeToast } = useToast()
  const [pendingCounts, setPendingCounts] = useState({ recharges: 0, withdrawals: 0 })
  const [testMode, setTestMode] = useState(null)

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    fetch(`${BASE}/config/test-mode`)
      .then(r => r.json())
      .then(d => setTestMode(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function fetchPending() {
      try {
        const [r, w] = await Promise.all([
          api.get('/admin/recharges?status=pending'),
          api.get('/admin/withdrawals?status=pending'),
        ])
        setPendingCounts({
          recharges:   Array.isArray(r.recharges)   ? r.recharges.length   : 0,
          withdrawals: Array.isArray(w.withdrawals) ? w.withdrawals.length : 0,
        })
      } catch { /* silently ignore */ }
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [location.pathname])

  const title = PAGE_TITLES[location.pathname] || 'Admin'
  const hasPending = pendingCounts.recharges > 0 || pendingCounts.withdrawals > 0

  return (
    <ToastCtx.Provider value={addToast}>
      {testMode?.testMode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#F5C518', color: '#1a1a1a',
          padding: '8px 16px', textAlign: 'center',
          fontWeight: 700, fontSize: 13, letterSpacing: 0.2,
        }}>
          TEST MODE ACTIVE — 1 day = {testMode.testMinutes} minute(s) — Set TEST_MODE=false in .env before going live
        </div>
      )}
      <div className={`flex min-h-screen bg-gray-50${testMode?.testMode ? ' pt-9' : ''}`}>
        <Sidebar pendingCounts={pendingCounts} logout={logout} />
        <div className="ml-60 flex-1 flex flex-col min-h-screen">
          <TopBar title={title} adminEmail={admin?.email} hasPending={hasPending} />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastCtx.Provider>
  )
}
