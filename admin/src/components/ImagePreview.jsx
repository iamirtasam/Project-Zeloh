import { useState, useEffect } from 'react'

export function ImagePreview({ url, className = 'h-24' }) {
  const [valid, setValid] = useState(false)

  useEffect(() => {
    if (!url) { setValid(false); return }
    const img = new Image()
    img.onload  = () => setValid(true)
    img.onerror = () => setValid(false)
    img.src = url
  }, [url])

  if (!url || !valid) return null

  return (
    <img
      src={url}
      alt="preview"
      className={`rounded-lg object-cover border border-gray-200 ${className}`}
    />
  )
}
