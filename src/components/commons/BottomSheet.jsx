export default function BottomSheet({ open, onClose, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl px-4 pt-4 pb-8 flex flex-col gap-4 max-w-[480px] w-full mx-auto">
        {children}
      </div>
    </div>
  )
}
