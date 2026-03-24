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
      <button type="button" onClick={() => onSubmitCommand('kubectl create namespace training')}>
        Run free play command
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

  it('progresses hints and supports the free play sandbox', () => {
    render(<App />)

    expect(screen.getByText(/No hints revealed yet/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show Hint' }))
    expect(screen.getByText('Hint 1')).toBeInTheDocument()
    expect(screen.getAllByText(/kubectl get pod demo-pod -o wide/i)[0]).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show Hint' }))
    expect(screen.getAllByText(/spec\.containers\[0\]\.image/i)[0]).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Open Free Play' })[0])
    expect(screen.getAllByText('Sandbox ready')[0]).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Run free play command' }))
    expect(screen.getByText('Namespace created')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Commands' }))
    expect(screen.getAllByText(/kubectl create deployment demo-api --image=nginx:1.25/i)[0]).toBeInTheDocument()
  })
})
