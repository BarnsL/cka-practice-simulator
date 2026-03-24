import { useMemo, useState } from 'react'
import TerminalPanel from './components/TerminalPanel'
import './App.css'

type WorkspaceStatus = 'idle' | 'broken' | 'in-progress' | 'passed'

type ScenarioCard = {
  id: string
  title: string
  difficulty: string
  learningGoal: string
  description: string
  docsUrl: string
  tooltip: string
  available: boolean
}

type GlossaryItem = {
  term: string
  definition: string
}

type FieldGuide = {
  field: string
  explanation: string
}

const scenarios: ScenarioCard[] = [
  {
    id: 'pod-image',
    title: 'Pod image repair',
    difficulty: 'Beginner',
    learningGoal: 'Learn how Pod phase and container image fields affect workload health.',
    description:
      'Fix a Pod that was injected with a broken image, then verify that the workload reaches Running.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/pods/',
    tooltip: 'This is the first live learning path backed by the simulator.',
    available: true,
  },
  {
    id: 'node-scheduling',
    title: 'Scheduling and node placement',
    difficulty: 'Soon',
    learningGoal: 'Understand node selectors, taints, and scheduling clues.',
    description: 'Future exercise focused on why Pods land on specific nodes.',
    docsUrl: 'https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/',
    tooltip: 'Planned next: this will teach nodeName, selectors, and scheduling constraints.',
    available: false,
  },
  {
    id: 'storage-binding',
    title: 'Persistent volume binding',
    difficulty: 'Soon',
    learningGoal: 'Learn how PVCs, PVs, and storage classes interact.',
    description: 'Future exercise focused on diagnosing why a claim does not bind.',
    docsUrl: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/',
    tooltip: 'Planned: storage labs will explain binding, access modes, and capacity mismatches.',
    available: false,
  },
]

const hints = [
  'Inspect the Pod before changing anything. Start with `kubectl get pod demo-pod -o wide`.',
  'The failing field is in the Pod spec. Look closely at `spec.containers[0].image`.',
  'The grader also checks runtime health. A correct image alone is not enough until the Pod becomes Running.',
]

const glossary: GlossaryItem[] = [
  {
    term: 'Pod',
    definition:
      'The smallest deployable unit in Kubernetes. It wraps one or more containers that share networking and storage.',
  },
  {
    term: 'spec.containers.image',
    definition:
      'The image reference Kubernetes will try to pull for a container. A bad tag commonly causes image pull failures.',
  },
  {
    term: 'status.phase',
    definition:
      'A coarse summary of Pod lifecycle state such as Pending, Running, Succeeded, Failed, or Unknown.',
  },
  {
    term: 'kubeconfig',
    definition:
      'A client configuration file that tells kubectl or this simulator how to reach and authenticate to a cluster.',
  },
]

const fieldGuide: FieldGuide[] = [
  {
    field: 'spec.containers[0].image',
    explanation:
      'The simulator injects a bad image here. Fixing it is the direct repair action for this exercise.',
  },
  {
    field: 'status.phase',
    explanation:
      'The grader expects Running because the exercise is not complete until the workload is actually healthy.',
  },
  {
    field: 'metadata.name',
    explanation:
      'This identifies the exact object the grader reads. In this first scenario, that target is demo-pod.',
  },
]

const officialDocs = [
  {
    label: 'Pods',
    href: 'https://kubernetes.io/docs/concepts/workloads/pods/',
  },
  {
    label: 'Kubernetes API overview',
    href: 'https://kubernetes.io/docs/reference/using-api/',
  },
  {
    label: 'Pod lifecycle',
    href: 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/',
  },
]

