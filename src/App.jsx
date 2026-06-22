import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import AuthScreen from './screens/AuthScreen'
import Home from './screens/Home'
import Assets from './screens/Assets'
import Service from './screens/Service'
import My from './screens/My'
import Movies from './screens/Movies'
import Recharge from './screens/Recharge'
import Withdraw from './screens/Withdraw'
import Invest from './screens/Invest'
import Help from './screens/Help'
import Tasks from './screens/Tasks'
import RechargeChannel from './screens/RechargeChannel'
import RechargeSubmit from './screens/RechargeSubmit'
import RechargeRecord from './screens/RechargeRecord'
import MyTickets from './screens/MyTickets'
import AccountRecord from './screens/AccountRecord'
import Membership from './screens/Membership'
import TeamReport from './screens/TeamReport'
import ShareCode from './screens/ShareCode'
import WithdrawChannel from './screens/WithdrawChannel'
import WithdrawSubmit from './screens/WithdrawSubmit'
import WithdrawalRecord from './screens/WithdrawalRecord'
import SettingsWallet from './screens/SettingsWallet'
import SettingsFundingPassword from './screens/SettingsFundingPassword'
import Guide from './screens/Guide'
import Agreement from './screens/Agreement'
import MovieDetail from './screens/MovieDetail'
import InvestmentDetail from './screens/InvestmentDetail'
import Notifications from './screens/Notifications'
import NewsDetail from './screens/NewsDetail'
import AllInvestments from './screens/AllInvestments'
import { isLoggedIn } from './hooks/useAuth'

export default function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn())

  const onAuthSuccess = useCallback(() => setAuthed(true), [])
  const onLogout = useCallback(() => setAuthed(false), [])

  function ProtectedRoute({ children }) {
    if (!authed) return <Navigate to="/" replace />
    return children
  }

  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={
        authed
          ? <Home onLogout={onLogout} />
          : <AuthScreen onAuthSuccess={onAuthSuccess} />
      } />
      <Route path="/pages/login/reg" element={<AuthScreen onAuthSuccess={onAuthSuccess} />} />
      <Route path="/assets" element={<ProtectedRoute><Assets onLogout={onLogout} /></ProtectedRoute>} />
      <Route path="/service" element={<ProtectedRoute><Service onLogout={onLogout} /></ProtectedRoute>} />
      <Route path="/my" element={<ProtectedRoute><My onLogout={onLogout} /></ProtectedRoute>} />
      <Route path="/movies" element={<ProtectedRoute><Movies /></ProtectedRoute>} />
      <Route path="/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
      <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
      <Route path="/invest" element={<ProtectedRoute><Invest /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/recharge-channel" element={<ProtectedRoute><RechargeChannel /></ProtectedRoute>} />
      <Route path="/recharge-submit" element={<ProtectedRoute><RechargeSubmit /></ProtectedRoute>} />
      <Route path="/recharge-record" element={<ProtectedRoute><RechargeRecord /></ProtectedRoute>} />
      <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
      <Route path="/account-record" element={<ProtectedRoute><AccountRecord /></ProtectedRoute>} />
      <Route path="/membership" element={<ProtectedRoute><Membership /></ProtectedRoute>} />
      <Route path="/team-report" element={<ProtectedRoute><TeamReport /></ProtectedRoute>} />
      <Route path="/share-code" element={<ProtectedRoute><ShareCode /></ProtectedRoute>} />
      <Route path="/withdraw-channel" element={<ProtectedRoute><WithdrawChannel /></ProtectedRoute>} />
      <Route path="/withdraw-submit" element={<ProtectedRoute><WithdrawSubmit /></ProtectedRoute>} />
      <Route path="/withdrawal-record" element={<ProtectedRoute><WithdrawalRecord /></ProtectedRoute>} />
      <Route path="/settings-wallet" element={<ProtectedRoute><SettingsWallet /></ProtectedRoute>} />
      <Route path="/settings-funding-password" element={<ProtectedRoute><SettingsFundingPassword /></ProtectedRoute>} />
      <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
      <Route path="/agreement" element={<ProtectedRoute><Agreement /></ProtectedRoute>} />
      <Route path="/movie/:id" element={<ProtectedRoute><MovieDetail /></ProtectedRoute>} />
      <Route path="/investment/:id" element={<ProtectedRoute><InvestmentDetail /></ProtectedRoute>} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/news/:id" element={<NewsDetail />} />
      <Route path="/all-investments" element={<AllInvestments />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  )
}
