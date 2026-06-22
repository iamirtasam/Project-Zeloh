import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { saveToken } from '../hooks/useAuth'
import { useStatusBarColor } from '../hooks/useStatusBarColor'

const TAB_EMAIL = 'email'
const TAB_PHONE = 'phone'
const MODE_LOGIN = 'login'
const MODE_SIGNUP = 'signup'
const MODE_FORGOT = 'forgot'
const OTP_SERVER = import.meta.env.VITE_OTP_SERVER_URL
const COOLDOWN_SECS = 60


// ── API helpers ───────────────────────────────────────────────────────────────
async function apiSendEmailOtp(email) {
  const res = await fetch(`${OTP_SERVER}/send-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send email OTP')
}

async function apiVerifyEmailOtp(email, code) {
  const res = await fetch(`${OTP_SERVER}/verify-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const data = await res.json()
  if (res.status === 429) throw new Error(data.message)
  return data
}

async function apiSendPhoneOtp(phone) {
  const res = await fetch(`${OTP_SERVER}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send OTP')
}

async function apiVerifyPhoneOtp(phone, code) {
  const res = await fetch(`${OTP_SERVER}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  const data = await res.json()
  if (res.status === 429) throw new Error(data.message)
  return data
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconCheck = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${filled ? 'text-green-500' : 'text-gray-300'}`}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconHeadphone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
  </svg>
)

// ── Password requirement checker ──────────────────────────────────────────────
function pwdChecks(pwd) {
  return {
    length:    pwd.length >= 8 && pwd.length <= 30,
    uppercase: /[A-Z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
  }
}

// ── Underline input component ─────────────────────────────────────────────────
function UnderlineInput({ label, type = 'text', value, onChange, placeholder, autoComplete, rightSlot, inputMode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-400 font-medium">{label}</label>}
      <div className="relative flex items-center border-b border-gray-300 focus-within:border-zeloh-yellow transition-colors pb-1">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-300 outline-none pr-2 py-1"
        />
        {rightSlot}
      </div>
    </div>
  )
}

// ── SVG: invite confirmed check ───────────────────────────────────────────────
const IconInviteCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-green-500">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthScreen({ onAuthSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()
  useStatusBarColor('#ffffff')
  const [tab, setTab]   = useState(TAB_EMAIL)
  const [mode, setMode] = useState(MODE_LOGIN)
  const isEmail = tab === TAB_EMAIL

  // Email fields
  const [email, setEmail]           = useState('')
  const [emailOtp, setEmailOtp]     = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)

  // Phone fields
  const [phoneRaw, setPhoneRaw]     = useState('') // full number from react-phone-input-2 e.g. "923001234567"
  const [phoneOtp, setPhoneOtp]     = useState('')
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)

  // Shared fields
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [inviteCode, setInviteCode]           = useState('')
  const [inviteCodeLocked, setInviteCodeLocked] = useState(false)
  const [agreeTerms, setAgreeTerms]           = useState(false)
  const [rememberMe, setRememberMe]           = useState(false)

  // UI state
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [cooldown, setCooldown]     = useState(0)
  const cooldownRef = useRef(null)

  // Forgot password state
  const [forgotStep, setForgotStep]         = useState(1) // 1=enter contact, 2=enter otp+new pw
  const [forgotContact, setForgotContact]   = useState('')
  const [forgotOtp, setForgotOtp]           = useState('')
  const [forgotNewPw, setForgotNewPw]       = useState('')
  const [forgotConfirmPw, setForgotConfirmPw] = useState('')
  const [forgotLoading, setForgotLoading]   = useState(false)
  const [forgotError, setForgotError]       = useState('')
  const [forgotSuccess, setForgotSuccess]   = useState('')

  // ── Read invite code from URL on mount ────────────────────────────────────────
  useEffect(() => {
    if (location.pathname === '/pages/login/reg') {
      setMode(MODE_SIGNUP)
      const params = new URLSearchParams(location.search)
      const code = params.get('invitecode')
      if (code) {
        setInviteCode(code.toUpperCase())
        setInviteCodeLocked(true)
      }
    }
  }, [location.pathname, location.search])

  // ── Cooldown timer ────────────────────────────────────────────────────────────
  function startCooldown() {
    setCooldown(COOLDOWN_SECS)
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0 }
        return c - 1
      })
    }, 1000)
  }
  useEffect(() => () => clearInterval(cooldownRef.current), [])

  // ── Reset on tab/mode switch ──────────────────────────────────────────────────
  function resetAll() {
    setEmail(''); setEmailOtp(''); setEmailOtpSent(false)
    setPhoneRaw(''); setPhoneOtp(''); setPhoneOtpSent(false)
    setPassword(''); setConfirmPassword('')
    setShowPassword(false); setShowConfirm(false)
    if (!inviteCodeLocked) setInviteCode('')
    setAgreeTerms(false)
    setError(''); setSuccess('')
    setCooldown(0); clearInterval(cooldownRef.current)
    setForgotStep(1); setForgotContact(''); setForgotOtp('')
    setForgotNewPw(''); setForgotConfirmPw('')
    setForgotError(''); setForgotSuccess('')
  }
  const switchTab  = (t) => { setTab(t);  resetAll() }
  const switchMode = (m) => { setMode(m); resetAll() }

  // ── Derived values ────────────────────────────────────────────────────────────
  const fullPhone = '+' + phoneRaw          // e.g. +923001234567
  const checks    = pwdChecks(password)
  const pwdValid  = checks.length && checks.uppercase && checks.number
  const otpValue  = isEmail ? emailOtp : phoneOtp
  const otpSent   = isEmail ? emailOtpSent : phoneOtpSent

  const signupReady =
    pwdValid &&
    password === confirmPassword &&
    otpValue.length === 6 &&
    agreeTerms &&
    inviteCode.trim() !== '' &&
    (isEmail ? email.trim() !== '' : phoneRaw.length >= 7)

  // ── Send OTP ──────────────────────────────────────────────────────────────────
  async function handleGetCode() {
    setError(''); setSuccess('')
    if (isEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return setError('Enter a valid email address.')
    } else {
      if (phoneRaw.length < 7) return setError('Enter a valid phone number.')
    }
    setLoading(true)
    try {
      if (isEmail) {
        await apiSendEmailOtp(email.toLowerCase().trim())
        setEmailOtpSent(true)
      } else {
        await apiSendPhoneOtp(fullPhone)
        setPhoneOtpSent(true)
      }
      setSuccess(`Code sent to your ${isEmail ? 'email' : 'WhatsApp'}.`)
      startCooldown()
    } catch (err) {
      setError(err.message || 'Failed to send code.')
    } finally {
      setLoading(false)
    }
  }

  // ── Signup submit ─────────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (!signupReady) return
    setLoading(true)
    try {
      // Step 1: verify OTP
      let result
      if (isEmail) {
        result = await apiVerifyEmailOtp(email.toLowerCase().trim(), emailOtp)
      } else {
        result = await apiVerifyPhoneOtp(fullPhone, phoneOtp)
      }
      if (!result.verified) return setError(result.message || 'Invalid code.')

      // Step 2: register via our Express server
      const body = {
        password,
        invite_code_used: inviteCode.trim() || undefined,
      }
      if (isEmail) body.email = email.toLowerCase().trim()
      else body.phone = fullPhone

      const res = await fetch(`${OTP_SERVER}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      console.log('Register response:', data)
      console.log('Token received:', !!data.token)
      if (!res.ok || !data.success) return setError(data.message || 'Registration failed.')

      saveToken(data.token, false)
      setRegSuccess('Account created successfully! Welcome to Zeloh!')
      if (onAuthSuccess) onAuthSuccess()
      console.log('Navigating to /')
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ────────────────────────────────────────────────────────────
  async function handleForgotSend() {
    setForgotError('')
    if (!forgotContact.trim()) return setForgotError('Enter your email or phone number.')
    setForgotLoading(true)
    try {
      const isEmailContact = forgotContact.includes('@')
      const body = isEmailContact ? { email: forgotContact.trim() } : { phone: forgotContact.trim() }
      const res = await fetch(`${OTP_SERVER}/forgot-password/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) return setForgotError(data.message || 'Failed to send code.')
      setForgotStep(2)
      setForgotSuccess(`Code sent to your ${isEmailContact ? 'email' : 'WhatsApp'}.`)
    } catch (err) { setForgotError(err.message) }
    finally { setForgotLoading(false) }
  }

  async function handleForgotVerify() {
    setForgotError('')
    if (!forgotOtp || !forgotNewPw || !forgotConfirmPw) return setForgotError('Please fill all fields.')
    if (forgotNewPw !== forgotConfirmPw) return setForgotError('Passwords do not match.')
    if (forgotNewPw.length < 8) return setForgotError('Password must be at least 8 characters.')
    setForgotLoading(true)
    try {
      const isEmailContact = forgotContact.includes('@')
      const body = isEmailContact
        ? { email: forgotContact.trim(), otp: forgotOtp, new_password: forgotNewPw, confirm_new_password: forgotConfirmPw }
        : { phone: forgotContact.trim(), otp: forgotOtp, new_password: forgotNewPw, confirm_new_password: forgotConfirmPw }
      const res = await fetch(`${OTP_SERVER}/forgot-password/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) return setForgotError(data.message || 'Failed to reset password.')
      setForgotSuccess('Password changed! Redirecting to login...')
      setTimeout(() => { switchMode(MODE_LOGIN) }, 2000)
    } catch (err) { setForgotError(err.message) }
    finally { setForgotLoading(false) }
  }

  // ── Login submit ──────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('Enter a valid email address.')
    if (!isEmail && phoneRaw.length < 7)
      return setError('Enter a valid phone number.')
    if (password.length < 8)
      return setError('Password must be at least 8 characters.')
    setLoading(true)
    try {
      const body = { password }
      if (isEmail) body.email = email.toLowerCase().trim()
      else body.phone = fullPhone

      const res = await fetch(`${OTP_SERVER}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, remember_me: rememberMe }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) return setError(data.message || 'Login failed.')

      saveToken(data.token, rememberMe)
      if (onAuthSuccess) onAuthSuccess()
      else navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* Logo */}
      <div className="flex flex-col items-center pt-10 pb-4 bg-white">
        <img src="/logo.png" alt="Zeloh" className="w-14 h-14 rounded-2xl mb-2" />
        <span className="text-xl font-black text-zeloh-yellow-dark tracking-widest uppercase">Zeloh</span>
      </div>

      {/* Mode toggle */}
      <div className="flex mx-6 mb-2 rounded-full overflow-hidden border border-zeloh-yellow">
        {[MODE_LOGIN, MODE_SIGNUP].map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 text-sm font-bold transition-all ${
              mode === m ? 'bg-zeloh-yellow text-white' : 'bg-white text-gray-400'
            }`}
          >
            {m === MODE_LOGIN ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-100 mx-6 mb-6">
        <button
          onClick={() => switchTab(TAB_EMAIL)}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
            isEmail ? 'border-zeloh-yellow text-gray-800' : 'border-transparent text-gray-400'
          }`}
        >
          Email
        </button>
        <button
          onClick={() => switchTab(TAB_PHONE)}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
            !isEmail ? 'border-zeloh-yellow text-gray-800' : 'border-transparent text-gray-400'
          }`}
        >
          Phone Number
        </button>
      </div>

      {/* Banners */}
      <div className="px-6">
        {regSuccess && (
          <div className="flex items-center gap-2 text-green-700 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {regSuccess}
          </div>
        )}
        {error && (
          <div className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-600 text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
            {success}
          </div>
        )}
      </div>

      {/* ── SIGNUP FORM ── */}
      {mode === MODE_SIGNUP && (
        <form onSubmit={handleSignup} className="flex flex-col gap-5 px-6 pb-10">

          {/* Email or Phone input + Get Code */}
          {isEmail ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Email Address</label>
              <div className="flex items-end gap-2 border-b border-gray-300 focus-within:border-zeloh-yellow transition-colors pb-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-300 outline-none py-1"
                />
                <button
                  type="button"
                  onClick={handleGetCode}
                  disabled={loading || cooldown > 0}
                  className="text-xs font-bold text-zeloh-yellow-dark whitespace-nowrap disabled:opacity-40 pb-1"
                >
                  {cooldown > 0 ? `${cooldown}s` : 'Get Code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Phone Number</label>
              <div className="flex items-end gap-2 border-b border-gray-300 pb-1">
                <div className="flex-1">
                  <PhoneInput
                    country="pk"
                    value={phoneRaw}
                    onChange={(val) => setPhoneRaw(val)}
                    enableSearch
                    disableSearchIcon
                    inputStyle={{
                      width: '100%',
                      border: 'none',
                      borderBottom: 'none',
                      background: 'transparent',
                      fontSize: '14px',
                      color: '#1f2937',
                      paddingLeft: '48px',
                      outline: 'none',
                      boxShadow: 'none',
                    }}
                    buttonStyle={{
                      border: 'none',
                      background: 'transparent',
                      paddingLeft: 0,
                    }}
                    containerStyle={{ width: '100%' }}
                    dropdownStyle={{ width: '280px', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetCode}
                  disabled={loading || cooldown > 0}
                  className="text-xs font-bold text-zeloh-yellow-dark whitespace-nowrap disabled:opacity-40 pb-1"
                >
                  {cooldown > 0 ? `${cooldown}s` : 'Get Code'}
                </button>
              </div>
            </div>
          )}

          {/* OTP field — appears after Get Code is clicked */}
          {otpSent && (
            <UnderlineInput
              label="Verification Code"
              value={otpValue}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                isEmail ? setEmailOtp(v) : setPhoneOtp(v)
              }}
              placeholder="Enter 6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          )}

          {/* Password */}
          <UnderlineInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8–30 characters"
            autoComplete="new-password"
            rightSlot={
              <button type="button" onClick={() => setShowPassword(v => !v)} className="text-gray-400">
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            }
          />

          {/* Password checklist */}
          {password.length > 0 && (
            <div className="flex flex-col gap-1 -mt-3">
              {[
                { key: 'length',    label: '8 to 30 characters' },
                { key: 'uppercase', label: 'At least one uppercase letter' },
                { key: 'number',    label: 'At least one number' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <IconCheck filled={checks[key]} />
                  <span className={`text-xs ${checks[key] ? 'text-green-500' : 'text-gray-400'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm password */}
          <UnderlineInput
            label="Confirm Password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            rightSlot={
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400">
                {showConfirm ? <IconEyeOff /> : <IconEye />}
              </button>
            }
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-red-400 -mt-3">Passwords do not match.</p>
          )}

          {/* Invite code — REQUIRED */}
          <div className="flex flex-col gap-1">
            <UnderlineInput
              label={<span>Invite Code <span className="text-red-400">*</span></span>}
              value={inviteCode}
              onChange={inviteCodeLocked ? undefined : (e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code (required)"
              rightSlot={inviteCodeLocked ? (
                <span className="text-gray-400 text-xs pb-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,display:'inline'}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></span>
              ) : null}
            />
            {inviteCodeLocked ? (
              <div className="flex items-center gap-1 mt-0.5">
                <IconInviteCheck />
                <span className="text-xs text-green-500 font-medium">Invited by a friend</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 mt-0.5">An invitation code is required to register</span>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 accent-zeloh-yellow w-4 h-4 flex-shrink-0"
            />
            <span className="text-xs text-gray-400 leading-relaxed">
              I have read and agree to the{' '}
              <span className="text-zeloh-yellow-dark font-semibold cursor-pointer">Terms &amp; Agreement</span>
            </span>
          </label>

          {/* Register button */}
          <button
            type="submit"
            disabled={!signupReady || loading}
            className="w-full py-3.5 rounded-full bg-zeloh-yellow text-white font-bold text-sm disabled:opacity-40 active:bg-zeloh-yellow-dark transition-colors shadow-sm mt-1"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode(MODE_LOGIN)} className="text-zeloh-yellow-dark font-bold">
              Login
            </button>
          </p>
        </form>
      )}

      {/* ── FORGOT PASSWORD FLOW ── */}
      {mode === MODE_FORGOT && (
        <div className="flex flex-col gap-5 px-6 pb-10">
          <p className="text-sm font-bold text-gray-800">
            {forgotStep === 1 ? 'Reset Password' : 'Enter Code & New Password'}
          </p>

          {forgotError && (
            <div className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{forgotError}</div>
          )}
          {forgotSuccess && (
            <div className="text-green-600 text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">{forgotSuccess}</div>
          )}

          {forgotStep === 1 && (
            <>
              <UnderlineInput
                label="Email or Phone Number"
                value={forgotContact}
                onChange={e => setForgotContact(e.target.value)}
                placeholder="you@example.com or +1234567890"
              />
              <button
                type="button"
                onClick={handleForgotSend}
                disabled={forgotLoading}
                className="w-full py-3.5 rounded-full bg-zeloh-yellow text-white font-bold text-sm disabled:opacity-40"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </>
          )}

          {forgotStep === 2 && (
            <>
              <UnderlineInput
                label="Verification Code"
                value={forgotOtp}
                onChange={e => setForgotOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6-digit code"
                inputMode="numeric"
              />
              <UnderlineInput
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={forgotNewPw}
                onChange={e => setForgotNewPw(e.target.value)}
                placeholder="8+ characters"
                rightSlot={
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-gray-400">
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                }
              />
              <UnderlineInput
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                value={forgotConfirmPw}
                onChange={e => setForgotConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                rightSlot={
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400">
                    {showConfirm ? <IconEyeOff /> : <IconEye />}
                  </button>
                }
              />
              <button
                type="button"
                onClick={handleForgotVerify}
                disabled={forgotLoading}
                className="w-full py-3.5 rounded-full bg-zeloh-yellow text-white font-bold text-sm disabled:opacity-40"
              >
                {forgotLoading ? 'Verifying...' : 'Reset Password'}
              </button>
            </>
          )}

          <button type="button" onClick={() => switchMode(MODE_LOGIN)} className="text-xs text-zeloh-yellow-dark font-semibold text-center">
            Back to Login
          </button>
        </div>
      )}

      {/* ── LOGIN FORM ── */}
      {mode === MODE_LOGIN && (
        <form onSubmit={handleLogin} className="flex flex-col gap-5 px-6 pb-10">

          {/* Email or Phone */}
          {isEmail ? (
            <UnderlineInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Phone Number</label>
              <div className="border-b border-gray-300 focus-within:border-zeloh-yellow transition-colors pb-1">
                <PhoneInput
                  country="pk"
                  value={phoneRaw}
                  onChange={(val) => setPhoneRaw(val)}
                  enableSearch
                  disableSearchIcon
                  inputStyle={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '14px',
                    color: '#1f2937',
                    paddingLeft: '48px',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  buttonStyle={{ border: 'none', background: 'transparent', paddingLeft: 0 }}
                  containerStyle={{ width: '100%' }}
                  dropdownStyle={{ width: '280px', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <UnderlineInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            rightSlot={
              <button type="button" onClick={() => setShowPassword(v => !v)} className="text-gray-400">
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            }
          />

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between -mt-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-zeloh-yellow w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-400">Remember me</span>
            </label>
            <button type="button" onClick={() => { resetAll(); setMode(MODE_FORGOT) }} className="text-xs text-zeloh-yellow-dark font-semibold">
              Forgot password?
            </button>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-zeloh-yellow text-white font-bold text-sm disabled:opacity-40 active:bg-zeloh-yellow-dark transition-colors shadow-sm mt-1"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Don't have an account?{' '}
            <button type="button" onClick={() => switchMode(MODE_SIGNUP)} className="text-zeloh-yellow-dark font-bold">
              Register
            </button>
          </p>

          {/* Online service / Tawk.to */}
          <a
            href="https://tawk.to/chat/69f35d69eee72c1c304efa26/1jnfa9pav"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-2 py-3 rounded-full border border-zeloh-yellow text-zeloh-yellow-dark text-sm font-semibold"
          >
            <IconHeadphone />
            Online service
          </a>
        </form>
      )}
    </div>
  )
}
