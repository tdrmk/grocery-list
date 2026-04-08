import { createContext, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null)
  const timer = useRef(null)

  function showToast(msg, duration = 2000) {
    clearTimeout(timer.current)
    setMessage(msg)
    timer.current = setTimeout(() => setMessage(null), duration)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none z-50">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
