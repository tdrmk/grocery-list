import { useState } from 'react'

function isIosSafari() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
}

export default function IosInstallHint() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('install-banner-dismissed') === 'true'
  )

  if (dismissed) return null
  if (navigator.standalone) return null
  if (!isIosSafari()) return null

  function dismiss() {
    localStorage.setItem('install-banner-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
      <span className="text-lg">📲</span>
      <span className="flex-1">
        Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong> to install
      </span>
      <button onClick={dismiss} className="text-gray-400 text-lg leading-none">×</button>
    </div>
  )
}
