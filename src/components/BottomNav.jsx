import { useNavigate } from 'react-router-dom'

function HomeIcon({ active }) {
  const c = active ? '#F5C518' : '#9CA3AF'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AssetsIcon({ active }) {
  const c = active ? '#F5C518' : '#9CA3AF'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="4" height="10" rx="1" stroke={c} strokeWidth="1.8" />
      <rect x="10" y="6" width="4" height="15" rx="1" stroke={c} strokeWidth="1.8" />
      <rect x="17" y="2" width="4" height="19" rx="1" stroke={c} strokeWidth="1.8" />
    </svg>
  )
}

function ServiceIcon({ active }) {
  const c = active ? '#F5C518' : '#9CA3AF'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function MyIcon({ active }) {
  const c = active ? '#F5C518' : '#9CA3AF'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M9 7h6M9 11h6M9 15h4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 11.5l1.2 1.2 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BottomNav({ active }) {
  const navigate = useNavigate()

  const tabs = [
    { key: 'home',    label: 'Home',    icon: HomeIcon,    route: '/' },
    { key: 'assets',  label: 'Assets',  icon: AssetsIcon,  route: '/assets' },
    { key: 'center',  label: null,      icon: null,        route: null },
    { key: 'service', label: 'Service', icon: ServiceIcon, route: '/service' },
    { key: 'my',      label: 'My',      icon: MyIcon,      route: '/my' },
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white z-40"
      style={{
        maxWidth: 390,
        margin: '0 auto',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-end justify-around px-2" style={{ height: 58 }}>
        {tabs.map(tab => {
          if (tab.key === 'center') {
            const centerActive = active === 'tasks'
            return (
              <button
                key="center"
                onClick={() => navigate('/tasks')}
                className="flex items-center justify-center rounded-full shadow-lg"
                style={{
                  width: 52,
                  height: 52,
                  background: centerActive ? '#E0A800' : '#F5C518',
                  marginBottom: 14,
                  flexShrink: 0,
                }}
              >
                <TaskIcon />
              </button>
            )
          }
          const Icon = tab.icon
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.route)}
              className="flex flex-col items-center justify-end pb-2 gap-0.5"
              style={{ flex: 1, minWidth: 0 }}
            >
              <Icon active={isActive} />
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? '#F5C518' : '#9CA3AF' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
