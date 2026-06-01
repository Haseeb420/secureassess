import { render, screen } from '@testing-library/react'
import { ConsoleOutput, type OutputLine } from './ConsoleOutput'

describe('ConsoleOutput', () => {
  it('shows empty state when lines is empty', () => {
    render(<ConsoleOutput lines={[]} status="idle" onClear={() => {}} />)
    expect(screen.getByText('> run your code to see output')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('renders stdout line', () => {
    const lines: OutputLine[] = [{ type: 'stdout', text: 'Hello World' }]
    render(<ConsoleOutput lines={lines} status="pass" onClear={() => {}} />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders stderr line with red text class', () => {
    const lines: OutputLine[] = [{ type: 'stderr', text: 'Error occurred' }]
    render(<ConsoleOutput lines={lines} status="error" onClear={() => {}} />)
    const line = screen.getByText('Error occurred')
    expect(line).toHaveClass('text-red-400')
  })

  it('shows running indicator when status is running', () => {
    render(<ConsoleOutput lines={[]} status="running" onClear={() => {}} />)
    expect(screen.getByText('running')).toBeInTheDocument()
  })
})
