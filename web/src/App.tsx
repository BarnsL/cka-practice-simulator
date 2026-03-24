import { useMemo, useState } from 'react'
import LearningDashboard from './components/LearningDashboard'
import TerminalPanel from './components/TerminalPanel'
import {
  buildCommandBreakdown,
  missionById,
  missions,
  type LearningCommandEntry,
  type LearningGlossaryItem,
  type LearningValueEntry,
  type Mission,
  type TutorialStep,
} from './data/missions'
import {
  createFreePlayState,
  getFreePlayReference,
  getFreePlayStatus,
  runFreePlayCommand,
  type FreePlayState,
} from './lib/freePlay'
import {
  applyGuidedRepair,
  createMissionSession,
  getProgressLabel,
  getStatusLabel,
  getWorkspaceStatus,
  gradeMission,
  runMissionCommand,
  startMission,
  type MissionSession,
} from './lib/simulator'
import './App.css'

type LearnTab = 'guide' | 'commands' | 'values' | 'tutorial' | 'dashboard'
type WorkspaceMode = 'mission' | 'free-play'

const freePlayTutorial: TutorialStep[] = [
  {
    title: 'Inspect the sandbox first',
    body: 'Use `kubectl get` and `kubectl describe` commands before mutating the free-play cluster so you understand the current simulated state.',
  },
  {
    title: 'Mutate the simulated cluster',
    body: 'Use broad kubectl verbs like create, expose, set image, scale, label, annotate, taint, and delete to change the free-play environment.',
  },
  {
    title: 'Verify your changes',
    body: 'Read back the affected resources with get, describe, YAML views, or api-resources so the sandbox teaches both action and verification.',
  },
]

const freePlayGuide = [
  'Use free play when you want to experiment with kubectl verbs without a mission script constraining the next step.',
  'The sandbox keeps a mutable simulated cluster state for common resource types, so your commands change what later commands will return.',
  'Treat it like a lightweight API playground: inspect first, mutate carefully, and verify what changed.',
]

const freePlayCommonMistakes = [
  'Typing commands without checking the active namespace or context first.',
  'Mutating objects and then forgetting to verify them with get, describe, or YAML output.',
  'Expecting the free-play engine to be a full Kubernetes emulator instead of a broad teaching sandbox for common kubectl actions.',
]

