import { useMemo, useState } from 'react'
import TerminalPanel from './components/TerminalPanel'
import { missionById, missions, type Mission, type WorkspaceStatus } from './data/missions'
import './App.css'

type LearnTab = 'guide' | 'commands' | 'values' | 'tutorial'

function App() {
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0].id)
  const [status, setStatus] = useState<WorkspaceStatus>('idle')
  const [feedbackTitle, setFeedbackTitle] = useState('Ready to learn')
  const [feedbackBody, setFeedbackBody] = useState(
    'Choose a simulated mission to review the goal, then start the exercise when you are ready.',
  )
  const [revealedHints, setRevealedHints] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [guidedRepairApplied, setGuidedRepairApplied] = useState(false)
  const [learnTab, setLearnTab] = useState<LearnTab>('guide')
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState(missions[0].glossary[0].term)

  const activeMission = missionById[selectedMissionId] as Mission
  const selectedGlossary =
    activeMission.glossary.find((item) => item.term === selectedGlossaryTerm) ??
    activeMission.glossary[0]

  const selectMission = (missionId: string) => {
    const nextMission = missionById[missionId] as Mission
    setSelectedMissionId(missionId)
    setStatus('idle')
    setFeedbackTitle(`${nextMission.title} ready`)
    setFeedbackBody(nextMission.whyItMatters)
    setRevealedHints(0)
    setSolutionVisible(false)
    setGuidedRepairApplied(false)
    setLearnTab('guide')
    setTutorialStepIndex(0)
    setSelectedGlossaryTerm(nextMission.glossary[0].term)
  }

  // The first GUI layer remains a simulated state machine on purpose. It gives
  // learners a stable, annotated environment for understanding mission logic
  // before every control is wired to live backend endpoints.
  const terminalLines = useMemo(() => {
    const lines = [...activeMission.terminal.intro]

    if (status === 'idle') {
      lines.push(`Selected mission: ${activeMission.title}`)
      lines.push('No simulated scenario is active yet.')
      lines.push('Tip: click Start Scenario to inject the learning state.')
      return lines
    }

    if (status === 'broken') {
      lines.push(...activeMission.terminal.broken)
    }

    if (status === 'in-progress') {
      lines.push(...activeMission.terminal.inProgress)
    }

    if (revealedHints > 0) {
      lines.push(`Hints unlocked: ${revealedHints}/${activeMission.hints.length}`)
    }

    if (solutionVisible) {
      lines.push('Suggested solution path:')
      activeMission.solutionCommands.forEach((command) => lines.push(command))
    }

    if (guidedRepairApplied) {
      lines.push(...activeMission.terminal.repaired)
    }

    if (status === 'passed') {
      lines.push(...activeMission.terminal.passed)
    }

    return lines
  }, [activeMission, guidedRepairApplied, revealedHints, solutionVisible, status])

  const startScenario = () => {
    setStatus('broken')
    setFeedbackTitle(activeMission.feedback.startTitle)
    setFeedbackBody(activeMission.feedback.startBody)
    setGuidedRepairApplied(false)
    setSolutionVisible(false)
    setRevealedHints(0)
  }

  const checkMyFix = () => {
    if (status === 'idle') {
      setFeedbackTitle('No exercise running')
      setFeedbackBody('Start the simulated mission first so the grader has something to evaluate.')
      return
    }

    if (guidedRepairApplied) {
      setStatus('passed')
      setFeedbackTitle(activeMission.feedback.passTitle)
      setFeedbackBody(activeMission.feedback.passBody)
      return
    }

    setStatus('in-progress')
    setFeedbackTitle(activeMission.feedback.failTitle)
    setFeedbackBody(activeMission.feedback.failBody)
  }

  const showHint = () => {
    setRevealedHints((current) => Math.min(current + 1, activeMission.hints.length))
    if (status === 'idle') {
      startScenario()
    }
  }

  const revealSolution = () => {
    setSolutionVisible(true)
    setFeedbackTitle('Solution revealed')
    setFeedbackBody(
      'Use the command list as a study aid. The goal is to understand why each command changes the observed Kubernetes state.',
    )
  }

  const applyGuidedRepair = () => {
    setGuidedRepairApplied(true)
    setFeedbackTitle(activeMission.feedback.repairTitle)
    setFeedbackBody(activeMission.feedback.repairBody)
  }

  const resetScenario = () => {
    setStatus('idle')
    setFeedbackTitle(`${activeMission.title} reset`)
    setFeedbackBody('The simulated mission is reset and ready for another learning pass.')
    setGuidedRepairApplied(false)
    setSolutionVisible(false)
    setRevealedHints(0)
  }

  const openGuide = (tab: LearnTab) => {
    setLearnTab(tab)
  }

  const currentTutorialStep = activeMission.tutorial[tutorialStepIndex]

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Purple Industries learning GUI</p>
          <h1>Learn Kubernetes by fixing simulated scenarios</h1>
          <p className="hero-copy">
            This interface is designed for learning, not passive monitoring. You choose a mission,
            inject a simulated failure, inspect what matters, use guided help, and then grade your
            fix.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={startScenario}
            title="Create a broken simulated cluster state for the selected mission."
          >
            Start Scenario
          </button>
          <button
            className="secondary-button"
            onClick={() => openGuide('tutorial')}
            title="Open the built-in tutorial and follow the learning steps."
          >
            Open Tutorial
          </button>
          <button
            className="secondary-button"
            onClick={() => openGuide('commands')}
            title="Open the command and value dictionary for the selected mission."
          >
            Open Guide & Dictionary
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
            <h2>Missions</h2>
            <span className={`status-chip status-chip-${status}`}>{status.replace('-', ' ')}</span>
          </div>
          <p className="section-copy">
            Every card below is usable now. These are simulated learning missions that teach
            Kubernetes reasoning before live backend mission endpoints are added.
          </p>
          <div className="scenario-list">
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
          <div className="panel-heading">
            <div>
              <h2>Exercise workspace</h2>
              <p className="panel-subtitle">{activeMission.title}</p>
            </div>
            <span className="mission-focus">{activeMission.whyItMatters}</span>
          </div>

          <div className="control-row">
            <button
              className="primary-button"
              onClick={startScenario}
              title="Create a broken simulated cluster state for this mission."
            >
              Inject Scenario
            </button>
            <button
              className="secondary-button"
              onClick={checkMyFix}
              title="Grade the current simulated cluster state against the mission requirements."
            >
              Check My Fix
            </button>
            <button
              className="secondary-button"
              onClick={showHint}
              title="Reveal the next small clue without jumping straight to the answer."
            >
              Show Hint
            </button>
            <button
              className="secondary-button"
              onClick={revealSolution}
              title="Show the target repair path and explain why it works."
            >
              Reveal Solution
            </button>
            <button
              className="secondary-button"
              onClick={applyGuidedRepair}
              disabled={status === 'idle'}
              title="Simulate the correct repair so you can observe how the grader responds."
            >
              Apply Guided Repair
            </button>
            <button
              className="ghost-button"
              onClick={resetScenario}
              title="Reset the simulated mission so you can try again."
            >
              Reset
            </button>
          </div>

          <TerminalPanel lines={terminalLines} />

          <div className="workspace-bottom">
            <article className="feedback-card">
              <h3>{feedbackTitle}</h3>
              <p>{feedbackBody}</p>
              <ul className="feedback-list">
                <li>The grader teaches what success means for the selected mission.</li>
                <li>Hints are progressive so you can learn without skipping straight to the answer.</li>
                <li>Every simulated mission mirrors the same operational loop: inspect, repair, validate.</li>
              </ul>
            </article>

            <article className="hint-card">
              <h3>Progressive hints</h3>
              {revealedHints === 0 ? (
                <p>No hints revealed yet. Try to inspect the simulated cluster state first.</p>
              ) : (
                <ol>
                  {activeMission.hints.slice(0, revealedHints).map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        </section>

        <aside className="panel learn-panel">
          <div className="panel-heading learn-panel-header">
            <div>
              <h2>Guide, dictionary, and tutorial</h2>
              <p className="panel-subtitle">
                This sidebar stays focused on the selected mission so help is easy to reach while
                you practice.
              </p>
            </div>
            <div className="learn-tabs">
              <button
                className={`tab-button${learnTab === 'guide' ? ' tab-button-active' : ''}`}
                onClick={() => openGuide('guide')}
                title="Open the mission guide and glossary."
              >
                Guide
              </button>
              <button
                className={`tab-button${learnTab === 'commands' ? ' tab-button-active' : ''}`}
                onClick={() => openGuide('commands')}
                title="Open the command dictionary for the selected mission."
              >
                Commands
              </button>
              <button
                className={`tab-button${learnTab === 'values' ? ' tab-button-active' : ''}`}
                onClick={() => openGuide('values')}
                title="Open the dictionary of important values and statuses."
              >
                Values
              </button>
              <button
                className={`tab-button${learnTab === 'tutorial' ? ' tab-button-active' : ''}`}
                onClick={() => openGuide('tutorial')}
                title="Open the step-by-step tutorial for the selected mission."
              >
                Tutorial
              </button>
            </div>
          </div>

          {learnTab === 'guide' && (
            <>
              <section className="learn-section">
                <h3>What you are learning</h3>
                <p>{activeMission.whyItMatters}</p>
              </section>

              <section className="learn-section">
                <h3>Mission guide</h3>
                <ol className="guide-list">
                  {activeMission.quickGuide.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>

              <section className="learn-section">
                <h3>Explain this</h3>
                <div className="glossary-grid">
                  {activeMission.glossary.map((item) => (
                    <button
                      key={item.term}
                      className={`glossary-chip${selectedGlossary.term === item.term ? ' glossary-chip-selected' : ''}`}
                      onClick={() => setSelectedGlossaryTerm(item.term)}
                      title="Describe what this Kubernetes object or field does in plain English."
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
                      <span
                        className="field-name"
                        title="See which Kubernetes fields the grader is checking."
                      >
                        {item.field}
                      </span>
                      <p>{item.explanation}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="learn-section">
                <h3>Common mistakes</h3>
                <ul className="guide-list">
                  {activeMission.commonMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {learnTab === 'commands' && (
            <section className="learn-section">
              <h3>Command dictionary</h3>
              <p>
                These are the most useful commands for the current mission. Each one is explained
                so the learner sees why the command exists, not just its syntax.
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
              <p>
                Kubernetes failures often become easier once you recognize what key values mean in
                context.
              </p>
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
                <p>
                  Follow these steps in order if you want a structured walkthrough of the current
                  simulated mission.
                </p>
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
