import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAdmin } from './hooks/useAdmin'
import { AdminLayout } from './components/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Movies from './pages/Movies'
import Recharges from './pages/Recharges'
import Withdrawals from './pages/Withdrawals'
import Banners from './pages/Banners'
import NewsAdmin from './pages/NewsAdmin'
import NotificationsAdmin from './pages/NotificationsAdmin'
import InvestmentsAdmin from './pages/InvestmentsAdmin'
import ServicesAdmin from './pages/ServicesAdmin'
import Settings from './pages/Settings'

function RequireAuth({ admin, checked, children }) {
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!admin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { admin, checked, logout, setAdmin } = useAdmin()

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/dashboard" replace /> : <Login onLogin={setAdmin} />}
      />

      <Route
        element={
          <RequireAuth admin={admin} checked={checked}>
            <AdminLayout admin={admin} logout={logout} />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/recharges" element={<Recharges />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/banners" element={<Banners />} />
        <Route path="/news-admin" element={<NewsAdmin />} />
        <Route path="/notifications-admin" element={<NotificationsAdmin />} />
        <Route path="/investments-admin" element={<InvestmentsAdmin />} />
        <Route path="/services-admin" element={<ServicesAdmin />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to={admin ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
