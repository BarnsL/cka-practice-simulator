import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

type TerminalPanelProps = {
  lines: string[]
  prompt: string
  quickCommands: string[]
  onSubmitCommand: (command: string) => void
}

function TerminalPanel({ lines, prompt, quickCommands, onSubmitCommand }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!hostRef.current || terminalRef.current) {
      return
    }

    const terminal = new Terminal({
      cols: 88,
      rows: 20,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: '#0f172a',
        foreground: '#dbeafe',
        cursor: '#c084fc',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
      },
    })

    terminal.open(hostRef.current)
    terminalRef.current = terminal

    return () => {
      terminal.dispose()
      terminalRef.current = null
    }
  }, [])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) {
      return
    }

    // xterm remains the output surface because it makes the simulator feel like
    // a CLI, but the learner types into a controlled input below so command
    // parsing stays deterministic and easy to test.
    terminal.reset()
    lines.forEach((line) => terminal.writeln(line))
  }, [lines])

  const submitCommand = (nextCommand: string) => {
    const trimmed = nextCommand.trim()
    if (!trimmed) {
      return
    }

    onSubmitCommand(trimmed)
    setHistory((current) => [...current, trimmed])
    setHistoryIndex(null)
    setCommand('')
  }

  return (
    <div className="terminal-card">
      <div className="terminal-header">
        <span className="terminal-dot terminal-dot-red" />
        <span className="terminal-dot terminal-dot-yellow" />
        <span className="terminal-dot terminal-dot-green" />
        <span className="terminal-title">Practice terminal</span>
      </div>
      <div
        ref={hostRef}
        className="terminal-host"
        aria-label="Kubernetes practice terminal"
      />
      <form
        className="terminal-input-row"
        onSubmit={(event) => {
          event.preventDefault()
          submitCommand(command)
        }}
      >
        <label className="terminal-prompt" htmlFor="terminal-command">
          {prompt}
        </label>
        <input
          id="terminal-command"
          className="terminal-input"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              if (history.length === 0) {
                return
              }
              const nextIndex = historyIndex === null ? history.length - 1 : Math.max(historyIndex - 1, 0)
              setHistoryIndex(nextIndex)
              setCommand(history[nextIndex])
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (history.length === 0) {
                return
              }
              if (historyIndex === null) {
                return
              }
              const nextIndex = Math.min(historyIndex + 1, history.length)
              if (nextIndex === history.length) {
                setHistoryIndex(null)
                setCommand('')
                return
              }
              setHistoryIndex(nextIndex)
              setCommand(history[nextIndex])
            }
          }}
          placeholder="Type a supported kubectl command and press Enter"
          aria-label="Command line"
        />
        <button className="secondary-button" type="submit" title="Run the current command in the simulated terminal.">
          Run
        </button>
      </form>
      <div className="terminal-quick-actions">
        {quickCommands.slice(0, 6).map((quickCommand) => (
          <button
            key={quickCommand}
            className="ghost-button terminal-quick-button"
            type="button"
            onClick={() => submitCommand(quickCommand)}
            title="Run a suggested command for the selected mission."
          >
            {quickCommand}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TerminalPanel
