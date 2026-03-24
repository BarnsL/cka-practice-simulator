import { type LearningCommandEntry, type Mission } from '../data/missions'
import { type FreePlayState } from '../lib/freePlay'

type WorkspaceMode = 'mission' | 'free-play'
type DashboardSectionKey = 'overview' | 'workloads' | 'services' | 'config' | 'cluster'

type DashboardFocus = {
  key: DashboardSectionKey
  label: string
  detail: string
  explanation: string
}

type LearningDashboardProps = {
  mode: WorkspaceMode
  mission: Mission
  commands: LearningCommandEntry[]
  freePlayState: FreePlayState
  latestCommand: string | null
  progressLabel: string
  workspaceStatusLabel: string
}

function getFocusFromCommand(command: string | null): DashboardFocus {
  const normalized = command?.trim().toLowerCase() ?? ''

  if (!normalized) {
    return {
      key: 'overview',
      label: 'Overview',
      detail: 'Cluster summary',
      explanation: 'Start in the overview so the learner sees which area of the cluster is worth inspecting first.',
    }
  }

  if (
    /(deployment|deploy|pod|daemonset|statefulset|job|cronjob|replicaset)/.test(normalized)
  ) {
    return {
      key: 'workloads',
      label: 'Workloads',
      detail: 'Pods and controllers',
      explanation: 'This command points at workload health or rollout state, so the visual dashboard should emphasize pods and workload controllers.',
    }
  }

  if (/(service|svc|ingress|endpointslice|networkpolicy)/.test(normalized)) {
    return {
      key: 'services',
      label: 'Services',
      detail: 'Connectivity surfaces',
      explanation: 'This command is about exposure or networking, so service and endpoint visuals deserve focus.',
    }
  }

  if (/(configmap|secret|pvc|pv|storageclass|volume)/.test(normalized)) {
    return {
      key: 'config',
      label: 'Config and storage',
      detail: 'Data and configuration',
      explanation: 'This command changes configuration or persistence, so the learner should look at config and storage objects next.',
    }
  }

  if (/(node|namespace|serviceaccount|role|binding|taint|api-resources|explain|context)/.test(normalized)) {
    return {
      key: 'cluster',
      label: 'Cluster',
      detail: 'Namespaces, nodes, and access',
      explanation: 'This command operates at cluster scope, so the visual layer should highlight namespaces, nodes, or access-control surfaces.',
    }
  }

  return {
    key: 'overview',
    label: 'Overview',
    detail: 'General state',
    explanation: 'The command is broad or ambiguous, so keep the learner anchored on the cluster overview first.',
  }
}

function getSectionForCommand(command: string): string {
  return getFocusFromCommand(command).label
}

function countMissionCommands(commands: LearningCommandEntry[], section: DashboardSectionKey) {
  return commands.filter((entry) => getFocusFromCommand(entry.command).key === section).length
}

