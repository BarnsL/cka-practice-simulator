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

  it('lets the learner switch missions and open tutorial/dictionaries', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Load Mission' })[0])
    expect(screen.getByText('Node scheduling clinic ready')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }))
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Commands' }))
    expect(screen.getByText(/kubectl get nodes --show-labels/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Values' }))
    expect(screen.getByText('lab-west')).toBeInTheDocument()
  })
})
