import { useState } from 'react'
import TerminalPanel from './components/TerminalPanel'
import { missionById, missions, type Mission } from './data/missions'
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

type LearnTab = 'guide' | 'commands' | 'values' | 'tutorial'

function App() {
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0].id)
  const [session, setSession] = useState<MissionSession>(() => createMissionSession(missions[0]))
  const [feedbackTitle, setFeedbackTitle] = useState('Ready to learn')
  const [feedbackBody, setFeedbackBody] = useState(
    'Choose a mission, inject the scenario, then work through the simulated kubectl flow from the terminal.',
  )
  const [revealedHints, setRevealedHints] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [learnTab, setLearnTab] = useState<LearnTab>('guide')
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState(missions[0].glossary[0].term)

  const activeMission = missionById[selectedMissionId] as Mission
  const workspaceStatus = getWorkspaceStatus(activeMission, session)
  const workspaceStatusLabel = getStatusLabel(workspaceStatus)
  const progressLabel = getProgressLabel(activeMission, session)
  const currentTutorialStep = activeMission.tutorial[tutorialStepIndex]
  const selectedGlossary =
    activeMission.glossary.find((item) => item.term === selectedGlossaryTerm) ??
    activeMission.glossary[0]

  function resetLearningView(nextMission: Mission) {
    setSession(createMissionSession(nextMission))
    setFeedbackTitle(`${nextMission.title} ready`)
    setFeedbackBody(nextMission.whyItMatters)
    setRevealedHints(0)
    setSolutionVisible(false)
    setLearnTab('guide')
    setTutorialStepIndex(0)
    setSelectedGlossaryTerm(nextMission.glossary[0].term)
  }

  const selectMission = (missionId: string) => {
    const nextMission = missionById[missionId] as Mission
    setSelectedMissionId(missionId)
    resetLearningView(nextMission)
  }

  const runTerminalCommand = (command: string) => {
    const result = runMissionCommand(activeMission, session, command)
    setSession(result.session)

    if (result.feedbackTitle) {
      setFeedbackTitle(result.feedbackTitle)
    }

    if (result.feedbackBody) {
      setFeedbackBody(result.feedbackBody)
    }
  }

  const injectScenario = () => {
    const result = startMission(activeMission)
    setSession(result.session)
    setFeedbackTitle(result.feedbackTitle ?? activeMission.feedback.startTitle)
    setFeedbackBody(result.feedbackBody ?? activeMission.feedback.startBody)
    setSolutionVisible(false)
    setRevealedHints(0)
  }

  const checkMyFix = () => {
    const result = gradeMission(activeMission, session)
    setSession(result.session)
    setFeedbackTitle(result.feedbackTitle)
    setFeedbackBody(result.feedbackBody)
  }

  const showHint = () => {
    const nextHintCount = Math.min(revealedHints + 1, activeMission.hints.length)
    setRevealedHints(nextHintCount)

    if (!session.injected) {
      const result = startMission(activeMission)
      setSession(result.session)
    }

    setFeedbackTitle(`Hint ${nextHintCount}`)
    setFeedbackBody(activeMission.hints[nextHintCount - 1] ?? 'All hints for this mission are already visible.')
  }

  const revealSolution = () => {
    setSolutionVisible(true)
    setFeedbackTitle('Solution path revealed')
    setFeedbackBody(
      'Study the commands as a repair sequence. In a live cluster you would still inspect first, then run only the commands the evidence supports.',
    )
  }

  const useGuidedRepair = () => {
    const result = applyGuidedRepair(activeMission, session)
    setSession(result.session)

    if (result.feedbackTitle) {
      setFeedbackTitle(result.feedbackTitle)
    }

    if (result.feedbackBody) {
      setFeedbackBody(result.feedbackBody)
    }
  }

  const resetScenario = () => {
    resetLearningView(activeMission)
    setFeedbackTitle(`${activeMission.title} reset`)
    setFeedbackBody('The mission transcript and repair progress were reset so you can practice again.')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Purple Industries learning GUI</p>
          <h1>Learn Kubernetes by fixing simulated scenarios through a real command loop</h1>
          <p className="hero-copy">
            This simulator now treats the terminal as the main learning surface. Inject a mission,
            run supported `kubectl` commands, inspect the evidence, apply the fix, and then grade
            the outcome.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={injectScenario}
            title="Create the broken simulated cluster state for the selected mission."
          >
            Start Scenario
          </button>
          <button
            className="secondary-button"
            onClick={() => setLearnTab('tutorial')}
            title="Open the built-in mission walkthrough."
          >
            Open Tutorial
          </button>
          <a
            className="secondary-link"
            href={activeMission.docsUrl}
            target="_blank"
            rel="noreferrer"
            title="Open the official Kubernetes documentation for the selected mission."
          >
            View Official Docs
          </a>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel scenario-panel">
          <div className="panel-heading">
            <div>
              <h2>Missions</h2>
              <p className="panel-subtitle">{missions.length} simulated labs available</p>
            </div>
            <span className={`status-chip status-chip-${workspaceStatus}`}>{workspaceStatusLabel}</span>
          </div>
          <p className="section-copy">
            The status chip now reflects actual mission progress. It stays neutral until you inject a
            scenario, turns warning while repairs are incomplete, and only goes green after the
            grader can pass the mission.
          </p>
          <div className="scenario-list scenario-list-scroll">
            {missions.map((mission) => (
              <article
                key={mission.id}
                className={`scenario-card${mission.id === activeMission.id ? ' scenario-card-active' : ''}`}
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
                    onClick={() => selectMission(mission.id)}
                    title={mission.tooltip}
                  >
                    {mission.id === activeMission.id ? 'Selected Mission' : 'Load Mission'}
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
              <p className="panel-subtitle">{activeMission.title}</p>
            </div>
            <div className="workspace-status-block">
              <span className={`status-chip status-chip-${workspaceStatus}`}>{workspaceStatusLabel}</span>
              <span className="progress-copy">{progressLabel}</span>
            </div>
          </div>

          <p className="mission-focus">{activeMission.whyItMatters}</p>

          <div className="control-row">
            <button
              className="primary-button"
              onClick={injectScenario}
              title="Inject the simulated cluster state for the selected mission."
            >
              Inject Scenario
            </button>
            <button
              className="secondary-button"
              onClick={checkMyFix}
              title="Run the simulated grader against the current mission progress."
            >
              Check My Fix
            </button>
            <button
              className="secondary-button"
              onClick={showHint}
              title="Reveal the next clue without immediately giving away the answer."
            >
              Show Hint
            </button>
            <button
              className="secondary-button"
              onClick={revealSolution}
              title="Show the intended repair sequence for study purposes."
            >
              Reveal Solution
            </button>
            <button
              className="secondary-button"
              onClick={useGuidedRepair}
              title="Apply the modeled repair steps automatically so you can observe the grader response."
            >
              Apply Guided Repair
            </button>
            <button
              className="ghost-button"
              onClick={resetScenario}
              title="Reset transcript, hints, and progress for the selected mission."
            >
              Reset
            </button>
          </div>

          <TerminalPanel
            lines={session.transcript}
            prompt={activeMission.cli.prompt}
            quickCommands={activeMission.commands.map((item) => item.command)}
            onSubmitCommand={runTerminalCommand}
          />

          <div className="workspace-bottom">
            <article className="feedback-card">
              <h3>{feedbackTitle}</h3>
              <p>{feedbackBody}</p>
              <ul className="feedback-list">
                {activeMission.cli.successCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </article>

            <article className="hint-card">
              <h3>Progressive hints</h3>
              {revealedHints === 0 ? (
                <p>No hints revealed yet. Start the scenario and inspect the evidence first.</p>
              ) : (
                <ol>
                  {activeMission.hints.slice(0, revealedHints).map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              )}
            </article>
          </div>

          {solutionVisible && (
            <article className="solution-card">
              <h3>Suggested repair sequence</h3>
              <ol className="guide-list">
                {activeMission.solutionCommands.map((command) => (
                  <li key={command}>
                    <code>{command}</code>
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
                The help sidebar stays mission-specific so the guidance always matches the terminal
                exercise you are running.
              </p>
            </div>
            <div className="learn-tabs">
              <button
                className={`tab-button${learnTab === 'guide' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('guide')}
                title="Open the mission guide and glossary."
              >
                Guide
              </button>
              <button
                className={`tab-button${learnTab === 'commands' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('commands')}
                title="Open the command dictionary for the selected mission."
              >
                Commands
              </button>
              <button
                className={`tab-button${learnTab === 'values' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('values')}
                title="Open the values and statuses dictionary for the selected mission."
              >
                Values
              </button>
              <button
                className={`tab-button${learnTab === 'tutorial' ? ' tab-button-active' : ''}`}
                onClick={() => setLearnTab('tutorial')}
                title="Open the mission walkthrough."
              >
                Tutorial
              </button>
            </div>
          </div>

          {learnTab === 'guide' && (
            <>
              <section className="learn-section">
                <h3>Mission guide</h3>
                <ol className="guide-list">
                  {activeMission.quickGuide.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>

              <section className="learn-section">
                <h3>Common mistakes</h3>
                <ul className="guide-list">
                  {activeMission.commonMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </section>

              <section className="learn-section">
                <h3>Explain this</h3>
                <div className="glossary-grid">
                  {activeMission.glossary.map((item) => (
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
            </>
          )}

          {learnTab === 'commands' && (
            <section className="learn-section">
              <h3>Command dictionary</h3>
              <p>
                Every command below is modeled by the simulator for this mission. The terminal
                accepts these commands directly after you inject the scenario.
              </p>
              <ul className="dictionary-list">
                {activeMission.commands.map((entry) => (
                  <li key={entry.command}>
                    <code>{entry.command}</code>
                    <p>{entry.purpose}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {learnTab === 'values' && (
            <section className="learn-section">
              <h3>Values and status dictionary</h3>
              <p>Use these values as pattern recognition anchors while you debug the current mission.</p>
              <ul className="dictionary-list">
                {activeMission.values.map((entry) => (
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
                <h3>Mission tutorial</h3>
                <p>Follow the steps in order if you want a guided walkthrough before free-form practice.</p>
              </section>
              <article className="tutorial-card">
                <p className="tutorial-step-count">
                  Step {tutorialStepIndex + 1} of {activeMission.tutorial.length}
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
                    disabled={tutorialStepIndex === activeMission.tutorial.length - 1}
                    onClick={() =>
                      setTutorialStepIndex((current) =>
                        Math.min(current + 1, activeMission.tutorial.length - 1),
                      )
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