function App() {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('mission')
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0].id)
  const [missionSession, setMissionSession] = useState<MissionSession>(() => createMissionSession(missions[0]))
  const [freePlayState, setFreePlayState] = useState<FreePlayState>(() => createFreePlayState())
  const [feedbackTitle, setFeedbackTitle] = useState('Ready to learn')
  const [feedbackBody, setFeedbackBody] = useState(
    'Choose a mission or enter free play, then use the terminal to inspect, change, and verify Kubernetes state.',
  )
  const [revealedHints, setRevealedHints] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [learnTab, setLearnTab] = useState<LearnTab>('guide')
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState(missions[0].glossary[0].term)
  const [latestCommand, setLatestCommand] = useState<string | null>(null)

  const activeMission = missionById[selectedMissionId] as Mission
  const freePlayReference = useMemo(() => getFreePlayReference(), [])

  const currentGlossaryItems: LearningGlossaryItem[] =
    workspaceMode === 'mission' ? activeMission.glossary : freePlayReference.glossary
  const currentValues: LearningValueEntry[] =
    workspaceMode === 'mission' ? activeMission.values : freePlayReference.values
  const currentCommands: LearningCommandEntry[] =
    workspaceMode === 'mission' ? activeMission.commands : freePlayReference.commands
  const currentTutorial = workspaceMode === 'mission' ? activeMission.tutorial : freePlayTutorial
  const currentTutorialStep = currentTutorial[tutorialStepIndex]
  const selectedGlossary =
    currentGlossaryItems.find((item) => item.term === selectedGlossaryTerm) ?? currentGlossaryItems[0]

  const workspaceStatus =
    workspaceMode === 'mission'
      ? getWorkspaceStatus(activeMission, missionSession)
      : getFreePlayStatus(freePlayState)

  const workspaceStatusLabel =
    workspaceMode === 'mission'
      ? getStatusLabel(workspaceStatus)
      : workspaceStatus === 'idle'
        ? 'Sandbox ready'
        : 'Sandbox active'

  const progressLabel =
    workspaceMode === 'mission'
      ? getProgressLabel(activeMission, missionSession)
      : `${freePlayState.namespaces.length} namespaces • ${freePlayState.deployments.length} deployments • ${freePlayState.pods.length} pods`

  const terminalLines = workspaceMode === 'mission' ? missionSession.transcript : freePlayState.transcript
  const terminalPrompt = 'student@cka-sim:~$'
  const quickCommands =
    workspaceMode === 'mission'
      ? activeMission.commands.map((item) => item.command)
      : freePlayReference.quickCommands

  function resetMissionView(nextMission: Mission) {
    setMissionSession(createMissionSession(nextMission))
    setFeedbackTitle(`${nextMission.title} ready`)
    setFeedbackBody(nextMission.whyItMatters)
    setRevealedHints(0)
    setSolutionVisible(false)
    setLearnTab('guide')
    setTutorialStepIndex(0)
    setSelectedGlossaryTerm(nextMission.glossary[0].term)
    setLatestCommand(null)
  }

  function enterMissionMode(missionId: string) {
    const nextMission = missionById[missionId] as Mission
    setWorkspaceMode('mission')
    setSelectedMissionId(missionId)
    resetMissionView(nextMission)
  }

  function enterFreePlayMode() {
    setWorkspaceMode('free-play')
    setFeedbackTitle('Free play ready')
    setFeedbackBody(
      'The free-play sandbox lets you mutate a simulated cluster with broad kubectl verbs and immediately observe the resulting state changes.',
    )
    setRevealedHints(0)
    setSolutionVisible(false)
    setLearnTab('guide')
    setTutorialStepIndex(0)
    setSelectedGlossaryTerm(freePlayReference.glossary[0].term)
    setLatestCommand(null)
  }

  const runTerminalCommand = (command: string) => {
    setLatestCommand(command)

    if (workspaceMode === 'mission') {
      const result = runMissionCommand(activeMission, missionSession, command)
      setMissionSession(result.session)

      if (result.feedbackTitle) {
        setFeedbackTitle(result.feedbackTitle)
      }

      if (result.feedbackBody) {
        setFeedbackBody(result.feedbackBody)
      }

      return
    }

    const result = runFreePlayCommand(freePlayState, command)
    setFreePlayState(result.state)
    if (result.feedbackTitle) {
      setFeedbackTitle(result.feedbackTitle)
    }

    if (result.feedbackBody) {
      setFeedbackBody(result.feedbackBody)
    }
  }

  const injectScenario = () => {
    if (workspaceMode === 'free-play') {
      setFreePlayState(createFreePlayState())
      setFeedbackTitle('Sandbox reset')
      setFeedbackBody('The free-play sandbox was reset to a clean starting state so you can experiment again.')
      setLatestCommand(null)
      return
    }

    const result = startMission(activeMission)
    setMissionSession(result.session)
    setFeedbackTitle(result.feedbackTitle ?? activeMission.feedback.startTitle)
    setFeedbackBody(result.feedbackBody ?? activeMission.feedback.startBody)
    setSolutionVisible(false)
    setRevealedHints(0)
    setLatestCommand(null)
  }

  const checkMyFix = () => {
    if (workspaceMode === 'free-play') {
      setFeedbackTitle('Sandbox inspection mode')
      setFeedbackBody(
        'Free play does not grade against one answer. Use get, describe, YAML, and explain commands to inspect whatever state you created.',
      )
      return
    }

    const result = gradeMission(activeMission, missionSession)
    setMissionSession(result.session)
    setFeedbackTitle(result.feedbackTitle)
    setFeedbackBody(result.feedbackBody)
  }

  const showHint = () => {
    if (workspaceMode === 'free-play') {
      const hintIndex = Math.min(revealedHints, freePlayGuide.length - 1)
      setRevealedHints((current) => Math.min(current + 1, freePlayGuide.length))
      setFeedbackTitle(`Free play hint ${hintIndex + 1}`)
      setFeedbackBody(freePlayGuide[hintIndex])
      return
    }

    const nextHintCount = Math.min(revealedHints + 1, activeMission.hints.length)
    setRevealedHints(nextHintCount)

    // Hints should progress even when the learner has not explicitly injected
    // a mission yet. In that case, the simulator starts the scenario first so
    // the revealed hint has a matching piece of terminal evidence to inspect.
    if (!missionSession.injected) {
      const result = startMission(activeMission)
      setMissionSession(result.session)
    }

    setFeedbackTitle(`Hint ${nextHintCount}`)
    setFeedbackBody(activeMission.hints[nextHintCount - 1] ?? 'All hints for this mission are already visible.')
  }

  const revealSolution = () => {
    if (workspaceMode === 'free-play') {
      setLearnTab('commands')
      setFeedbackTitle('Free play reference opened')
      setFeedbackBody('Use the command breakdowns to understand how the broad kubectl sandbox is interpreting each free-play command shape.')
      return
    }

    setSolutionVisible(true)
    setFeedbackTitle('Solution path revealed')
    setFeedbackBody(
      'Study the commands as a repair sequence. In a live cluster you would still inspect first, then run only the commands the evidence supports.',
    )
  }

  const useGuidedRepair = () => {
    if (workspaceMode === 'free-play') {
      setFeedbackTitle('Free play has no single repair path')
      setFeedbackBody('Free play is intentionally open-ended. Use the reference commands and command breakdowns to mutate the sandbox however you want.')
      return
    }

    const result = applyGuidedRepair(activeMission, missionSession)
    setMissionSession(result.session)

    if (result.feedbackTitle) {
      setFeedbackTitle(result.feedbackTitle)
    }

    if (result.feedbackBody) {
      setFeedbackBody(result.feedbackBody)
    }
  }

  const resetScenario = () => {
    if (workspaceMode === 'free-play') {
      setFreePlayState(createFreePlayState())
      setFeedbackTitle('Free play reset')
      setFeedbackBody('The simulated cluster state was reset so you can try a different command sequence from scratch.')
      setRevealedHints(0)
      setTutorialStepIndex(0)
      setSelectedGlossaryTerm(freePlayReference.glossary[0].term)
      setLatestCommand(null)
      return
    }

    resetMissionView(activeMission)
    setFeedbackTitle(`${activeMission.title} reset`)
    setFeedbackBody('The mission transcript, hints, and progress were reset so you can practice again.')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Purple Industries learning GUI</p>
          <h1>Learn Kubernetes through guided missions and a stateful free-play CLI sandbox</h1>
          <p className="hero-copy">
            The simulator now explains commands token by token, lets guided missions react to your
            fixes, and gives you a broader free-play cluster where common kubectl actions mutate the
            test system in visible ways.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={injectScenario}
            title={
              workspaceMode === 'mission'
                ? 'Create the broken simulated cluster state for the selected mission.'
                : 'Reset the free-play sandbox to its clean default cluster state.'
            }
          >
            {workspaceMode === 'mission' ? 'Start Scenario' : 'Reset Sandbox'}
          </button>
          <button
            className="secondary-button"
            onClick={enterFreePlayMode}
            title="Switch to the stateful free-play sandbox."
          >
            Open Free Play
          </button>
          <button
            className="secondary-button"
            onClick={() => setLearnTab('tutorial')}
            title="Open the built-in walkthrough for the current mode."
          >
            Open Tutorial
          </button>
          <a
            className="secondary-link"
            href={workspaceMode === 'mission' ? activeMission.docsUrl : 'https://kubernetes.io/docs/reference/kubectl/'}
            target="_blank"
            rel="noreferrer"
            title="Open the official Kubernetes documentation for the current learning surface."
          >
            View Official Docs
          </a>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel scenario-panel">
          <div className="panel-heading">
            <div>
              <h2>Modes and missions</h2>
              <p className="panel-subtitle">
                {missions.length} guided labs plus a stateful free-play sandbox
              </p>
            </div>
            <span className={`status-chip status-chip-${workspaceStatus}`}>{workspaceStatusLabel}</span>
          </div>
          <article className={`scenario-card free-play-card${workspaceMode === 'free-play' ? ' scenario-card-active' : ''}`}>
            <div className="scenario-card-top">
              <h3>Free play mode</h3>
              <span className="difficulty-pill">Sandbox</span>
            </div>
            <p className="scenario-description">
              Run broad kubectl actions against a mutable simulated cluster instead of following one
              scripted repair path.
            </p>
            <p className="scenario-goal">
              <strong>Learning goal:</strong> Understand how common kubectl verbs change live system
              state and how to verify those mutations.
            </p>
            <p className="scenario-meta">
              Stateful sandbox • broad commands like create, get, describe, expose, set image,
              scale, label, annotate, taint, and delete
            </p>
            <div className="scenario-actions">
              <button
                className="secondary-button"
                onClick={enterFreePlayMode}
                title="Switch to the free-play cluster sandbox."
              >
                {workspaceMode === 'free-play' ? 'Selected Mode' : 'Open Free Play'}
              </button>
              <a href="https://kubernetes.io/docs/reference/kubectl/" target="_blank" rel="noreferrer">
                Docs
              </a>
            </div>
          </article>
          <div className="scenario-list scenario-list-scroll">
            {missions.map((mission) => (
              <article
                key={mission.id}
                className={`scenario-card${workspaceMode === 'mission' && mission.id === activeMission.id ? ' scenario-card-active' : ''}`}
              >
                <div className="scenario-card-top">
                  <h3>{mission.title}</h3>
                  <span className="difficulty-pill">{mission.difficulty}</span>
                </div>
                <p className="scenario-description">{mission.description}</p>
                <p className="scenario-goal">
                  <strong>Learning goal:</strong> {mission.learningGoal}
                </p>
                <p className="scenario-meta">
                  {mission.cli.actions.length} repair step{mission.cli.actions.length === 1 ? '' : 's'} •{' '}
                  {mission.commands.length} modeled commands
                </p>
                <div className="scenario-actions">
                  <button
                    className="secondary-button"
                    onClick={() => enterMissionMode(mission.id)}
                    title={mission.tooltip}
                  >
                    {workspaceMode === 'mission' && mission.id === activeMission.id ? 'Selected Mission' : 'Load Mission'}
                  </button>
                  <a href={mission.docsUrl} target="_blank" rel="noreferrer">
                    Docs
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel workspace-panel">
          <div className="panel-heading workspace-heading">
            <div>
              <h2>Exercise workspace</h2>
              <p className="panel-subtitle">
                {workspaceMode === 'mission' ? activeMission.title : 'Free play cluster sandbox'}
              </p>
            </div>
            <div className="workspace-status-block">
              <span className={`status-chip status-chip-${workspaceStatus}`}>{workspaceStatusLabel}</span>
              <span className="progress-copy">{progressLabel}</span>
            </div>
          </div>

          <p className="mission-focus">
            {workspaceMode === 'mission'
              ? activeMission.whyItMatters
              : 'Free play is for exploratory kubectl practice. The simulator keeps a mutable cluster state so later commands reflect earlier actions.'}
          </p>

          <div className="control-row">
            <button
              className="primary-button"
              onClick={injectScenario}
              title={
                workspaceMode === 'mission'
                  ? 'Inject the simulated cluster state for the selected mission.'
                  : 'Reset the free-play sandbox to its clean starting cluster.'
              }
            >
              {workspaceMode === 'mission' ? 'Inject Scenario' : 'Reset Sandbox'}
            </button>
            <button
              className="secondary-button"
              onClick={checkMyFix}
              title={
                workspaceMode === 'mission'
                  ? 'Run the simulated grader against the current mission progress.'
                  : 'Show a reminder that free play should be verified with kubectl reads rather than one answer key.'
              }
            >
              {workspaceMode === 'mission' ? 'Check My Fix' : 'Inspect Sandbox'}
            </button>
            <button
              className="secondary-button"
              onClick={showHint}
              title="Reveal the next clue or free-play guidance item."
            >
              Show Hint
            </button>
            <button
              className="secondary-button"
              onClick={revealSolution}
              title={
                workspaceMode === 'mission'
                  ? 'Show the intended repair sequence for study purposes.'
                  : 'Open the command-reference view for free play.'
              }
            >
              {workspaceMode === 'mission' ? 'Reveal Solution' : 'Open Command Reference'}
            </button>
            <button
              className="secondary-button"
              onClick={useGuidedRepair}
              title={
                workspaceMode === 'mission'
                  ? 'Apply the modeled repair steps automatically so you can observe the grader response.'
                  : 'Free play is open-ended and does not have one guided repair path.'
              }
            >
              {workspaceMode === 'mission' ? 'Apply Guided Repair' : 'Free Play Notes'}
            </button>
            <button
              className="ghost-button"
              onClick={resetScenario}
              title="Reset the current learning surface."
            >
              Reset
            </button>
          </div>

          <TerminalPanel
            lines={terminalLines}
            prompt={terminalPrompt}
            quickCommands={quickCommands}
            onSubmitCommand={runTerminalCommand}
          />

          <div className="workspace-bottom">
            <article className="feedback-card">
              <h3>{feedbackTitle}</h3>
              <p>{feedbackBody}</p>
              <ul className="feedback-list">
                {(workspaceMode === 'mission'
                  ? activeMission.cli.successCriteria
                  : [
                      'Use get, describe, YAML, and explain commands to verify state changes.',
                      'The sandbox persists common resource mutations until you reset it.',
                      'Command breakdowns below explain how each free-play command is interpreted.',
                    ]
                ).map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </article>

            <article className="hint-card">
              <h3>Progressive hints</h3>
              {revealedHints === 0 ? (
                <p>
                  No hints revealed yet. {workspaceMode === 'mission'
                    ? 'Start the scenario and inspect the evidence first.'
                    : 'Inspect the sandbox first, then reveal guidance if you want help.'}
                </p>
              ) : (
                <ol>
                  {(workspaceMode === 'mission' ? activeMission.hints : freePlayGuide)
                    .slice(0, revealedHints)
                    .map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                </ol>
              )}
            </article>
          </div>

          {workspaceMode === 'mission' && solutionVisible && (
            <article className="solution-card">
              <h3>Suggested repair sequence</h3>
              <ol className="guide-list">
                {activeMission.solutionCommands.map((command) => (
                  <li key={command}>
                    <code>{command}</code>
                    <ul className="command-breakdown-list">
                      {buildCommandBreakdown(command).map((part) => (
                        <li key={`${command}-${part.value}-${part.role}`}>
                          <strong>{part.role}:</strong> <code>{part.value}</code> - {part.explanation}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </article>
          )}
        </section>

        <aside className="panel learn-panel">
          <div className="panel-heading learn-panel-header">
            <div>
              <h2>Guide, dictionary, and tutorial</h2>
              <p className="panel-subtitle">
                The help sidebar stays aligned to the current mission or free-play sandbox so the
                teaching surface always matches the active terminal.
              </p>
            </div>
            <div className="learn-tabs">
              <button
                className={`tab-button${learnTab === 'dashboard' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('dashboard')}
                title="Open the learner-friendly visual dashboard."
              >
                Dashboard
              </button>
              <button
                className={`tab-button${learnTab === 'guide' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('guide')}
                title="Open the guide and glossary for the current mode."
              >
                Guide
              </button>
              <button
                className={`tab-button${learnTab === 'commands' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('commands')}
                title="Open the command dictionary and token-by-token breakdowns."
              >
                Commands
              </button>
              <button
                className={`tab-button${learnTab === 'values' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('values')}
                title="Open the values and statuses dictionary."
              >
                Values
              </button>
              <button
                className={`tab-button${learnTab === 'tutorial' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('tutorial')}
                title="Open the step-by-step walkthrough."
              >
                Tutorial
              </button>
            </div>
          </div>

          {learnTab === 'dashboard' && (
            <LearningDashboard
              mode={workspaceMode}
              mission={activeMission}
              commands={currentCommands}
              freePlayState={freePlayState}
              latestCommand={latestCommand}
              progressLabel={progressLabel}
              workspaceStatusLabel={workspaceStatusLabel}
            />
          )}

          {learnTab === 'guide' && (
            <>
              <section className="learn-section">
                <h3>Guide</h3>
                <ol className="guide-list">
                  {(workspaceMode === 'mission' ? activeMission.quickGuide : freePlayGuide).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>

              <section className="learn-section">
                <h3>Common mistakes</h3>
                <ul className="guide-list">
                  {(workspaceMode === 'mission' ? activeMission.commonMistakes : freePlayCommonMistakes).map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </section>

              <section className="learn-section">
                <h3>Explain this</h3>
                <div className="glossary-grid">
                  {currentGlossaryItems.map((item) => (
                    <button
                      key={item.term}
                      className={`glossary-chip${selectedGlossary.term === item.term ? ' glossary-chip-selected' : ''}`}
                      onClick={() => setSelectedGlossaryTerm(item.term)}
                      title="Describe what this Kubernetes term means in plain English."
                    >
                      {item.term}
                    </button>
                  ))}
                </div>
                <div className="glossary-definition">
                  <strong>{selectedGlossary.term}</strong>
                  <p>{selectedGlossary.definition}</p>
                </div>
              </section>

              {workspaceMode === 'mission' && (
                <section className="learn-section">
                  <h3>API field inspector</h3>
                  <ul className="field-list">
                    {activeMission.fieldGuide.map((item) => (
                      <li key={item.field}>
                        <span className="field-name">{item.field}</span>
                        <p>{item.explanation}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {learnTab === 'commands' && (
            <section className="learn-section">
              <h3>Command dictionary</h3>
              <p>
                Every command below is broken down by part so the simulator teaches not just what to
                run, but how the command is structured.
              </p>
              <ul className="dictionary-list">
                {currentCommands.map((entry) => (
                  <li key={entry.command}>
                    <code>{entry.command}</code>
                    <p>{entry.purpose}</p>
                    <ul className="command-breakdown-list">
                      {(entry.breakdown ?? buildCommandBreakdown(entry.command)).map((part) => (
                        <li key={`${entry.command}-${part.value}-${part.role}`}>
                          <strong>{part.role}:</strong> <code>{part.value}</code> - {part.explanation}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {learnTab === 'values' && (
            <section className="learn-section">
              <h3>Values and status dictionary</h3>
              <p>Use these values as pattern-recognition anchors while you debug or experiment.</p>
              <ul className="dictionary-list">
                {currentValues.map((entry) => (
                  <li key={entry.value}>
                    <code>{entry.value}</code>
                    <p>{entry.meaning}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {learnTab === 'tutorial' && (
            <>
              <section className="learn-section">
                <h3>{workspaceMode === 'mission' ? 'Mission tutorial' : 'Free play tutorial'}</h3>
                <p>
                  Follow the steps in order if you want a structured walkthrough before more open
                  exploration.
                </p>
              </section>
              <article className="tutorial-card">
                <p className="tutorial-step-count">
                  Step {tutorialStepIndex + 1} of {currentTutorial.length}
                </p>
                <h3>{currentTutorialStep.title}</h3>
                <p>{currentTutorialStep.body}</p>
                <div className="tutorial-actions">
                  <button
                    className="ghost-button"
                    disabled={tutorialStepIndex === 0}
                    onClick={() => setTutorialStepIndex((current) => Math.max(current - 1, 0))}
                    title="Go to the previous tutorial step."
                  >
                    Previous
                  </button>
                  <button
                    className="secondary-button"
                    disabled={tutorialStepIndex === currentTutorial.length - 1}
                    onClick={() =>
                      setTutorialStepIndex((current) => Math.min(current + 1, currentTutorial.length - 1))
                    }
                    title="Go to the next tutorial step."
                  >
                    Next
                  </button>
                </div>
              </article>
            </>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