function App() {
  const activeScenario = scenarios[0]
  const [status, setStatus] = useState<WorkspaceStatus>('idle')
  const [feedbackTitle, setFeedbackTitle] = useState('Ready to learn')
  const [feedbackBody, setFeedbackBody] = useState(
    'Start the pod image exercise to inject a broken state and see which Kubernetes fields matter.',
  )
  const [revealedHints, setRevealedHints] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [guidedRepairApplied, setGuidedRepairApplied] = useState(false)
  const [selectedGlossary, setSelectedGlossary] = useState<GlossaryItem>(glossary[0])

  // This small state machine is intentionally pedagogical. It lets the first
  // GUI teach the inject -> inspect -> repair -> grade loop before the live
  // HTTP-backed simulator endpoints are added behind these same controls.
  const terminalLines = useMemo(() => {
    const lines = [
      'CKA Practice Simulator Web Terminal',
      '---------------------------------',
      'PS> kubectl config current-context',
    ]

    if (status === 'idle') {
      lines.push('No scenario injected yet.')
      lines.push('Tip: Start Scenario to create a broken Pod image exercise.')
      return lines
    }

    lines.push('kind-learning-cluster')
    lines.push('PS> kubectl get pod demo-pod')

    if (status === 'broken') {
      lines.push('demo-pod   0/1   Pending')
      lines.push('PS> kubectl describe pod demo-pod')
      lines.push('Image: nginx:no-such-tag')
    }

    if (status === 'in-progress') {
      lines.push('demo-pod   0/1   Pending')
      lines.push('Hint: investigate spec.containers[0].image and wait for Running.')
    }

    if (revealedHints > 0) {
      lines.push(`Hints unlocked: ${revealedHints}`)
    }

    if (solutionVisible) {
      lines.push('Suggested repair:')
      lines.push('kubectl set image pod/demo-pod app=nginx:1.25')
      lines.push('kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s')
    }

    if (guidedRepairApplied) {
      lines.push('PS> kubectl set image pod/demo-pod app=nginx:1.25')
      lines.push('pod/demo-pod image updated')
      lines.push('PS> kubectl get pod demo-pod')
      lines.push('demo-pod   1/1   Running')
    }

    if (status === 'passed') {
      lines.push('Grade result: PASS')
    }

    return lines
  }, [guidedRepairApplied, revealedHints, solutionVisible, status])

  const startScenario = () => {
    setStatus('broken')
    setFeedbackTitle('Scenario injected')
    setFeedbackBody(
      'The simulator has created a broken Pod image state. Your job is to inspect the Pod, correct the image, and verify that the Pod reaches Running.',
    )
    setGuidedRepairApplied(false)
    setSolutionVisible(false)
    setRevealedHints(0)
  }

  const checkMyFix = () => {
    if (status === 'idle') {
      setFeedbackTitle('No exercise running')
      setFeedbackBody('Start the scenario first so the grader has something to evaluate.')
      return
    }

    if (guidedRepairApplied) {
      setStatus('passed')
      setFeedbackTitle('Great work')
      setFeedbackBody(
        'The simulated grader sees the corrected image and a Running Pod. This is the same mental loop you will use on a live cluster.',
      )
      return
    }

    setStatus('in-progress')
    setFeedbackTitle('Not fixed yet')
    setFeedbackBody(
      'The Pod is still not Running. Focus on the image field and remember that success means both the right image and a healthy runtime state.',
    )
  }

  const showHint = () => {
    setRevealedHints((current) => Math.min(current + 1, hints.length))
    if (status === 'idle') {
      setStatus('broken')
    }
  }

  const revealSolution = () => {
    setSolutionVisible(true)
    setFeedbackTitle('Solution revealed')
    setFeedbackBody(
      'Use the solution as a study aid: note which command changed the image and why waiting for Running matters to the grader.',
    )
  }

  const applyGuidedRepair = () => {
    setGuidedRepairApplied(true)
    setFeedbackTitle('Repair simulated')
    setFeedbackBody(
      'The guided repair has updated the image and Pod health. Run Check My Fix next to see how the grader responds.',
    )
  }

  const resetScenario = () => {
    setStatus('idle')
    setFeedbackTitle('Ready to learn')
    setFeedbackBody(
      'The workspace is reset. Start again when you want a fresh attempt at the pod image exercise.',
    )
    setGuidedRepairApplied(false)
    setSolutionVisible(false)
    setRevealedHints(0)
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Purple Industries learning GUI</p>
          <h1>Learn Kubernetes by fixing real-looking scenarios</h1>
          <p className="hero-copy">
            This interface is designed for learning, not passive monitoring. You inject a broken
            state, inspect what matters, get guided hints, and then grade your fix.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={startScenario}
            title="Create a broken cluster state for this exercise."
          >
            Start Scenario
          </button>
          <a
            className="secondary-link"
            href={activeScenario.docsUrl}
            target="_blank"
            rel="noreferrer"
            title="Open the official Kubernetes documentation for this exercise."
          >
            View Official Docs
          </a>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel scenario-panel">
          <div className="panel-heading">
            <h2>Scenario catalog</h2>
            <span className={`status-chip status-chip-${status}`}>{status.replace('-', ' ')}</span>
          </div>
          <p className="section-copy">
            Start with a small, teachable exercise. Later scenarios will expand into scheduling,
            storage, and RBAC.
          </p>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <article
                key={scenario.id}
                className={`scenario-card${scenario.available ? ' scenario-card-active' : ''}`}
              >
                <div className="scenario-card-top">
                  <h3>{scenario.title}</h3>
                  <span className="difficulty-pill">{scenario.difficulty}</span>
                </div>
                <p className="scenario-description">{scenario.description}</p>
                <p className="scenario-goal">
                  <strong>Learning goal:</strong> {scenario.learningGoal}
                </p>
                <div className="scenario-actions">
                  <button
                    className="secondary-button"
                    disabled={!scenario.available}
                    onClick={startScenario}
                    title={scenario.tooltip}
                  >
                    {scenario.available ? 'Preview Learning Goals' : 'Coming Soon'}
                  </button>
                  <a href={scenario.docsUrl} target="_blank" rel="noreferrer">
                    Docs
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel workspace-panel">
          <div className="panel-heading">
            <h2>Exercise workspace</h2>
            <p className="panel-subtitle">Pod image repair</p>
          </div>

          <div className="control-row">
            <button
              className="primary-button"
              onClick={startScenario}
              title="Create a broken cluster state for this exercise."
            >
              Inject Scenario
            </button>
            <button
              className="secondary-button"
              onClick={checkMyFix}
              title="Grade the current cluster state against the exercise requirements."
            >
              Check My Fix
            </button>
            <button
              className="secondary-button"
              onClick={showHint}
              title="Reveal a small clue without giving away the answer."
            >
              Show Hint
            </button>
            <button
              className="secondary-button"
              onClick={revealSolution}
              title="Show the target repair steps and explain why they work."
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
              title="Delete or recreate the exercise resources so you can retry."
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
                <li>Grader checks the image field and Pod runtime state.</li>
                <li>Hints are progressive so you can learn without jumping straight to the answer.</li>
                <li>Solution text explains not just what to run, but why it works.</li>
              </ul>
            </article>

            <article className="hint-card">
              <h3>Progressive hints</h3>
              {revealedHints === 0 ? (
                <p>No hints revealed yet. Try to inspect the Pod first.</p>
              ) : (
                <ol>
                  {hints.slice(0, revealedHints).map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        </section>

        <aside className="panel learn-panel">
          <div className="panel-heading">
            <h2>Learn while you practice</h2>
            <p className="panel-subtitle">Buttons and tooltips exist to teach the API, not hide it.</p>
          </div>

          <section className="learn-section">
            <h3>What you are learning</h3>
            <p>
              This exercise teaches how a Pod can fail because of a bad image and why healthy
              runtime state matters to a grader built on the Kubernetes API.
            </p>
          </section>

          <section className="learn-section">
            <h3>Explain this</h3>
            <div className="glossary-grid">
              {glossary.map((item) => (
                <button
                  key={item.term}
                  className={`glossary-chip${selectedGlossary.term === item.term ? ' glossary-chip-selected' : ''}`}
                  onClick={() => setSelectedGlossary(item)}
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
              {fieldGuide.map((item) => (
                <li key={item.field}>
                  <span className="field-name" title="See which Kubernetes fields the grader is checking.">
                    {item.field}
                  </span>
                  <p>{item.explanation}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="learn-section">
            <h3>Official docs</h3>
            <ul className="docs-list">
              {officialDocs.map((doc) => (
                <li key={doc.href}>
                  <a href={doc.href} target="_blank" rel="noreferrer">
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