// This component borrows the information architecture of Kubernetes Dashboard
// (overview, workloads, services, config, cluster) but keeps the interface
// intentionally lightweight and instructional so CLI practice remains primary.
function LearningDashboard({
  mode,
  mission,
  commands,
  freePlayState,
  latestCommand,
  progressLabel,
  workspaceStatusLabel,
}: LearningDashboardProps) {
  const currentFocus = getFocusFromCommand(latestCommand)
  const highlightedCommand = latestCommand ?? commands[0]?.command ?? 'kubectl get pods'

  const workloadCommands = commands.filter((entry) => getFocusFromCommand(entry.command).key === 'workloads')
  const serviceCommands = commands.filter((entry) => getFocusFromCommand(entry.command).key === 'services')
  const configCommands = commands.filter((entry) => getFocusFromCommand(entry.command).key === 'config')
  const clusterCommands = commands.filter((entry) => getFocusFromCommand(entry.command).key === 'cluster')

  return (
    <section className="learn-section">
      <h3>Mini dashboard</h3>
      <p>
        This learner view mirrors the real Kubernetes Dashboard layout at a very
        small scale: overview first, then workloads, services, config, and
        cluster surfaces.
      </p>

      <div className="dashboard-overview-grid">
        <article className="dashboard-card">
          <span className="dashboard-card-label">Mode</span>
          <strong>{mode === 'mission' ? 'Guided mission' : 'Free play sandbox'}</strong>
          <p>{workspaceStatusLabel}</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Progress</span>
          <strong>{progressLabel}</strong>
          <p>{mode === 'mission' ? mission.title : `${freePlayState.currentNamespace} namespace in focus`}</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Workloads</span>
          <strong>
            {mode === 'free-play'
              ? `${freePlayState.deployments.length} deployments / ${freePlayState.pods.length} pods`
              : `${countMissionCommands(commands, 'workloads')} mapped commands`}
          </strong>
          <p>Deployments, pods, and rollout health live here.</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Services</span>
          <strong>
            {mode === 'free-play'
              ? `${freePlayState.services.length} services`
              : `${countMissionCommands(commands, 'services')} mapped commands`}
          </strong>
          <p>Service exposure, ingress flow, and endpoints appear here.</p>
        </article>
      </div>

      <article className="dashboard-focus-card">
        <p className="tutorial-step-count">CLI to visual focus</p>
        <h4>
          {currentFocus.label}: {currentFocus.detail}
        </h4>
        <code>{highlightedCommand}</code>
        <p>{currentFocus.explanation}</p>
      </article>

      <div className="dashboard-section-grid">
        <article
          className={`dashboard-section-card${currentFocus.key === 'workloads' ? ' dashboard-section-card-focus' : ''}`}
        >
          <h4>Workloads</h4>
          {mode === 'free-play' ? (
            <ul className="dashboard-resource-list">
              {freePlayState.deployments.map((deployment) => (
                <li key={`deployment-${deployment.namespace}-${deployment.name}`}>
                  <strong>Deployment:</strong> {deployment.namespace}/{deployment.name} • {deployment.availableReplicas}/
                  {deployment.replicas} ready • {deployment.image}
                </li>
              ))}
              {freePlayState.pods.map((pod) => (
                <li key={`pod-${pod.namespace}-${pod.name}`}>
                  <strong>Pod:</strong> {pod.namespace}/{pod.name} • {pod.status} • {pod.nodeName}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="dashboard-resource-list">
              {workloadCommands.slice(0, 5).map((entry) => (
                <li key={entry.command}>
                  <code>{entry.command}</code>
                  <span>{entry.purpose}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article
          className={`dashboard-section-card${currentFocus.key === 'services' ? ' dashboard-section-card-focus' : ''}`}
        >
          <h4>Services</h4>
          {mode === 'free-play' ? (
            <ul className="dashboard-resource-list">
              {freePlayState.services.map((service) => (
                <li key={`service-${service.namespace}-${service.name}`}>
                  <strong>Service:</strong> {service.namespace}/{service.name} • {service.type} • port {service.port}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="dashboard-resource-list">
              {serviceCommands.slice(0, 5).map((entry) => (
                <li key={entry.command}>
                  <code>{entry.command}</code>
                  <span>{entry.purpose}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article
          className={`dashboard-section-card${currentFocus.key === 'config' ? ' dashboard-section-card-focus' : ''}`}
        >
          <h4>Config and storage</h4>
          {mode === 'free-play' ? (
            <ul className="dashboard-resource-list">
              {freePlayState.configmaps.map((configmap) => (
                <li key={`configmap-${configmap.namespace}-${configmap.name}`}>
                  <strong>ConfigMap:</strong> {configmap.namespace}/{configmap.name} • {Object.keys(configmap.data).length} key(s)
                </li>
              ))}
              {freePlayState.secrets.map((secret) => (
                <li key={`secret-${secret.namespace}-${secret.name}`}>
                  <strong>Secret:</strong> {secret.namespace}/{secret.name} • {Object.keys(secret.data).length} key(s)
                </li>
              ))}
            </ul>
          ) : (
            <ul className="dashboard-resource-list">
              {configCommands.slice(0, 5).map((entry) => (
                <li key={entry.command}>
                  <code>{entry.command}</code>
                  <span>{entry.purpose}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article
          className={`dashboard-section-card${currentFocus.key === 'cluster' ? ' dashboard-section-card-focus' : ''}`}
        >
          <h4>Cluster</h4>
          {mode === 'free-play' ? (
            <ul className="dashboard-resource-list">
              <li>
                <strong>Context:</strong> {freePlayState.contextName}
              </li>
              {freePlayState.namespaces.map((namespace) => (
                <li key={`namespace-${namespace.name}`}>
                  <strong>Namespace:</strong> {namespace.name}
                </li>
              ))}
              {freePlayState.nodes.map((node) => (
                <li key={`node-${node.name}`}>
                  <strong>Node:</strong> {node.name} • {node.ready ? 'Ready' : 'NotReady'} • taints {node.taints.length}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="dashboard-resource-list">
              {clusterCommands.slice(0, 5).map((entry) => (
                <li key={entry.command}>
                  <code>{entry.command}</code>
                  <span>{entry.purpose}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <section className="dashboard-command-map">
        <h4>How CLI commands map to visuals</h4>
        <ul className="dashboard-resource-list">
          {commands.slice(0, 6).map((entry) => (
            <li key={entry.command}>
              <code>{entry.command}</code>
              <span>
                {getSectionForCommand(entry.command)} to {entry.purpose}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

export default LearningDashboard
