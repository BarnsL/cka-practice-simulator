import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

type TerminalPanelProps = {
  lines: string[]
}

function TerminalPanel({ lines }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)

  useEffect(() => {
    if (!hostRef.current || terminalRef.current) {
      return
    }

    const terminal = new Terminal({
      cols: 68,
      rows: 16,
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

    // The terminal mirrors the current learning state rather than accepting
    // input yet. This keeps the first GUI slice teachable while backend and
    // PTY wiring are still being added.
    terminal.reset()
    lines.forEach((line) => terminal.writeln(line))
  }, [lines])

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
        aria-label="Kubernetes practice terminal preview"
      />
    </div>
  )
}

export default TerminalPanel
