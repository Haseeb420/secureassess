import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CodeEditor } from './CodeEditor'

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

describe('CodeEditor', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CodeEditor
        language="python"
        value="print('hello')"
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )
    expect(container).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    render(
      <CodeEditor
        language="python"
        value=""
        onChange={onChange}
        onSave={vi.fn()}
      />,
    )
    const editor = screen.getByTestId('monaco-editor')
    await userEvent.type(editor, 'x')
    expect(onChange).toHaveBeenCalled()
  })
})
