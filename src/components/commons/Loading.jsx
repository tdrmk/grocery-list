const EMOJIS = ['🛒', '🥦', '🧀', '🍎', '🥛']

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen gap-2">
      {EMOJIS.map((emoji, i) => (
        <span
          key={emoji}
          className="text-2xl animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          {emoji}
        </span>
      ))}
    </div>
  )
}
