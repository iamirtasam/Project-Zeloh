import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'

const API  = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="4" y1="22" x2="4" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function WalletTaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M2 10h20" stroke="white" strokeWidth="1.8" />
      <circle cx="17" cy="15" r="1.5" fill="white" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l4.5 4.5L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SkeletonTask() {
  return (
    <div className="py-4" style={{ borderBottom: '1px solid #F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }}>
      <div className="flex items-start gap-3">
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
        <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 12, borderRadius: 5, background: '#F3F4F6', width: '80%' }} />
          <div style={{ height: 9, borderRadius: 5, background: '#F3F4F6', width: '50%' }} />
        </div>
      </div>
      <div style={{ marginTop: 12, height: 5, borderRadius: 50, background: '#F3F4F6' }} />
    </div>
  )
}

export default function Tasks() {
  const navigate = useNavigate()
  const [tasks, setTasks]       = useState([])
  const [vouchers, setVouchers] = useState(0)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/daily-tasks`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const d = await res.json()
      const raw = d.tasks || []
      const uniqueTasks = raw.filter((task, index, self) => index === self.findIndex(t => t.id === task.id))
      setTasks(uniqueTasks)
      setVouchers(d.vouchers || 0)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const completedCount = tasks.filter(t => t.completed).length
  const pendingCount   = tasks.filter(t => !t.completed).length

  function progressLabel(task) {
    if (task.task_type === 'ticket_count') {
      return `${Math.min(task.progress, task.requirement)}/${task.requirement} tickets`
    }
    return `$${task.progress.toFixed(0)}/$${task.requirement.toFixed(0)} deposited`
  }

  return (
    <>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      <div className="bg-white min-h-screen" style={{ paddingBottom: 80 }}>

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <button onClick={() => navigate('/')} className="p-1 -ml-1" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="font-bold text-base text-gray-900">My Tasks</span>
          <div style={{ width: 22 }} />
        </div>

        {/* Stats row */}
        <div className="mx-4 mt-4 rounded-2xl px-4 py-4 flex items-center" style={{ background: '#1a1a1a' }}>
          {[
            { value: loading ? '—' : String(vouchers),       label: 'My voucher' },
            { value: loading ? '—' : String(completedCount), label: 'Task completed' },
            { value: loading ? '—' : String(pendingCount),   label: 'Will complete' },
          ].map((stat, i) => (
            <div key={i} className="flex-1 flex flex-col items-center" style={{
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
            }}>
              <span className="text-xl font-extrabold text-white">{stat.value}</span>
              <span className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Daily Tasks */}
        <div className="mt-5 px-4">
          <span className="font-bold text-sm text-gray-900">Daily Tasks</span>

          <div className="mt-3 flex flex-col">
            {loading ? (
              <><SkeletonTask /><SkeletonTask /><SkeletonTask /></>
            ) : tasks.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No tasks available today</p>
            ) : tasks.map((task, i) => {
              const isDeposit  = task.task_type === 'deposit_amount'
              const iconBg     = isDeposit ? '#F97316' : '#3B82F6'
              return (
                <div
                  key={task.id}
                  className="py-4"
                  style={{ borderBottom: i < tasks.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-full"
                      style={{ width: 42, height: 42, background: task.completed ? '#16a34a' : iconBg }}
                    >
                      {isDeposit ? <WalletTaskIcon /> : <FlagIcon />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                      <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginTop: 2 }}>
                        Reward: {task.voucher_reward} vouchers
                      </p>
                    </div>

                    {task.completed ? (
                      <div className="flex-shrink-0 flex items-center gap-1 pt-0.5">
                        <CheckIcon />
                        <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Completed</span>
                      </div>
                    ) : (
                      <span className="flex-shrink-0 text-xs font-semibold text-gray-400 pt-0.5">In Progress</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#F3F4F6' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${task.percent}%`,
                          background: task.completed ? '#16a34a' : GOLD,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-400">{progressLabel(task)}</span>
                      <span className="text-xs font-semibold" style={{ color: task.completed ? '#16a34a' : GOLD }}>
                        {task.percent}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <BottomNav active="tasks" />
    </>
  )
}
