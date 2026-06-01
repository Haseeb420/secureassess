export function activateKeyboardGuard(): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      return false
    }

    const isMac = navigator.platform.includes('Mac')
    const mod = isMac ? e.metaKey : e.ctrlKey

    const blocked = [
      mod && e.key === 'Tab',
      mod && e.key === 'q',
      mod && e.key === 'w',
      mod && e.key === 'm',
      mod && e.key === 'h',
      mod && e.shiftKey && e.key === '3',
      mod && e.shiftKey && e.key === '4',
      mod && e.shiftKey && e.key === '5',
      mod && e.key === 'F3',
      e.ctrlKey && e.key === 'ArrowUp',
      e.ctrlKey && e.key === 'ArrowDown',
    ]

    if (blocked.some(Boolean)) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }

  window.addEventListener('keydown', handler, { capture: true })
  return () => window.removeEventListener('keydown', handler, { capture: true })
}
