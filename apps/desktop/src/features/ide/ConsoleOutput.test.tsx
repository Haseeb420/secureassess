import { render, screen } from '@testing-library/react'
import { ConsoleOutput, type OutputLine } from './ConsoleOutput'

describe('ConsoleOutput', () => {
  it('shows "No output yet" when lines is empty', () => {
    render(<ConsoleOutput lines={[]} status="idle" onClear={() => {}} />)
    expect(screen.getByText('No output yet.')).toBeInTheDocument()
    expect(screen.getByText('Console')).toBeInTheDocument()
  })

  it('renders stdout line with white text class', () => {
    const lines: OutputLine[] = [{ type: 'stdout', text: 'Hello World' }]
    render(<ConsoleOutput lines={lines} status="success" onClear={() => {}} />)
    const line = screen.getByText('Hello World')
    expect(line).toHaveClass('text-white')
  })

  it('renders stderr line with red text class', () => {
    const lines: OutputLine[] = [{ type: 'stderr', text: 'Error occurred' }]
    render(<ConsoleOutput lines={lines} status="error" onClear={() => {}} />)
    const line = screen.getByText('Error occurred')
    expect(line).toHaveClass('text-red-400')
  })

  it('shows running badge when status is running', () => {
    render(<ConsoleOutput lines={[]} status="running" onClear={() => {}} />)
    expect(screen.getByText('running')).toBeInTheDocument()
  })
})
