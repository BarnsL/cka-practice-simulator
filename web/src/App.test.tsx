import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

vi.mock('./components/TerminalPanel', () => ({
  default: () => <div data-testid="terminal-panel">terminal preview</div>,
}))

describe('App', () => {
  it('guides the learner through inject, repair, and grade', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start Scenario' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check My Fix' }))

    expect(screen.getByText('Not fixed yet')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Apply Guided Repair' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check My Fix' }))

    expect(screen.getByText('Great work')).toBeInTheDocument()
    expect(screen.getByText(/corrected image and a Running Pod/i)).toBeInTheDocument()
  })
})
