export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading = false, danger = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[400px] mx-4 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-2">{title || 'Are you sure?'}</h3>
        {message && <p className="text-sm text-gray-500 mb-5">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-50 flex items-center gap-2
              ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-yellow-500'}`}
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
