interface SkeletonBlockProps {
  width?: string
  height?: string
  className?: string
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-3 w-full animate-pulse rounded bg-zinc-700 ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonBlock({ width = 'w-full', height = 'h-8', className = '' }: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-700 ${width} ${height} ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg border border-zinc-800 bg-zinc-900 p-4 ${className}`}
      aria-hidden="true"
    >
      <SkeletonText className="mb-3 w-3/4" />
      <SkeletonText className="mb-2" />
      <SkeletonText className="w-5/6" />
    </div>
  )
}
