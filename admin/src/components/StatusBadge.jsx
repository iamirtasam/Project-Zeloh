const CONFIG = {
  pending:  { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  approved: { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-400'  },
  rejected: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400'    },
  active:   { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  inactive: { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400'   },
  completed:{ bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-400'  },
  paid:     { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-400'  },
}

export function StatusBadge({ status }) {
  const key = (status || '').toLowerCase()
  const c = CONFIG[key] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {key.charAt(0).toUpperCase() + key.slice(1)}
    </span>
  )
}
