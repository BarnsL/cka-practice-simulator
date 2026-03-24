import { buildCommandBreakdown, type CommandPart, type LearningGlossaryItem, type LearningValueEntry, type WorkspaceStatus } from '../data/missions'

type Metadata = {
  labels: Record<string, string>
  annotations: Record<string, string>
}

type NamespaceResource = Metadata & {
  name: string
}

type NodeResource = Metadata & {
  name: string
  ready: boolean
  taints: string[]
}

type PodResource = Metadata & {
  name: string
  namespace: string
  image: string
  status: 'Pending' | 'Running'
  nodeName: string
}

type DeploymentResource = Metadata & {
  name: string
  namespace: string
  image: string
  replicas: number
  availableReplicas: number
}

type ServiceResource = Metadata & {
  name: string
  namespace: string
  type: string
  port: number
  selector: Record<string, string>
}

type ConfigMapResource = Metadata & {
  name: string
  namespace: string
  data: Record<string, string>
}

type SecretResource = Metadata & {
  name: string
  namespace: string
  data: Record<string, string>
}

export type FreePlayState = {
  contextName: string
  currentNamespace: string
  transcript: string[]
  namespaces: NamespaceResource[]
  nodes: NodeResource[]
  pods: PodResource[]
  deployments: DeploymentResource[]
  services: ServiceResource[]
  configmaps: ConfigMapResource[]
  secrets: SecretResource[]
  events: string[]
}

export type FreePlayResult = {
  state: FreePlayState
  feedbackTitle?: string
  feedbackBody?: string
}

export type FreePlayReference = {
  quickCommands: string[]
  commands: Array<{ command: string; purpose: string; breakdown: CommandPart[] }>
  glossary: LearningGlossaryItem[]
  values: LearningValueEntry[]
}

function appendTranscript(state: FreePlayState, lines: string[]) {
  return {
    ...state,
    transcript: [...state.transcript, ...lines],
  }
}

function makeMetadata(): Metadata {
  return { labels: {}, annotations: {} }
}

function formatMap(data: Record<string, string>) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return ['{}']
  }

  return entries.map(([key, value]) => `${key}: ${value}`)
}

function parseNamespace(command: string, fallback: string) {
  const longMatch = command.match(/--namespace(?:=|\s+)([a-z0-9-]+)/i)
  if (longMatch) {
    return longMatch[1]
  }

  const shortMatch = command.match(/-n\s+([a-z0-9-]+)/i)
  return shortMatch?.[1] ?? fallback
}

function parseResourceAndName(command: string) {
  const tokens = command.trim().split(/\s+/)
  const getIndex = tokens.findIndex((token) =>
    ['get', 'describe', 'delete', 'label', 'annotate', 'taint'].includes(token.toLowerCase()),
  )
  if (getIndex === -1 || !tokens[getIndex + 1]) {
    return null
  }

  const resourceToken = tokens[getIndex + 1]
  const maybeNameToken = tokens[getIndex + 2]

  if (resourceToken.includes('/')) {
    const [resource, name] = resourceToken.split('/', 2)
    return { resource: resource.toLowerCase(), name }
  }

  if (!maybeNameToken || maybeNameToken.startsWith('-')) {
    return { resource: resourceToken.toLowerCase(), name: null }
  }

  return { resource: resourceToken.toLowerCase(), name: maybeNameToken }
}

function resourceAliases(resource: string) {
  switch (resource) {
    case 'po':
      return 'pod'
    case 'pods':
      return 'pod'
    case 'deploy':
      return 'deployment'
    case 'deployments':
      return 'deployment'
    case 'svc':
      return 'service'
    case 'services':
      return 'service'
    case 'ns':
      return 'namespace'
    case 'namespaces':
      return 'namespace'
    case 'cm':
      return 'configmap'
    case 'configmaps':
      return 'configmap'
    default:
      return resource.toLowerCase()
  }
}

