import { createContext, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const VARIANTS = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-500 text-white',
  default: 'bg-gray-800 text-white',
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  function showToast(msg, variant = 'success', duration = 2000) {
    clearTimeout(timer.current)
    setToast({ msg, variant })
    timer.current = setTimeout(() => setToast(null), duration)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none z-50 ${VARIANTS[toast.variant] ?? VARIANTS.default}`}>
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
