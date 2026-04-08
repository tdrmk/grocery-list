export default function EmojiGroup({ icons, limit = 5, className = '' }) {
  const visible = icons.slice(0, limit)
  const remaining = icons.length - limit
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {visible.map((icon, i) => (
        <span key={i} className="text-base leading-none">{icon}</span>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-400 ml-0.5">+{remaining}</span>
      )}
    </div>
  )
}