// Free play is intentionally broad rather than infinitely complete. It gives a
// learner a mutable, stateful kubectl sandbox for common object-management
// verbs so command experimentation changes the simulated cluster in visible ways.
export function createFreePlayState(): FreePlayState {
  return {
    contextName: 'kind-free-play',
    currentNamespace: 'default',
    transcript: [
      'CKA Practice Simulator CLI',
      'Mode: Free Play',
      'Context: kind-free-play',
      'Namespace: default',
      "Tip: type 'help' to see the broad kubectl command set supported in free play.",
    ],
    namespaces: [
      { name: 'default', ...makeMetadata() },
      { name: 'kube-system', ...makeMetadata() },
      { name: 'dev', ...makeMetadata() },
    ],
    nodes: [
      { name: 'control-plane', ready: true, taints: ['node-role.kubernetes.io/control-plane:NoSchedule'], ...makeMetadata() },
      { name: 'worker-1', ready: true, taints: [], ...makeMetadata() },
    ],
    pods: [
      { name: 'hello-pod', namespace: 'default', image: 'nginx:1.25', status: 'Running', nodeName: 'worker-1', ...makeMetadata() },
    ],
    deployments: [
      { name: 'hello-web', namespace: 'default', image: 'nginx:1.25', replicas: 2, availableReplicas: 2, ...makeMetadata() },
    ],
    services: [
      { name: 'hello-web', namespace: 'default', type: 'ClusterIP', port: 80, selector: { app: 'hello-web' }, ...makeMetadata() },
    ],
    configmaps: [
      { name: 'app-settings', namespace: 'default', data: { MODE: 'demo' }, ...makeMetadata() },
    ],
    secrets: [
      { name: 'db-auth', namespace: 'default', data: { PASSWORD: 'c2VjcmV0' }, ...makeMetadata() },
    ],
    events: ['Normal Scheduled pod/hello-pod Successfully assigned default/hello-pod to worker-1'],
  }
}

function replaceResource<T extends { name: string; namespace?: string }>(
  items: T[],
  nextItem: T,
  namespaceAware = true,
) {
  return items.map((item) => {
    const sameNamespace = !namespaceAware || item.namespace === nextItem.namespace
    if (sameNamespace && item.name === nextItem.name) {
      return nextItem
    }

    return item
  })
}

function appendOrReplaceResource<T extends { name: string; namespace?: string }>(
  items: T[],
  nextItem: T,
  namespaceAware = true,
) {
  const exists = items.some((item) => {
    const sameNamespace = !namespaceAware || item.namespace === nextItem.namespace
    return sameNamespace && item.name === nextItem.name
  })

  return exists ? replaceResource(items, nextItem, namespaceAware) : [...items, nextItem]
}

function getNamespacedList<T extends { namespace: string }>(items: T[], namespace: string, allNamespaces: boolean) {
  return allNamespaces ? items : items.filter((item) => item.namespace === namespace)
}

function renderYaml(kind: string, name: string, namespace: string | null, fields: string[]) {
  return [
    'apiVersion: v1',
    `kind: ${kind}`,
    'metadata:',
    `  name: ${name}`,
    ...(namespace ? [`  namespace: ${namespace}`] : []),
    ...fields,
  ]
}

export function getFreePlayReference(): FreePlayReference {
  const commands = [
    ['kubectl get pods', 'List pods in the active namespace.'],
    ['kubectl get deployment hello-web -o yaml', 'Inspect a deployment in YAML form.'],
    ['kubectl create deployment demo-api --image=nginx:1.25', 'Create a deployment and add it to the simulated cluster state.'],
    ['kubectl expose deployment demo-api --type=ClusterIP --port=80', 'Create a service that reflects the simulated deployment.'],
    ['kubectl set image deployment/demo-api demo-api=nginx:1.26', 'Update a deployment image.'],
    ['kubectl scale deployment demo-api --replicas=3', 'Change the desired and available replica counts.'],
    ['kubectl run scratch --image=busybox:1.36', 'Create a one-off pod.'],
    ['kubectl delete pod scratch', 'Delete a simulated pod.'],
    ['kubectl label node worker-1 zone=lab --overwrite', 'Mutate node metadata in the free play cluster.'],
    ['kubectl annotate deployment hello-web app.kubernetes.io/managed-by=simulator', 'Attach an annotation to a resource.'],
    ['kubectl taint node worker-1 dedicated=lab:NoSchedule', 'Apply a node taint and reflect it in state.'],
    ['kubectl create namespace training', 'Add a new namespace to the simulated cluster.'],
    ['kubectl config set-context --current --namespace=dev', 'Change the active namespace for future commands.'],
    ['kubectl api-resources', 'Explore the kinds of Kubernetes resources available in the simulator.'],
    ['kubectl explain deployment', 'Read a compact schema explanation for a resource.'],
  ].map(([command, purpose]) => ({
    command,
    purpose,
    breakdown: buildCommandBreakdown(command),
  }))

  return {
    quickCommands: commands.slice(0, 8).map((entry) => entry.command),
    commands,
    glossary: [
      { term: 'API object', definition: 'A persistent record of intent stored through the Kubernetes API.' },
      { term: 'ObjectMeta', definition: 'The metadata section that carries names, labels, annotations, and identity fields.' },
      { term: 'Spec', definition: 'The desired state portion of most Kubernetes resources.' },
      { term: 'Status', definition: 'The observed state reported by the system for a resource.' },
      { term: 'Annotation', definition: 'Non-identifying metadata that tools or operators can attach to an object.' },
      { term: 'Taint', definition: 'A node marker that repels pods unless they explicitly tolerate it.' },
    ],
    values: [
      { value: 'ClusterIP', meaning: 'The default internal service type in Kubernetes.' },
      { value: 'NoSchedule', meaning: 'A taint effect that blocks new pod placement unless tolerated.' },
      { value: 'app.kubernetes.io/managed-by', meaning: 'A recommended application-management label or annotation family from the Kubernetes reference docs.' },
      { value: 'api-resources', meaning: 'A discovery command that shows which resource types the API server supports.' },
    ],
  }
}

