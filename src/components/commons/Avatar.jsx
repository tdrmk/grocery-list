import { hashToIndex } from '../../utils/hash'

const AVATAR_COLORS = [
  'bg-blue-400',
  'bg-purple-400',
  'bg-green-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-red-400',
  'bg-indigo-400',
  'bg-yellow-400',
  'bg-cyan-400',
  'bg-rose-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-sky-400',
]

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase()
}

// members: [{ userId, name }]
export function AvatarGroup({ members }) {
  const visible = members.slice(0, 3)
  const remaining = members.length - 3
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <Avatar key={m.userId} name={m.name} userId={m.userId} className={i > 0 ? '-ml-1' : ''} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-400 ml-1.5">+{remaining} more</span>
      )}
    </div>
  )
}

export default function Avatar({ name, userId, className = '' }) {
  return (
    <span
      className={`w-7 h-7 rounded-full ring-2 ring-white ${AVATAR_COLORS[hashToIndex(userId, AVATAR_COLORS.length)]} text-white text-xs font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {getInitials(name)}
    </span>
  )
}
