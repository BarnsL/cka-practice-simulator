import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

vi.mock('./components/TerminalPanel', () => ({
  default: ({
    lines,
    quickCommands,
    onSubmitCommand,
  }: {
    lines: string[]
    quickCommands: string[]
    onSubmitCommand: (command: string) => void
  }) => (
    <div data-testid="terminal-panel">
      <div>{lines.join('\n')}</div>
      <div>{quickCommands.join('\n')}</div>
      <button type="button" onClick={() => onSubmitCommand('kubectl set image pod/demo-pod app=nginx:1.25')}>
        Run image repair
      </button>
      <button
        type="button"
        onClick={() => onSubmitCommand('kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s')}
      >
        Run ready check
      </button>
    </div>
  ),
}))

describe('App', () => {
  it('starts with a neutral status and removes the redundant guide button', () => {
    render(<App />)

    expect(screen.getAllByText('Not started')[0]).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Guide & Dictionary' })).not.toBeInTheDocument()
  })

  it('supports a terminal-driven repair flow for the selected mission', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start Scenario' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run image repair' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run ready check' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check My Fix' }))

    expect(screen.getAllByText('Passed')[0]).toBeInTheDocument()
    expect(screen.getByText('Great work')).toBeInTheDocument()
  })

  it('lets the learner switch missions and open tutorial and dictionaries', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Load Mission' })[0])
    expect(screen.getByText('Node scheduling clinic ready')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }))
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Commands' }))
    expect(screen.getAllByText(/kubectl get nodes --show-labels/i)[0]).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Values' }))
    expect(screen.getByText('lab-role=west')).toBeInTheDocument()
  })
})