function listOutput(state: FreePlayState, resource: string, allNamespaces: boolean, namespace: string) {
  switch (resourceAliases(resource)) {
    case 'namespace':
      return ['NAME', ...state.namespaces.map((item) => item.name)]
    case 'node':
      return ['NAME           STATUS', ...state.nodes.map((item) => `${item.name}   ${item.ready ? 'Ready' : 'NotReady'}`)]
    case 'pod': {
      const items = getNamespacedList(state.pods, namespace, allNamespaces)
      const header = allNamespaces ? 'NAMESPACE   NAME         STATUS    NODE' : 'NAME         STATUS    NODE'
      return [header, ...items.map((item) => (allNamespaces ? `${item.namespace}   ${item.name}   ${item.status}   ${item.nodeName}` : `${item.name}   ${item.status}   ${item.nodeName}`))]
    }
    case 'deployment': {
      const items = getNamespacedList(state.deployments, namespace, allNamespaces)
      const header = allNamespaces ? 'NAMESPACE   NAME        READY' : 'NAME        READY'
      return [header, ...items.map((item) => (allNamespaces ? `${item.namespace}   ${item.name}   ${item.availableReplicas}/${item.replicas}` : `${item.name}   ${item.availableReplicas}/${item.replicas}`))]
    }
    case 'service': {
      const items = getNamespacedList(state.services, namespace, allNamespaces)
      const header = allNamespaces ? 'NAMESPACE   NAME        TYPE        PORT' : 'NAME        TYPE        PORT'
      return [header, ...items.map((item) => (allNamespaces ? `${item.namespace}   ${item.name}   ${item.type}   ${item.port}` : `${item.name}   ${item.type}   ${item.port}`))]
    }
    case 'configmap': {
      const items = getNamespacedList(state.configmaps, namespace, allNamespaces)
      return ['NAME', ...items.map((item) => item.name)]
    }
    case 'secret': {
      const items = getNamespacedList(state.secrets, namespace, allNamespaces)
      return ['NAME', ...items.map((item) => item.name)]
    }
    case 'event':
      return ['EVENTS', ...state.events]
    default:
      return ['Unsupported free play resource for get. Try pods, deployments, services, nodes, namespaces, configmaps, secrets, or events.']
  }
}

