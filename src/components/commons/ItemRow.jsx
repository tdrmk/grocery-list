import SwipeableRow from './SwipeableRow'
import Spinner from './Spinner'

// Shared item row used in ListView (shopping list) and AddItem (catalog).
//
// Props:
//   item     — { icon, name, quantity?, notes? }
//   status   — 'added' (rose bg) | 'purchased' (green bg) | undefined (gray bg)
//   disabled — prevents click (e.g. item already in list)
//   loading  — shows spinner on the right, also prevents click
//   trailing — 'badge' shows 🛒/✓/+ derived from status; omit for no trailing element
//   actions  — SwipeableRow action buttons; omit for a plain non-swipeable row

export default function ItemRow({ item, status, disabled, loading, trailing, onClick, actions }) {
  const bg = status === 'added' ? 'bg-rose-50' : status === 'purchased' ? 'bg-green-50' : 'bg-gray-50'
  const activeBg = status === 'added' ? 'active:bg-rose-100' : status === 'purchased' ? 'active:bg-green-100' : 'active:bg-gray-100'

  const isDisabled = disabled || loading
  const hasActions = actions?.length > 0

  function handleClick() {
    if (!isDisabled) onClick?.()
  }

  let trailingNode = null
  if (loading) {
    trailingNode = <Spinner />
  } else if (trailing === 'badge') {
    if (status === 'added') trailingNode = <span className="text-sm">🛒</span>
    else if (status === 'purchased') trailingNode = <span className="text-primary text-sm font-semibold">✓</span>
    else trailingNode = <span className="text-gray-300 text-xl">+</span>
  }

  const content = (
    <div className={`flex items-center gap-3 ${hasActions ? 'pl-4 pr-8' : 'px-4'} py-3 ${bg} ${isDisabled ? 'cursor-default' : `cursor-pointer ${activeBg}`} select-none transition-colors`}>
      <span className="text-xl">{item.icon}</span>
      <span className="flex-1 text-base">{item.name}</span>
      {item.quantity && <span className="text-sm text-gray-400">{item.quantity}</span>}
      {item.notes && <span className="text-sm text-gray-300 italic">{item.notes}</span>}
      {trailingNode && (
        // Fixed width keeps the trailing element from shifting layout as content changes
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {trailingNode}
        </div>
      )}
    </div>
  )

  return (
    <li className="rounded-xl overflow-hidden shadow-sm">
      {hasActions
        ? <SwipeableRow actions={actions} onClick={handleClick}>{content}</SwipeableRow>
        : <div onClick={handleClick}>{content}</div>
      }
    </li>
  )
}
