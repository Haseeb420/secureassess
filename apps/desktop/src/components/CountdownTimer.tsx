import { useEffect, useState } from 'react'

interface Props {
  targetMs: number
  onExpired: () => void
}

interface TimeParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function msToTimeParts(ms: number): TimeParts {
  const total   = Math.max(0, Math.floor(ms / 1000))
  const days    = Math.floor(total / 86400)
  const hours   = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { days, hours, minutes, seconds }
}

export function CountdownTimer({ targetMs, onExpired }: Props) {
  const [remaining, setRemaining] = useState(targetMs)

  useEffect(() => {
    if (remaining <= 0) {
      onExpired()
      return
    }
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          clearInterval(id)
          onExpired()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { days, hours, minutes, seconds } = msToTimeParts(remaining)

  const units = [
    { value: days,    label: 'days' },
    { value: hours,   label: 'hrs' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'sec' },
  ]

  return (
    <div className="flex items-center gap-3">
      {units.map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-brand-border bg-white shadow-sm">
            <span className="font-mono font-bold text-2xl text-brand-navy tabular-nums">
              {String(value).padStart(2, '0')}
            </span>
          </div>
          <span className="mt-1.5 font-sans text-xs font-medium text-brand-navy/50">{label}</span>
        </div>
      ))}
    </div>
  )
}