export function runFreePlayCommand(state: FreePlayState, rawCommand: string): FreePlayResult {
  const command = rawCommand.trim()
  if (!command) {
    return { state }
  }

  const namespace = parseNamespace(command, state.currentNamespace)
  const allNamespaces = /\s(-A|--all-namespaces)\b/.test(` ${command}`)
  const withPrompt = (lines: string[]) => appendTranscript(state, [`student@cka-sim:~$ ${command}`, ...lines])

  if (command === 'help' || command === 'kubectl help') {
    return {
      state: withPrompt([
        'Free play supports broad kubectl actions for common resources.',
        'Examples: get, describe, create, delete, run, expose, set image, scale, label, annotate, taint, api-resources, explain, cluster-info.',
      ]),
    }
  }

  if (command === 'clear' || command === 'cls') {
    return { state: createFreePlayState() }
  }

  if (command === 'kubectl config current-context') {
    return { state: withPrompt([state.contextName]) }
  }

  const setNamespaceMatch = command.match(/kubectl config set-context --current --namespace=([a-z0-9-]+)/i)
  if (setNamespaceMatch) {
    const nextNamespace = setNamespaceMatch[1]
    return {
      state: {
        ...withPrompt([`Context "${state.contextName}" modified.`]),
        currentNamespace: nextNamespace,
      },
      feedbackTitle: 'Namespace switched',
      feedbackBody: `The free play shell now targets namespace ${nextNamespace}.`,
    }
  }

  if (command === 'kubectl api-resources') {
    return {
      state: withPrompt([
        'NAME          SHORTNAMES   APIVERSION        NAMESPACED',
        'pods          po           v1                true',
        'services      svc          v1                true',
        'deployments   deploy       apps/v1           true',
        'configmaps    cm           v1                true',
        'secrets                    v1                true',
        'nodes                      v1                false',
        'namespaces    ns           v1                false',
      ]),
    }
  }

  const explainMatch = command.match(/^kubectl explain\s+(.+)$/i)
  if (explainMatch) {
    const subject = explainMatch[1].toLowerCase()
    const lines =
      subject === 'deployment'
        ? ['KIND: Deployment', 'FIELDS: spec, status, metadata', 'Deployment manages ReplicaSets and declarative rollouts.']
        : subject.includes('deployment.spec.template.spec.containers')
          ? ['FIELD: spec.template.spec.containers', 'Container array embedded inside the Pod template for a Deployment.']
          : subject === 'pod'
            ? ['KIND: Pod', 'FIELDS: spec, status, metadata', 'Pod is the smallest deployable compute unit in Kubernetes.']
            : ['Free play explain currently models pod and deployment schema explanations.']

    return { state: withPrompt(lines) }
  }

  if (command === 'kubectl cluster-info') {
    return {
      state: withPrompt([
        `Kubernetes control plane is running at https://127.0.0.1:6443`,
        `CoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy`,
      ]),
    }
  }

  const parsed = parseResourceAndName(command)
  if (!parsed && !/^kubectl (create|run|set|scale|expose)/i.test(command)) {
    return {
      state: withPrompt(['Unsupported free play command. Use help to see the broad supported kubectl verbs.']),
      feedbackTitle: 'Command not modeled yet',
      feedbackBody: 'Free play supports a broad stateful subset of kubectl, but not every edge-case command shape yet.',
    }
  }

  if (/^kubectl get /i.test(command) && parsed) {
    if (command.includes(' -o yaml') && parsed.name) {
      const resource = resourceAliases(parsed.resource)
      switch (resource) {
        case 'pod': {
          const pod = state.pods.find((item) => item.name === parsed.name && item.namespace === namespace)
          if (!pod) return { state: withPrompt([`Error from server (NotFound): pods "${parsed.name}" not found`]) }
          return { state: withPrompt(renderYaml('Pod', pod.name, pod.namespace, ['spec:', `  containers:`, `  - name: ${pod.name}`, `    image: ${pod.image}`, 'status:', `  phase: ${pod.status}`])) }
        }
        case 'deployment': {
          const deployment = state.deployments.find((item) => item.name === parsed.name && item.namespace === namespace)
          if (!deployment) return { state: withPrompt([`Error from server (NotFound): deployments.apps "${parsed.name}" not found`]) }
          return { state: withPrompt(renderYaml('Deployment', deployment.name, deployment.namespace, ['spec:', `  replicas: ${deployment.replicas}`, '  template:', '    spec:', '      containers:', `      - image: ${deployment.image}`, 'status:', `  availableReplicas: ${deployment.availableReplicas}`])) }
        }
        case 'service': {
          const service = state.services.find((item) => item.name === parsed.name && item.namespace === namespace)
          if (!service) return { state: withPrompt([`Error from server (NotFound): services "${parsed.name}" not found`]) }
          return { state: withPrompt(renderYaml('Service', service.name, service.namespace, ['spec:', `  type: ${service.type}`, `  ports:`, `  - port: ${service.port}`, '  selector:', ...Object.entries(service.selector).map(([key, value]) => `    ${key}: ${value}`)])) }
        }
      }
    }

    return { state: withPrompt(listOutput(state, parsed.resource, allNamespaces, namespace)) }
  }

  if (/^kubectl describe /i.test(command) && parsed) {
    const resource = resourceAliases(parsed.resource)
    switch (resource) {
      case 'pod': {
        const pod = state.pods.find((item) => item.name === parsed.name && item.namespace === namespace)
        return {
          state: withPrompt(
            pod
              ? [`Name: ${pod.name}`, `Namespace: ${pod.namespace}`, `Image: ${pod.image}`, `Node: ${pod.nodeName}`, `Status: ${pod.status}`, 'Labels:', ...formatMap(pod.labels), 'Annotations:', ...formatMap(pod.annotations)]
              : [`Error from server (NotFound): pods "${parsed.name}" not found`],
          ),
        }
      }
      case 'deployment': {
        const deployment = state.deployments.find((item) => item.name === parsed.name && item.namespace === namespace)
        return {
          state: withPrompt(
            deployment
              ? [`Name: ${deployment.name}`, `Namespace: ${deployment.namespace}`, `Image: ${deployment.image}`, `Replicas: ${deployment.availableReplicas}/${deployment.replicas}`, 'Annotations:', ...formatMap(deployment.annotations)]
              : [`Error from server (NotFound): deployments.apps "${parsed.name}" not found`],
          ),
        }
      }
      case 'service': {
        const service = state.services.find((item) => item.name === parsed.name && item.namespace === namespace)
        return {
          state: withPrompt(
            service
              ? [`Name: ${service.name}`, `Type: ${service.type}`, `Port: ${service.port}`, 'Selector:', ...formatMap(service.selector), 'Annotations:', ...formatMap(service.annotations)]
              : [`Error from server (NotFound): services "${parsed.name}" not found`],
          ),
        }
      }
      case 'node': {
        const node = state.nodes.find((item) => item.name === parsed.name)
        return {
          state: withPrompt(
            node
              ? [`Name: ${node.name}`, `Status: ${node.ready ? 'Ready' : 'NotReady'}`, `Taints: ${node.taints.join(', ') || '<none>'}`, 'Labels:', ...formatMap(node.labels)]
              : [`Error from server (NotFound): nodes "${parsed.name}" not found`],
          ),
        }
      }
    }
  }

  const createNamespaceMatch = command.match(/^kubectl create namespace ([a-z0-9-]+)$/i)
  if (createNamespaceMatch) {
    const name = createNamespaceMatch[1]
    return {
      state: {
        ...withPrompt([`namespace/${name} created`]),
        namespaces: appendOrReplaceResource(state.namespaces, { name, ...makeMetadata() }, false),
      },
      feedbackTitle: 'Namespace created',
      feedbackBody: `The simulated cluster now includes namespace ${name}.`,
    }
  }

  const createDeploymentMatch = command.match(/^kubectl create deployment ([a-z0-9-]+) --image=([^\s]+)$/i)
  if (createDeploymentMatch) {
    const [, name, image] = createDeploymentMatch
    const deployment: DeploymentResource = {
      name,
      namespace,
      image,
      replicas: 1,
      availableReplicas: 1,
      labels: { app: name },
      annotations: {},
    }
    return {
      state: {
        ...withPrompt([`deployment.apps/${name} created`]),
        deployments: appendOrReplaceResource(state.deployments, deployment),
      },
      feedbackTitle: 'Deployment created',
      feedbackBody: `Free play created deployment ${name} in namespace ${namespace}.`,
    }
  }

  const runPodMatch = command.match(/^kubectl run ([a-z0-9-]+) --image=([^\s]+)$/i)
  if (runPodMatch) {
    const [, name, image] = runPodMatch
    const pod: PodResource = {
      name,
      namespace,
      image,
      status: 'Running',
      nodeName: 'worker-1',
      labels: { run: name },
      annotations: {},
    }
    return {
      state: {
        ...withPrompt([`pod/${name} created`]),
        pods: appendOrReplaceResource(state.pods, pod),
      },
      feedbackTitle: 'Pod created',
      feedbackBody: `Free play created pod ${name} in namespace ${namespace}.`,
    }
  }

  const exposeMatch = command.match(/^kubectl expose deployment ([a-z0-9-]+) --type=([A-Za-z]+) --port=(\d+)$/i)
  if (exposeMatch) {
    const [, name, type, port] = exposeMatch
    const service: ServiceResource = {
      name,
      namespace,
      type,
      port: Number(port),
      selector: { app: name },
      labels: {},
      annotations: {},
    }
    return {
      state: {
        ...withPrompt([`service/${name} exposed`]),
        services: appendOrReplaceResource(state.services, service),
      },
      feedbackTitle: 'Service created',
      feedbackBody: `Free play exposed deployment ${name} as a ${type} service.`,
    }
  }

  const setImageMatch = command.match(/^kubectl set image deployment\/([a-z0-9-]+)\s+[a-z0-9-]+=([^\s]+)$/i)
  if (setImageMatch) {
    const [, name, image] = setImageMatch
    const deployment = state.deployments.find((item) => item.name === name && item.namespace === namespace)
    if (!deployment) {
      return { state: withPrompt([`Error from server (NotFound): deployments.apps "${name}" not found`]) }
    }

    const next = { ...deployment, image }
    return {
      state: {
        ...withPrompt([`deployment.apps/${name} image updated`]),
        deployments: replaceResource(state.deployments, next),
      },
      feedbackTitle: 'Image updated',
      feedbackBody: `Deployment ${name} now uses image ${image}.`,
    }
  }

  const scaleMatch = command.match(/^kubectl scale deployment(?:\/|\s+)([a-z0-9-]+) --replicas=(\d+)$/i)
  if (scaleMatch) {
    const [, name, replicas] = scaleMatch
    const deployment = state.deployments.find((item) => item.name === name && item.namespace === namespace)
    if (!deployment) {
      return { state: withPrompt([`Error from server (NotFound): deployments.apps "${name}" not found`]) }
    }

    const nextReplicas = Number(replicas)
    const next = { ...deployment, replicas: nextReplicas, availableReplicas: nextReplicas }
    return {
      state: {
        ...withPrompt([`deployment.apps/${name} scaled`]),
        deployments: replaceResource(state.deployments, next),
      },
      feedbackTitle: 'Deployment scaled',
      feedbackBody: `Deployment ${name} now targets ${nextReplicas} replicas.`,
    }
  }

  const createConfigMapMatch = command.match(/^kubectl create configmap ([a-z0-9-]+) --from-literal=([^=]+)=([^\s]+)$/i)
  if (createConfigMapMatch) {
    const [, name, key, value] = createConfigMapMatch
    const configmap: ConfigMapResource = { name, namespace, data: { [key]: value }, ...makeMetadata() }
    return {
      state: {
        ...withPrompt([`configmap/${name} created`]),
        configmaps: appendOrReplaceResource(state.configmaps, configmap),
      },
      feedbackTitle: 'ConfigMap created',
      feedbackBody: `ConfigMap ${name} now stores literal key ${key}.`,
    }
  }

  const createSecretMatch = command.match(/^kubectl create secret generic ([a-z0-9-]+) --from-literal=([^=]+)=([^\s]+)$/i)
  if (createSecretMatch) {
    const [, name, key, value] = createSecretMatch
    const secret: SecretResource = { name, namespace, data: { [key]: value }, ...makeMetadata() }
    return {
      state: {
        ...withPrompt([`secret/${name} created`]),
        secrets: appendOrReplaceResource(state.secrets, secret),
      },
      feedbackTitle: 'Secret created',
      feedbackBody: `Secret ${name} now stores literal key ${key}.`,
    }
  }

  const deleteMatch = command.match(/^kubectl delete ([a-z]+)(?:\/|\s+)([a-z0-9-]+)$/i)
  if (deleteMatch) {
    const [, resourceToken, name] = deleteMatch
    const resource = resourceAliases(resourceToken)
    switch (resource) {
      case 'pod':
        return { state: { ...withPrompt([`pod "${name}" deleted`]), pods: state.pods.filter((item) => !(item.name === name && item.namespace === namespace)) } }
      case 'deployment':
        return { state: { ...withPrompt([`deployment.apps "${name}" deleted`]), deployments: state.deployments.filter((item) => !(item.name === name && item.namespace === namespace)) } }
      case 'service':
        return { state: { ...withPrompt([`service "${name}" deleted`]), services: state.services.filter((item) => !(item.name === name && item.namespace === namespace)) } }
      case 'namespace':
        return { state: { ...withPrompt([`namespace "${name}" deleted`]), namespaces: state.namespaces.filter((item) => item.name !== name) } }
    }
  }

  const labelMatch = command.match(/^kubectl label (node|pod|deployment)(?:\/|\s+)([a-z0-9-]+)\s+([A-Za-z0-9./-]+)=([A-Za-z0-9._:-]+)(?:\s+--overwrite)?$/i)
  if (labelMatch) {
    const [, resource, name, key, value] = labelMatch
    if (resource === 'node') {
      const node = state.nodes.find((item) => item.name === name)
      if (!node) return { state: withPrompt([`Error from server (NotFound): nodes "${name}" not found`]) }
      const next = { ...node, labels: { ...node.labels, [key]: value } }
      return { state: { ...withPrompt([`node/${name} labeled`]), nodes: replaceResource(state.nodes, next, false) } }
    }

    if (resource === 'pod') {
      const pod = state.pods.find((item) => item.name === name && item.namespace === namespace)
      if (!pod) return { state: withPrompt([`Error from server (NotFound): pods "${name}" not found`]) }
      const next = { ...pod, labels: { ...pod.labels, [key]: value } }
      return { state: { ...withPrompt([`pod/${name} labeled`]), pods: replaceResource(state.pods, next) } }
    }

    const deployment = state.deployments.find((item) => item.name === name && item.namespace === namespace)
    if (!deployment) return { state: withPrompt([`Error from server (NotFound): deployments.apps "${name}" not found`]) }
    const next = { ...deployment, labels: { ...deployment.labels, [key]: value } }
    return { state: { ...withPrompt([`deployment.apps/${name} labeled`]), deployments: replaceResource(state.deployments, next) } }
  }

  const annotateMatch = command.match(/^kubectl annotate (pod|deployment|service)(?:\/|\s+)([a-z0-9-]+)\s+([A-Za-z0-9./-]+)=([^\s]+)$/i)
  if (annotateMatch) {
    const [, resource, name, key, value] = annotateMatch
    if (resource === 'pod') {
      const pod = state.pods.find((item) => item.name === name && item.namespace === namespace)
      if (!pod) return { state: withPrompt([`Error from server (NotFound): pods "${name}" not found`]) }
      const next = { ...pod, annotations: { ...pod.annotations, [key]: value } }
      return { state: { ...withPrompt([`pod/${name} annotated`]), pods: replaceResource(state.pods, next) } }
    }

    if (resource === 'service') {
      const service = state.services.find((item) => item.name === name && item.namespace === namespace)
      if (!service) return { state: withPrompt([`Error from server (NotFound): services "${name}" not found`]) }
      const next = { ...service, annotations: { ...service.annotations, [key]: value } }
      return { state: { ...withPrompt([`service/${name} annotated`]), services: replaceResource(state.services, next) } }
    }

    const deployment = state.deployments.find((item) => item.name === name && item.namespace === namespace)
    if (!deployment) return { state: withPrompt([`Error from server (NotFound): deployments.apps "${name}" not found`]) }
    const next = { ...deployment, annotations: { ...deployment.annotations, [key]: value } }
    return { state: { ...withPrompt([`deployment.apps/${name} annotated`]), deployments: replaceResource(state.deployments, next) } }
  }

  const taintAddMatch = command.match(/^kubectl taint node ([a-z0-9-]+) ([A-Za-z0-9./-]+=[A-Za-z0-9._:-]+:[A-Za-z]+)$/i)
  if (taintAddMatch) {
    const [, name, taint] = taintAddMatch
    const node = state.nodes.find((item) => item.name === name)
    if (!node) return { state: withPrompt([`Error from server (NotFound): nodes "${name}" not found`]) }
    const next = { ...node, taints: [...node.taints.filter((item) => item !== taint), taint] }
    return { state: { ...withPrompt([`node/${name} tainted`]), nodes: replaceResource(state.nodes, next, false) } }
  }

  return {
    state: withPrompt(['Unsupported free play command shape. Use help to see the broad stateful kubectl subset available here.']),
    feedbackTitle: 'Command not modeled yet',
    feedbackBody: 'Free play now reflects many common kubectl actions in cluster state, but it is still a simulator rather than a full Kubernetes emulator.',
  }
}

export function getFreePlayStatus(state: FreePlayState): WorkspaceStatus {
  const hasUserActions = state.transcript.length > 5
  return hasUserActions ? 'in-progress' : 'idle'
}
