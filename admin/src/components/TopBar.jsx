export function TopBar({ title, adminEmail, hasPending }) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-base font-bold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        {hasPending && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending requests
          </span>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
            <span className="text-xs font-bold text-gray-900">
              {adminEmail ? adminEmail[0].toUpperCase() : 'A'}
            </span>
          </div>
          <span className="font-medium text-gray-700">{adminEmail || 'Admin'}</span>
        </div>
      </div>
    </header>
  )
}
