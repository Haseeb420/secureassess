import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CrashRecoveryModal } from './CrashRecoveryModal'

const mockSession = {
  id: 'session-1',
  assessment_id: 'assessment-abc',
  timer_remaining_secs: 1800,
}

describe('CrashRecoveryModal', () => {
  it('renders the modal with session info', () => {
    render(
      <CrashRecoveryModal
        session={mockSession}
        onResume={vi.fn()}
        onAbandon={vi.fn()}
      />,
    )
    expect(screen.getByText('Unfinished Assessment Found')).toBeInTheDocument()
    expect(screen.getByText('assessment-abc')).toBeInTheDocument()
    expect(screen.getByText('30:00')).toBeInTheDocument()
  })

  it('calls onResume when Resume button is clicked', async () => {
    const onResume = vi.fn()
    render(
      <CrashRecoveryModal
        session={mockSession}
        onResume={onResume}
        onAbandon={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByText('Resume Assessment →'))
    expect(onResume).toHaveBeenCalledOnce()
  })

  it('calls onAbandon after confirming abandon in dialog', async () => {
    const onAbandon = vi.fn()
    render(
      <CrashRecoveryModal
        session={mockSession}
        onResume={vi.fn()}
        onAbandon={onAbandon}
      />,
    )
    // Click outer Abandon button to open confirm dialog
    await userEvent.click(screen.getByText('Abandon'))
    // Click the confirm "Abandon" button inside the dialog
    const abandonButtons = screen.getAllByText('Abandon')
    await userEvent.click(abandonButtons[abandonButtons.length - 1])
    expect(onAbandon).toHaveBeenCalledOnce()
  })
})
