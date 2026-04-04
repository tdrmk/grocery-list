import { useRef } from 'react'

export function useClickIntent({ onSingleClick, onDoubleClick, delay = 250 }) {
  const timer = useRef(null)
  const count = useRef(0)

  return function handleClick(...args) {
    count.current += 1
    if (count.current === 1) {
      timer.current = setTimeout(() => {
        count.current = 0
        onSingleClick(...args)
      }, delay)
    } else {
      clearTimeout(timer.current)
      count.current = 0
      onDoubleClick(...args)
    }
  }
}
