import { useEffect } from 'react'

export function useStatusBarColor(color) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', color)
    document.documentElement.style.backgroundColor = color
    return () => {
      if (meta) meta.setAttribute('content', '#ffffff')
      document.documentElement.style.backgroundColor = '#ffffff'
    }
  }, [color])
}
