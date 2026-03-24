export type WorkspaceStatus = 'idle' | 'broken' | 'in-progress' | 'passed'

export type LearningGlossaryItem = {
  term: string
  definition: string
}

export type LearningFieldGuide = {
  field: string
  explanation: string
}

export type LearningCommandEntry = {
  command: string
  purpose: string
}

export type LearningValueEntry = {
  value: string
  meaning: string
}

export type TutorialStep = {
  title: string
  body: string
}

export type SimulatedInspector = {
  aliases: string[]
  purpose: string
  outputs: {
    broken: string[]
    partial?: string[]
    fixed: string[]
  }
}

export type SimulatedAction = {
  id: string
  label: string
  aliases: string[]
  purpose: string
  output: string[]
  alreadyAppliedMessage: string
}

export type Mission = {
  id: string
  title: string
  difficulty: string
  learningGoal: string
  description: string
  docsUrl: string
  tooltip: string
  whyItMatters: string
  commonMistakes: string[]
  quickGuide: string[]
  hints: string[]
  solutionCommands: string[]
  commands: LearningCommandEntry[]
  values: LearningValueEntry[]
  glossary: LearningGlossaryItem[]
  fieldGuide: LearningFieldGuide[]
  tutorial: TutorialStep[]
  feedback: {
    startTitle: string
    startBody: string
    failTitle: string
    failBody: string
    repairTitle: string
    repairBody: string
    passTitle: string
    passBody: string
  }
  cli: {
    contextName: string
    namespace: string
    prompt: string
    bannerLines: string[]
    startLines: string[]
    inspectors: SimulatedInspector[]
    actions: SimulatedAction[]
    successCriteria: string[]
  }
}

function outputs(broken: string[], fixed: string[], partial?: string[]) {
  return { broken, partial, fixed }
}

function inspector(
  aliases: string[],
  purpose: string,
  broken: string[],
  fixed: string[],
  partial?: string[],
): SimulatedInspector {
  return {
    aliases,
    purpose,
    outputs: outputs(broken, fixed, partial),
  }
}

function action(
  id: string,
  label: string,
  aliases: string[],
  purpose: string,
  outputLines: string[],
): SimulatedAction {
  return {
    id,
    label,
    aliases,
    purpose,
    output: outputLines,
    alreadyAppliedMessage: `${label} already looks applied in this simulated mission.`,
  }
}

function tutorial(inspectBody: string, repairBody: string, verifyBody: string): TutorialStep[] {
  return [
    {
      title: 'Inspect the broken state first',
      body: inspectBody,
    },
    {
      title: 'Apply the repair deliberately',
      body: repairBody,
    },
    {
      title: 'Verify like an operator',
      body: verifyBody,
    },
  ]
}

function mission(definition: Omit<Mission, 'solutionCommands'> & { solutionCommands?: string[] }): Mission {
  return {
    ...definition,
    solutionCommands:
      definition.solutionCommands ?? definition.cli.actions.map((item) => item.aliases[0]),
  }
}

// These missions are intentionally simulated. The goal is to let a learner
// practice kubectl investigation and repair loops in a stable, annotated
// environment before every mission is backed by live backend endpoints.
export const missions: Mission[] = [
  mission({
    id: 'pod-image',
    title: 'Pod image repair',
    difficulty: 'Beginner',
    learningGoal: 'Identify a bad image value and recover a Pod to Running.',
    description: 'Repair a Pod that is stuck because the container image tag is invalid.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/pods/',
    tooltip: 'Practice the classic inspect -> set image -> verify loop.',
    whyItMatters:
      'Image typos are one of the fastest ways to break a workload, and they teach the habit of checking both spec and runtime state.',
    commonMistakes: [
      'Fixing the image tag but never verifying that the Pod reaches Running.',
      'Looking only at `get` output and skipping `describe` for the real clue.',
      'Changing the wrong object when the mission is scoped to a single Pod.',
    ],
    quickGuide: [
      'Inspect the Pod summary and event clue.',
      'Correct the image field with kubectl.',
      'Wait for the Pod to become healthy before grading.',
    ],
    hints: [
      'Start with `kubectl get pod demo-pod -o wide`.',
      'The key clue is in `spec.containers[0].image`.',
      'Success means both the right image and a Running Pod.',
    ],
    commands: [
      { command: 'kubectl get pod demo-pod -o wide', purpose: 'Inspect basic Pod health and placement.' },
      { command: 'kubectl describe pod demo-pod', purpose: 'See the broken image clue in the simulated events.' },
      { command: 'kubectl set image pod/demo-pod app=nginx:1.25', purpose: 'Repair the image reference.' },
      { command: 'kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s', purpose: 'Verify runtime health after the repair.' },
    ],
    values: [
      { value: 'nginx:no-such-tag', meaning: 'The intentionally broken image value.' },
      { value: 'nginx:1.25', meaning: 'The expected repaired image value.' },
      { value: 'Pending', meaning: 'The Pod has not recovered yet.' },
      { value: 'Running', meaning: 'The Pod is healthy enough for a pass.' },
    ],
    glossary: [
      { term: 'Pod', definition: 'The smallest deployable Kubernetes object that runs one or more containers.' },
      { term: 'ImagePullBackOff', definition: 'A backoff state that often follows an invalid image reference or pull failure.' },
      { term: 'spec.containers.image', definition: 'The field that tells Kubernetes which image to pull for a container.' },
    ],
    fieldGuide: [
      { field: 'spec.containers[0].image', explanation: 'The mission is intentionally broken at this exact field.' },
      { field: 'status.phase', explanation: 'The grader expects the Pod to reach Running, not just hold the right image string.' },
      { field: 'metadata.name', explanation: 'The target object is `demo-pod`, which keeps the mission focused on one workload.' },
    ],
    tutorial: tutorial(
      'Run `kubectl get pod demo-pod -o wide` and `kubectl describe pod demo-pod` to confirm the image problem before editing anything.',
      'Use `kubectl set image pod/demo-pod app=nginx:1.25` so the repair maps directly to the failing field.',
      'Wait for readiness, then grade the mission so you build the habit of verifying both config and runtime state.',
    ),
    feedback: {
      startTitle: 'Scenario injected',
      startBody: 'The Pod has a broken image. Investigate the workload and repair it through the simulated CLI.',
      failTitle: 'Not fixed yet',
      failBody: 'The grader still sees an unresolved image or runtime problem.',
      repairTitle: 'Repair applied',
      repairBody: 'The simulator recorded a valid repair step for this Pod.',
      passTitle: 'Great work',
      passBody: 'The grader sees the corrected image and a Running Pod.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'workloads',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Pod image repair'],
      startLines: ['Scenario injected for demo-pod.', 'Use kubectl to inspect why the Pod is unhealthy.'],
      inspectors: [
        inspector(
          ['kubectl get pod demo-pod -o wide', 'kubectl get pod demo-pod'],
          'Inspect the Pod summary.',
          ['NAME       READY   STATUS    NODE', 'demo-pod   0/1     Pending   worker-1'],
          ['NAME       READY   STATUS    NODE', 'demo-pod   1/1     Running   worker-1'],
        ),
        inspector(
          ['kubectl describe pod demo-pod'],
          'Inspect Pod events and image clues.',
          ['Name: demo-pod', 'Image: nginx:no-such-tag', 'Events: Failed to pull image "nginx:no-such-tag"'],
          ['Name: demo-pod', 'Image: nginx:1.25', 'Events: Pulled image successfully'],
        ),
        inspector(
          ['kubectl get pod demo-pod -o yaml'],
          'Inspect the Pod manifest.',
          ['spec:', '  containers:', '  - name: app', '    image: nginx:no-such-tag', 'status:', '  phase: Pending'],
          ['spec:', '  containers:', '  - name: app', '    image: nginx:1.25', 'status:', '  phase: Running'],
        ),
        inspector(
          ['kubectl get events --sort-by=.metadata.creationTimestamp'],
          'Inspect the recent events.',
          ['Warning Failed demo-pod Failed to pull image "nginx:no-such-tag"'],
          ['Normal Pulled demo-pod Successfully pulled image "nginx:1.25"'],
        ),
      ],
      actions: [
        action('set-image', 'Update the Pod image', ['kubectl set image pod/demo-pod app=nginx:1.25'], 'Repair the bad image tag.', ['pod/demo-pod image updated']),
        action('wait-ready', 'Wait for the Pod to become Ready', ['kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s'], 'Confirm the Pod becomes healthy.', ['pod/demo-pod condition met']),
      ],
      successCriteria: ['spec.containers[0].image is nginx:1.25', 'status.phase is Running'],
    },
  }),
  mission({
    id: 'node-scheduling',
    title: 'Node scheduling clinic',
    difficulty: 'Foundation',
    learningGoal: 'Diagnose why a Pod is Pending because node labels do not match its selector.',
    description: 'Fix a scheduling mismatch between node labels and the Pod selector.',
    docsUrl: 'https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/',
    tooltip: 'Use scheduling clues instead of image debugging.',
    whyItMatters:
      'Scheduling problems often look mysterious until you compare the Pod selector against real node labels.',
    commonMistakes: [
      'Changing the Pod without first reading the node labels.',
      'Confusing `nodeSelector` with `nodeName`.',
      'Ignoring the Pending reason and changing unrelated fields.',
    ],
    quickGuide: [
      'Read the Pod summary to confirm it is unscheduled.',
      'Inspect node labels.',
      'Label the matching node and verify placement.',
    ],
    hints: [
      'Run `kubectl get nodes --show-labels`.',
      'The Pod wants `lab-role=west`.',
      'Pending plus an unsatisfied selector usually means the scheduler has nowhere valid to place the Pod.',
    ],
    commands: [
      { command: 'kubectl get pod scheduler-lab -o wide', purpose: 'See that the Pod has not landed on a node.' },
      { command: 'kubectl get nodes --show-labels', purpose: 'Compare available labels against the Pod selector.' },
      { command: 'kubectl label node worker-2 lab-role=west --overwrite', purpose: 'Create the matching label for the selector.' },
      { command: 'kubectl wait --for=condition=Ready pod/scheduler-lab --timeout=90s', purpose: 'Verify the Pod lands and starts.' },
    ],
    values: [
      { value: 'lab-role=west', meaning: 'The label the Pod requires.' },
      { value: 'Pending', meaning: 'The Pod is waiting for a schedulable node.' },
      { value: 'worker-2', meaning: 'The node that needs the correct label in this mission.' },
    ],
    glossary: [
      { term: 'nodeSelector', definition: 'A simple key/value selector that constrains where a Pod may run.' },
      { term: 'Scheduler', definition: 'The control-plane component that chooses a node for a Pod.' },
      { term: 'Node label', definition: 'Metadata used by selectors, affinity, and scheduling policies.' },
    ],
    fieldGuide: [
      { field: 'spec.nodeSelector', explanation: 'The Pod demands a label that no node currently has.' },
      { field: 'metadata.labels', explanation: 'The fix is to add the correct label to the intended node.' },
      { field: 'spec.nodeName', explanation: 'This field should be set by scheduling, not by guessing blindly.' },
    ],
    tutorial: tutorial(
      'Use `kubectl get pod scheduler-lab -o wide` to confirm the Pod has no node assignment yet.',
      'Inspect node labels and apply `lab-role=west` to `worker-2` so the selector can match.',
      'Wait for readiness and then grade the mission so you verify the Pod was actually scheduled.',
    ),
    feedback: {
      startTitle: 'Scheduling lab active',
      startBody: 'The Pod is Pending because the scheduler cannot satisfy its placement rule.',
      failTitle: 'Selector still unsatisfied',
      failBody: 'The scheduler still cannot place the Pod on a valid node.',
      repairTitle: 'Placement repair recorded',
      repairBody: 'The simulator saw a scheduling-related change.',
      passTitle: 'Scheduler satisfied',
      passBody: 'The Pod now has a matching node label and reaches Running.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'scheduling',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Node scheduling clinic'],
      startLines: ['Scenario injected for scheduler-lab.', 'Inspect the selector mismatch before making a change.'],
      inspectors: [
        inspector(
          ['kubectl get pod scheduler-lab -o wide', 'kubectl get pod scheduler-lab'],
          'Inspect the Pod placement state.',
          ['NAME            READY   STATUS    NODE', 'scheduler-lab   0/1     Pending   <none>'],
          ['NAME            READY   STATUS    NODE', 'scheduler-lab   1/1     Running   worker-2'],
        ),
        inspector(
          ['kubectl describe pod scheduler-lab'],
          'Inspect scheduler reasoning.',
          ['Name: scheduler-lab', 'Node-Selectors: lab-role=west', 'Events: 0/2 nodes are available: 2 node(s) did not match node selector.'],
          ['Name: scheduler-lab', 'Node-Selectors: lab-role=west', 'Node: worker-2', 'Events: Successfully assigned scheduling/scheduler-lab to worker-2'],
        ),
        inspector(
          ['kubectl get nodes --show-labels'],
          'Inspect labels on all nodes.',
          ['worker-1   labels=lab-role=east', 'worker-2   labels=lab-role=central'],
          ['worker-1   labels=lab-role=east', 'worker-2   labels=lab-role=west'],
        ),
        inspector(
          ['kubectl get pod scheduler-lab -o yaml'],
          'Inspect the selector field.',
          ['spec:', '  nodeSelector:', '    lab-role: west', 'status:', '  phase: Pending'],
          ['spec:', '  nodeSelector:', '    lab-role: west', 'status:', '  phase: Running'],
        ),
      ],
      actions: [
        action('label-node', 'Add the required node label', ['kubectl label node worker-2 lab-role=west --overwrite'], 'Make a node satisfy the selector.', ['node/worker-2 labeled']),
        action('wait-ready', 'Wait for the Pod to schedule and start', ['kubectl wait --for=condition=Ready pod/scheduler-lab --timeout=90s'], 'Verify the scheduler can now place the Pod.', ['pod/scheduler-lab condition met']),
      ],
      successCriteria: ['worker-2 has label lab-role=west', 'scheduler-lab is Running on worker-2'],
    },
  }),
  mission({
    id: 'pvc-binding',
    title: 'Persistent volume binding workshop',
    difficulty: 'Foundation',
    learningGoal: 'Repair a PVC that cannot bind because the storage class is wrong.',
    description: 'Fix a Pending claim by aligning it with the expected storage class.',
    docsUrl: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/',
    tooltip: 'Practice storage troubleshooting with PVC and PV clues.',
    whyItMatters:
      'Storage issues often surface as Pending claims, and the fix usually lives in a specific field rather than a general cluster problem.',
    commonMistakes: [
      'Checking the Pod before checking the PVC state.',
      'Forgetting that storage class names must match exactly.',
      'Assuming Bound without verifying the PVC status field.',
    ],
    quickGuide: [
      'Inspect the PVC status.',
      'Read the requested storage class.',
      'Patch the claim and confirm it becomes Bound.',
    ],
    hints: [
      'Use `kubectl get pvc reports-data` first.',
      'The broken field is `spec.storageClassName`.',
      'A Bound claim is the success signal for this lab.',
    ],
    commands: [
      { command: 'kubectl get pvc reports-data', purpose: 'Inspect whether the claim is Bound or Pending.' },
      { command: 'kubectl describe pvc reports-data', purpose: 'Read the storage class mismatch and binding clues.' },
      { command: 'kubectl patch pvc reports-data -p {"spec":{"storageClassName":"fast"}}', purpose: 'Repair the storage class reference.' },
      { command: 'kubectl get pvc reports-data -o yaml', purpose: 'Verify the claim spec and status after the patch.' },
    ],
    values: [
      { value: 'slow', meaning: 'The intentionally incorrect storage class in the broken scenario.' },
      { value: 'fast', meaning: 'The storage class the simulated PV expects.' },
      { value: 'Bound', meaning: 'The PVC has attached to a matching volume and passes the lab.' },
    ],
    glossary: [
      { term: 'PVC', definition: 'A PersistentVolumeClaim requests storage from the cluster.' },
      { term: 'PV', definition: 'A PersistentVolume represents storage that can satisfy a claim.' },
      { term: 'storageClassName', definition: 'The class used to match or provision persistent storage.' },
    ],
    fieldGuide: [
      { field: 'spec.storageClassName', explanation: 'The claim points at the wrong class when the mission starts.' },
      { field: 'status.phase', explanation: 'The goal is to move the claim from Pending to Bound.' },
      { field: 'spec.resources.requests.storage', explanation: 'Capacity is already correct here, so focus on the class name.' },
    ],
    tutorial: tutorial(
      'Start with `kubectl get pvc reports-data` and `kubectl describe pvc reports-data` so you confirm a binding problem before editing.',
      'Patch the claim to `storageClassName: fast` because that is what the matching simulated volume expects.',
      'Read the YAML or grade the mission only after the claim shows Bound.',
    ),
    feedback: {
      startTitle: 'Storage lab active',
      startBody: 'The PVC is stuck Pending because it does not point at the expected storage class.',
      failTitle: 'PVC still Pending',
      failBody: 'The claim is not Bound yet, so the storage path is still incomplete.',
      repairTitle: 'Storage repair recorded',
      repairBody: 'The simulator saw a claim update.',
      passTitle: 'Claim bound',
      passBody: 'The grader sees the corrected storage class and a Bound PVC.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'storage',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Persistent volume binding workshop'],
      startLines: ['Scenario injected for pvc/reports-data.', 'Investigate why the claim is still Pending.'],
      inspectors: [
        inspector(
          ['kubectl get pvc reports-data'],
          'Inspect claim binding state.',
          ['NAME           STATUS    VOLUME   CAPACITY   STORAGECLASS', 'reports-data   Pending            10Gi       slow'],
          ['NAME           STATUS   VOLUME         CAPACITY   STORAGECLASS', 'reports-data   Bound    pv-reports     10Gi       fast'],
        ),
        inspector(
          ['kubectl describe pvc reports-data'],
          'Inspect claim details and events.',
          ['Name: reports-data', 'StorageClass: slow', 'Events: no persistent volumes available for this claim'],
          ['Name: reports-data', 'StorageClass: fast', 'Events: bound to volume pv-reports'],
        ),
        inspector(
          ['kubectl get pvc reports-data -o yaml'],
          'Inspect claim YAML.',
          ['spec:', '  storageClassName: slow', 'status:', '  phase: Pending'],
          ['spec:', '  storageClassName: fast', 'status:', '  phase: Bound'],
        ),
        inspector(
          ['kubectl get events --sort-by=.metadata.creationTimestamp'],
          'Inspect storage events.',
          ['Warning ProvisioningFailed pvc/reports-data no persistent volumes available for this claim'],
          ['Normal Bound pvc/reports-data Successfully bound to pv-reports'],
        ),
      ],
      actions: [
        action('patch-pvc', 'Patch the claim storage class', ['kubectl patch pvc reports-data -p {"spec":{"storageClassName":"fast"}}'], 'Align the claim with the available class.', ['persistentvolumeclaim/reports-data patched']),
      ],
      successCriteria: ['spec.storageClassName is fast', 'pvc/reports-data is Bound'],
    },
  }),
  mission({
    id: 'rbac-access',
    title: 'RBAC access mission',
    difficulty: 'Foundation',
    learningGoal: 'Restore namespace read access by creating the missing RoleBinding.',
    description: 'Fix an authorization problem so a service account can list Pods again.',
    docsUrl: 'https://kubernetes.io/docs/reference/access-authn-authz/rbac/',
    tooltip: 'Practice authorizing the right subject with the right binding.',
    whyItMatters:
      'RBAC issues can look like application bugs until you explicitly test identity and permissions.',
    commonMistakes: [
      'Binding the wrong service account or namespace.',
      'Checking Roles but forgetting RoleBindings.',
      'Assuming access after creating a resource without testing `auth can-i`.',
    ],
    quickGuide: [
      'Test the current access path.',
      'Inspect the missing authorization clue.',
      'Create the RoleBinding and re-test.',
    ],
    hints: [
      'Run the `auth can-i` command from the mission card.',
      'The missing piece is not the Role itself; it is the binding.',
      'Be precise with the service account namespace.',
    ],
    commands: [
      { command: 'kubectl auth can-i get pods --as=system:serviceaccount:rbac-lab:auditor -n rbac-lab', purpose: 'Test the current permission state.' },
      { command: 'kubectl describe rolebinding read-pods -n rbac-lab', purpose: 'Confirm the expected binding is absent in the broken state.' },
      { command: 'kubectl create rolebinding read-pods --role=pod-reader --serviceaccount=rbac-lab:auditor -n rbac-lab', purpose: 'Grant the service account the intended role.' },
      { command: 'kubectl auth can-i get pods --as=system:serviceaccount:rbac-lab:auditor -n rbac-lab', purpose: 'Re-test the permission after the binding.' },
    ],
    values: [
      { value: 'no', meaning: 'The service account is unauthorized before the repair.' },
      { value: 'yes', meaning: 'The repaired RoleBinding grants the expected access.' },
      { value: 'system:serviceaccount:rbac-lab:auditor', meaning: 'The subject under test in this mission.' },
    ],
    glossary: [
      { term: 'Role', definition: 'A namespace-scoped set of allowed actions.' },
      { term: 'RoleBinding', definition: 'An object that attaches a Role to one or more subjects.' },
      { term: 'ServiceAccount', definition: 'An identity used by workloads and authorization checks inside a cluster.' },
    ],
    fieldGuide: [
      { field: 'subjects', explanation: 'The correct service account must appear as a binding subject.' },
      { field: 'roleRef', explanation: 'The binding must point at the intended Role.' },
      { field: 'metadata.namespace', explanation: 'RBAC objects are namespaced here, so scope matters.' },
    ],
    tutorial: tutorial(
      'Use `kubectl auth can-i ...` to prove the service account cannot read Pods before you change anything.',
      'Create the RoleBinding for `rbac-lab:auditor` against the existing `pod-reader` Role.',
      'Re-run `auth can-i` so the permission test itself becomes part of your troubleshooting habit.',
    ),
    feedback: {
      startTitle: 'RBAC lab active',
      startBody: 'A service account is missing the binding it needs to read Pods in its namespace.',
      failTitle: 'Access still denied',
      failBody: 'The grader still sees missing read access for the target service account.',
      repairTitle: 'Authorization change recorded',
      repairBody: 'The simulator saw a role binding change.',
      passTitle: 'Access restored',
      passBody: 'The service account now passes the simulated `auth can-i` check.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'rbac-lab',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: RBAC access mission'],
      startLines: ['Scenario injected for serviceaccount/auditor.', 'Confirm the identity and permission gap before fixing it.'],
      inspectors: [
        inspector(
          ['kubectl auth can-i get pods --as=system:serviceaccount:rbac-lab:auditor -n rbac-lab'],
          'Test the service account permission.',
          ['no'],
          ['yes'],
        ),
        inspector(
          ['kubectl describe rolebinding read-pods -n rbac-lab'],
          'Inspect the expected binding.',
          ['Error from server (NotFound): rolebindings.rbac.authorization.k8s.io "read-pods" not found'],
          ['Name: read-pods', 'Role: pod-reader', 'Subjects: system:serviceaccount:rbac-lab:auditor'],
        ),
        inspector(
          ['kubectl get role pod-reader -n rbac-lab -o yaml'],
          'Inspect the Role that already exists.',
          ['kind: Role', 'metadata:', '  name: pod-reader', 'rules:', '- resources: ["pods"]', '  verbs: ["get","list"]'],
          ['kind: Role', 'metadata:', '  name: pod-reader', 'rules:', '- resources: ["pods"]', '  verbs: ["get","list"]'],
        ),
      ],
      actions: [
        action('create-binding', 'Create the missing RoleBinding', ['kubectl create rolebinding read-pods --role=pod-reader --serviceaccount=rbac-lab:auditor -n rbac-lab'], 'Grant the target service account pod-reader privileges.', ['rolebinding.rbac.authorization.k8s.io/read-pods created']),
      ],
      successCriteria: ['rolebinding/read-pods exists', 'auditor service account can get pods in rbac-lab'],
    },
  }),
  mission({
    id: 'deployment-rollout',
    title: 'Deployment rollout recovery',
    difficulty: 'Core',
    learningGoal: 'Repair a bad Deployment image and confirm rollout status.',
    description: 'Use deployment-focused commands to recover an unhealthy rollout.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
    tooltip: 'Practice rollout status instead of only Pod-centric commands.',
    whyItMatters:
      'Deployments add controller behavior, so you need rollout-aware commands in addition to simple Pod checks.',
    commonMistakes: [
      'Fixing Pods manually instead of the Deployment template.',
      'Skipping rollout status after setting the image.',
      'Checking a single Pod instead of controller progress.',
    ],
    quickGuide: [
      'Inspect the Deployment rollout.',
      'Correct the image at the Deployment level.',
      'Watch the rollout complete.',
    ],
    hints: [
      'Use `kubectl rollout status deployment/web-frontend`.',
      'The template image is wrong, not just one Pod.',
      'The pass condition is a healthy rollout, not only a changed spec.',
    ],
    commands: [
      { command: 'kubectl get deployment web-frontend', purpose: 'See the replica counts and health summary.' },
      { command: 'kubectl describe deployment web-frontend', purpose: 'Read the failing image and rollout clue.' },
      { command: 'kubectl set image deployment/web-frontend web=nginx:1.25', purpose: 'Repair the template image.' },
      { command: 'kubectl rollout status deployment/web-frontend', purpose: 'Verify that the controller converges.' },
    ],
    values: [
      { value: '0/3', meaning: 'No desired replicas are available in the broken rollout.' },
      { value: '3/3', meaning: 'All desired replicas are available after the repair.' },
      { value: 'nginx:broken', meaning: 'The intentionally invalid deployment image value.' },
    ],
    glossary: [
      { term: 'Deployment', definition: 'A controller that manages ReplicaSets and declarative rolling updates.' },
      { term: 'rollout status', definition: 'A kubectl view into whether a Deployment has converged successfully.' },
      { term: 'Pod template', definition: 'The embedded spec that determines how new Pods will be created.' },
    ],
    fieldGuide: [
      { field: 'spec.template.spec.containers[0].image', explanation: 'This is the Deployment-level field that drives every new Pod.' },
      { field: 'status.availableReplicas', explanation: 'The controller is only healthy once enough replicas become available.' },
      { field: 'metadata.generation', explanation: 'Every update creates a new desired revision for the controller to reconcile.' },
    ],
    tutorial: tutorial(
      'Inspect the Deployment first so you see a controller problem rather than chasing one Pod.',
      'Use `kubectl set image deployment/web-frontend web=nginx:1.25` so the template itself is corrected.',
      'Run rollout status to confirm the controller finishes replacing unhealthy Pods.',
    ),
    feedback: {
      startTitle: 'Rollout recovery active',
      startBody: 'The Deployment template uses an invalid image, so the rollout never becomes healthy.',
      failTitle: 'Deployment still unhealthy',
      failBody: 'The controller has not converged to a healthy rollout yet.',
      repairTitle: 'Deployment repair recorded',
      repairBody: 'A rollout-relevant change has been applied.',
      passTitle: 'Rollout recovered',
      passBody: 'The Deployment image and rollout status now meet the mission requirements.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'apps',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Deployment rollout recovery'],
      startLines: ['Scenario injected for deployment/web-frontend.', 'Treat this like a controller repair, not a one-off Pod fix.'],
      inspectors: [
        inspector(
          ['kubectl get deployment web-frontend'],
          'Inspect deployment availability.',
          ['NAME            READY   UP-TO-DATE   AVAILABLE', 'web-frontend   0/3     3            0'],
          ['NAME            READY   UP-TO-DATE   AVAILABLE', 'web-frontend   3/3     3            3'],
        ),
        inspector(
          ['kubectl describe deployment web-frontend'],
          'Inspect deployment template and events.',
          ['Name: web-frontend', 'Image: nginx:broken', 'Events: ReplicaSet created Pods that failed image pull'],
          ['Name: web-frontend', 'Image: nginx:1.25', 'Events: Deployment has minimum availability'],
        ),
        inspector(
          ['kubectl rollout status deployment/web-frontend'],
          'Inspect rollout convergence.',
          ['Waiting for deployment "web-frontend" rollout to finish: 0 of 3 updated replicas are available...'],
          ['deployment "web-frontend" successfully rolled out'],
        ),
        inspector(
          ['kubectl get deployment web-frontend -o yaml'],
          'Inspect the template image.',
          ['spec:', '  template:', '    spec:', '      containers:', '      - name: web', '        image: nginx:broken'],
          ['spec:', '  template:', '    spec:', '      containers:', '      - name: web', '        image: nginx:1.25'],
        ),
      ],
      actions: [
        action('set-image', 'Update the Deployment image', ['kubectl set image deployment/web-frontend web=nginx:1.25'], 'Repair the Deployment template image.', ['deployment.apps/web-frontend image updated']),
        action('rollout-status', 'Confirm rollout success', ['kubectl rollout status deployment/web-frontend'], 'Verify controller convergence.', ['deployment "web-frontend" successfully rolled out']),
      ],
      successCriteria: ['deployment/web-frontend image is nginx:1.25', 'rollout status reports success'],
    },
  }),
  mission({
    id: 'readiness-probe',
    title: 'Readiness probe repair',
    difficulty: 'Core',
    learningGoal: 'Fix a readiness probe path so the Deployment becomes available again.',
    description: 'Troubleshoot an application probe that blocks traffic even though the container starts.',
    docsUrl: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/',
    tooltip: 'Practice probe reasoning instead of image debugging.',
    whyItMatters:
      'Probe failures create a subtle class of outage where containers are running but not ready to receive traffic.',
    commonMistakes: [
      'Assuming Running means healthy enough for traffic.',
      'Changing container images when the probe path is the problem.',
      'Forgetting that readiness affects Service endpoints.',
    ],
    quickGuide: [
      'Inspect the Deployment and probe path.',
      'Patch the readiness path.',
      'Wait for the rollout to restore availability.',
    ],
    hints: [
      'The application is running, but the readiness check is wrong.',
      'Look for `/readyz-wrong` versus `/readyz`.',
      'A pass requires available replicas, not just started containers.',
    ],
    commands: [
      { command: 'kubectl describe deployment api-gateway', purpose: 'See the probe clue and availability issue.' },
      { command: 'kubectl get deployment api-gateway', purpose: 'Confirm that ready replicas are missing.' },
      { command: 'kubectl patch deployment api-gateway -p {"spec":{"template":{"spec":{"containers":[{"name":"api","readinessProbe":{"httpGet":{"path":"/readyz"}}}]}}}}', purpose: 'Repair the readiness path.' },
      { command: 'kubectl rollout status deployment/api-gateway', purpose: 'Verify the Deployment becomes available.' },
    ],
    values: [
      { value: '/readyz-wrong', meaning: 'The broken readiness path in the initial scenario.' },
      { value: '/readyz', meaning: 'The corrected readiness path.' },
      { value: 'Available=False', meaning: 'The controller has no ready Pods to serve traffic.' },
    ],
    glossary: [
      { term: 'Readiness probe', definition: 'A check that controls whether a container may receive traffic.' },
      { term: 'Endpoint', definition: 'A backend target that a Service can route to only when the Pod is ready.' },
      { term: 'Available replicas', definition: 'Replicas that are ready and counted healthy by the Deployment controller.' },
    ],
    fieldGuide: [
      { field: 'spec.template.spec.containers[0].readinessProbe.httpGet.path', explanation: 'The broken field lives here.' },
      { field: 'status.availableReplicas', explanation: 'The grader uses availability as the runtime success check.' },
      { field: 'spec.selector', explanation: 'Selector wiring is already correct; do not chase the wrong subsystem.' },
    ],
    tutorial: tutorial(
      'Use describe output to confirm the container starts but the readiness path is wrong.',
      'Patch the Deployment template so the readiness probe uses `/readyz`.',
      'Check rollout status after the patch so you verify healthy availability, not just container creation.',
    ),
    feedback: {
      startTitle: 'Probe lab active',
      startBody: 'The Deployment runs containers, but the readiness probe blocks availability.',
      failTitle: 'Readiness still failing',
      failBody: 'The Deployment still does not have healthy available replicas.',
      repairTitle: 'Probe repair recorded',
      repairBody: 'The simulator saw a probe-related change.',
      passTitle: 'Probe fixed',
      passBody: 'The Deployment now uses the correct readiness path and reaches availability.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'apps',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Readiness probe repair'],
      startLines: ['Scenario injected for deployment/api-gateway.', 'Investigate probe configuration before you patch anything.'],
      inspectors: [
        inspector(
          ['kubectl get deployment api-gateway'],
          'Inspect Deployment availability.',
          ['NAME          READY   UP-TO-DATE   AVAILABLE', 'api-gateway   0/2     2            0'],
          ['NAME          READY   UP-TO-DATE   AVAILABLE', 'api-gateway   2/2     2            2'],
        ),
        inspector(
          ['kubectl describe deployment api-gateway'],
          'Inspect probe details.',
          ['Readiness: http-get http://:8080/readyz-wrong delay=0s timeout=1s', 'Conditions: Available=False'],
          ['Readiness: http-get http://:8080/readyz delay=0s timeout=1s', 'Conditions: Available=True'],
        ),
        inspector(
          ['kubectl rollout status deployment/api-gateway'],
          'Inspect rollout status.',
          ['Waiting for deployment "api-gateway" rollout to finish: 0 of 2 updated replicas are available...'],
          ['deployment "api-gateway" successfully rolled out'],
        ),
      ],
      actions: [
        action('patch-probe', 'Patch the readiness probe path', ['kubectl patch deployment api-gateway -p {"spec":{"template":{"spec":{"containers":[{"name":"api","readinessProbe":{"httpGet":{"path":"/readyz"}}}]}}}}'], 'Repair the probe path to the correct endpoint.', ['deployment.apps/api-gateway patched']),
        action('rollout-status', 'Confirm Deployment availability', ['kubectl rollout status deployment/api-gateway'], 'Wait for available replicas after the probe fix.', ['deployment "api-gateway" successfully rolled out']),
      ],
      successCriteria: ['readiness probe path is /readyz', 'deployment/api-gateway has available replicas'],
    },
  }),
  mission({
    id: 'configmap-key',
    title: 'ConfigMap key correction',
    difficulty: 'Core',
    learningGoal: 'Fix a broken ConfigMap key reference so the app can read the expected value.',
    description: 'Repair a misspelled key and restart the workload to consume the corrected config.',
    docsUrl: 'https://kubernetes.io/docs/concepts/configuration/configmap/',
    tooltip: 'Practice configuration repair rather than compute or scheduling fixes.',
    whyItMatters:
      'Configuration mistakes are common because the Pod runs, but the application still fails on missing values.',
    commonMistakes: [
      'Editing the Deployment when the problem is inside the ConfigMap data.',
      'Forgetting to restart the workload after changing config.',
      'Checking only YAML and not the resulting rollout health.',
    ],
    quickGuide: [
      'Inspect the ConfigMap contents.',
      'Correct the key name or value.',
      'Restart the Deployment and verify healthy availability.',
    ],
    hints: [
      'The deployment expects `APP_MODE`, not `APP_MDOE`.',
      'Look at `kubectl get configmap app-settings -o yaml`.',
      'A rollout restart is part of the recovery in this mission.',
    ],
    commands: [
      { command: 'kubectl get configmap app-settings -o yaml', purpose: 'Inspect the broken ConfigMap key.' },
      { command: 'kubectl describe deployment config-demo', purpose: 'See which key the workload expects.' },
      { command: 'kubectl patch configmap app-settings -p {"data":{"APP_MODE":"production"}}', purpose: 'Repair the expected configuration key.' },
      { command: 'kubectl rollout restart deployment/config-demo', purpose: 'Reload the Deployment against the corrected config.' },
    ],
    values: [
      { value: 'APP_MDOE', meaning: 'The misspelled key in the broken ConfigMap.' },
      { value: 'APP_MODE', meaning: 'The correct key consumed by the app.' },
      { value: 'production', meaning: 'The expected value for the repaired app mode.' },
    ],
    glossary: [
      { term: 'ConfigMap', definition: 'A Kubernetes object for non-secret configuration data.' },
      { term: 'Environment variable reference', definition: 'A way to inject ConfigMap values into a container.' },
      { term: 'Rollout restart', definition: 'A trigger that recreates Pods so they pick up new template-driven inputs.' },
    ],
    fieldGuide: [
      { field: 'data.APP_MODE', explanation: 'The app expects this key after the repair.' },
      { field: 'spec.template.spec.containers[].env', explanation: 'The Deployment already references the correct key name.' },
      { field: 'status.availableReplicas', explanation: 'The workload must recover after the ConfigMap fix and restart.' },
    ],
    tutorial: tutorial(
      'Read the ConfigMap and Deployment clues before patching so you know which key is actually wrong.',
      'Patch the ConfigMap to include `APP_MODE: production` and remove the misspelled dependency from the problem space.',
      'Restart the Deployment and confirm it returns to full availability.',
    ),
    feedback: {
      startTitle: 'ConfigMap lab active',
      startBody: 'The application cannot read the configuration key it expects.',
      failTitle: 'Configuration still broken',
      failBody: 'The workload has not fully recovered from the ConfigMap issue.',
      repairTitle: 'Configuration change recorded',
      repairBody: 'The simulator saw a config-related repair.',
      passTitle: 'Configuration recovered',
      passBody: 'The ConfigMap key and workload restart now satisfy the mission.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'config-lab',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: ConfigMap key correction'],
      startLines: ['Scenario injected for configmap/app-settings.', 'Look for a naming mistake in the configuration data.'],
      inspectors: [
        inspector(
          ['kubectl get configmap app-settings -o yaml'],
          'Inspect ConfigMap data.',
          ['data:', '  APP_MDOE: production'],
          ['data:', '  APP_MODE: production'],
        ),
        inspector(
          ['kubectl describe deployment config-demo'],
          'Inspect expected environment keys.',
          ['Env: APP_MODE from configmap/app-settings key APP_MODE', 'Events: application cannot find required APP_MODE'],
          ['Env: APP_MODE from configmap/app-settings key APP_MODE', 'Events: configuration loaded successfully'],
        ),
        inspector(
          ['kubectl get deployment config-demo'],
          'Inspect deployment availability.',
          ['NAME         READY   UP-TO-DATE   AVAILABLE', 'config-demo   0/1     1            0'],
          ['NAME         READY   UP-TO-DATE   AVAILABLE', 'config-demo   1/1     1            1'],
        ),
      ],
      actions: [
        action('patch-configmap', 'Patch the ConfigMap data', ['kubectl patch configmap app-settings -p {"data":{"APP_MODE":"production"}}'], 'Correct the expected configuration key.', ['configmap/app-settings patched']),
        action('restart-deployment', 'Restart the Deployment', ['kubectl rollout restart deployment/config-demo'], 'Recycle Pods so they consume the corrected ConfigMap.', ['deployment.apps/config-demo restarted']),
      ],
      successCriteria: ['configmap/app-settings contains APP_MODE', 'deployment/config-demo returns to available'],
    },
  }),
  mission({
    id: 'secret-env',
    title: 'Secret environment repair',
    difficulty: 'Core',
    learningGoal: 'Restore an app by correcting the Secret key it reads for a password.',
    description: 'Repair a Secret data key and roll the consuming Deployment.',
    docsUrl: 'https://kubernetes.io/docs/concepts/configuration/secret/',
    tooltip: 'Practice secret-based configuration and safe verification patterns.',
    whyItMatters:
      'Secrets behave a lot like ConfigMaps operationally, but the naming and decoding paths often create more confusion.',
    commonMistakes: [
      'Assuming the Secret object exists and therefore must be correct.',
      'Fixing the Deployment instead of the Secret key.',
      'Skipping rollout verification after changing the data source.',
    ],
    quickGuide: [
      'Inspect the Secret YAML.',
      'Correct the expected key.',
      'Restart the Deployment and verify it becomes available.',
    ],
    hints: [
      'The app expects `DB_PASSWORD`.',
      'The current Secret stores `DB_PASSWRD`.',
      'Use rollout restart after the Secret fix in this simulation.',
    ],
    commands: [
      { command: 'kubectl get secret db-credentials -o yaml', purpose: 'Inspect the broken Secret key.' },
      { command: 'kubectl describe deployment payments-api', purpose: 'See which Secret key the app expects.' },
      { command: 'kubectl patch secret db-credentials -p {"stringData":{"DB_PASSWORD":"supersecret"}}', purpose: 'Create the correct Secret key in the simulator.' },
      { command: 'kubectl rollout restart deployment/payments-api', purpose: 'Restart the workload against the corrected Secret.' },
    ],
    values: [
      { value: 'DB_PASSWRD', meaning: 'The intentionally misspelled key in the Secret.' },
      { value: 'DB_PASSWORD', meaning: 'The key the application expects.' },
      { value: 'supersecret', meaning: 'The repaired value used by the simulator.' },
    ],
    glossary: [
      { term: 'Secret', definition: 'A Kubernetes object for sensitive configuration data.' },
      { term: 'stringData', definition: 'A write-friendly way to provide Secret values before Kubernetes stores them encoded.' },
      { term: 'EnvFrom/secretKeyRef', definition: 'Mechanisms that expose Secret data to containers.' },
    ],
    fieldGuide: [
      { field: 'data.DB_PASSWORD', explanation: 'The app depends on this logical key after the repair.' },
      { field: 'spec.template.spec.containers[].env', explanation: 'The consuming Deployment already points at DB_PASSWORD.' },
      { field: 'status.availableReplicas', explanation: 'The runtime pass condition is a healthy Deployment.' },
    ],
    tutorial: tutorial(
      'Inspect the Secret and Deployment relationship first so you see that the workload expects a key that the Secret does not provide.',
      'Patch the Secret with `stringData.DB_PASSWORD` so the simulator can model a corrected credential source.',
      'Restart the Deployment and verify healthy availability before grading.',
    ),
    feedback: {
      startTitle: 'Secret lab active',
      startBody: 'The app cannot read the credential key it expects from the Secret.',
      failTitle: 'Credential wiring still broken',
      failBody: 'The Deployment has not recovered from the Secret mismatch yet.',
      repairTitle: 'Secret repair recorded',
      repairBody: 'The simulator saw a Secret-related update.',
      passTitle: 'Credential path repaired',
      passBody: 'The Secret and Deployment restart now satisfy the mission.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'payments',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Secret environment repair'],
      startLines: ['Scenario injected for secret/db-credentials.', 'Inspect the Secret key names instead of assuming the object itself is fine.'],
      inspectors: [
        inspector(
          ['kubectl get secret db-credentials -o yaml'],
          'Inspect Secret keys.',
          ['data:', '  DB_PASSWRD: c3VwZXJzZWNyZXQ='],
          ['data:', '  DB_PASSWORD: c3VwZXJzZWNyZXQ='],
        ),
        inspector(
          ['kubectl describe deployment payments-api'],
          'Inspect Deployment env refs.',
          ['Env: DB_PASSWORD from secret/db-credentials key DB_PASSWORD', 'Events: missing required secret key DB_PASSWORD'],
          ['Env: DB_PASSWORD from secret/db-credentials key DB_PASSWORD', 'Events: deployment has minimum availability'],
        ),
        inspector(
          ['kubectl get deployment payments-api'],
          'Inspect deployment availability.',
          ['NAME           READY   UP-TO-DATE   AVAILABLE', 'payments-api   0/2     2            0'],
          ['NAME           READY   UP-TO-DATE   AVAILABLE', 'payments-api   2/2     2            2'],
        ),
      ],
      actions: [
        action('patch-secret', 'Patch the Secret with DB_PASSWORD', ['kubectl patch secret db-credentials -p {"stringData":{"DB_PASSWORD":"supersecret"}}'], 'Provide the key the app expects.', ['secret/db-credentials patched']),
        action('restart-deployment', 'Restart the Deployment', ['kubectl rollout restart deployment/payments-api'], 'Recycle Pods so they read the corrected Secret.', ['deployment.apps/payments-api restarted']),
      ],
      successCriteria: ['secret/db-credentials contains DB_PASSWORD', 'deployment/payments-api returns to available'],
    },
  }),
  mission({
    id: 'service-selector',
    title: 'Service selector mismatch',
    difficulty: 'Core',
    learningGoal: 'Repair a Service selector so traffic reaches healthy Pods again.',
    description: 'Fix the selector labels and confirm endpoints are populated.',
    docsUrl: 'https://kubernetes.io/docs/concepts/services-networking/service/',
    tooltip: 'Practice the relationship between labels, selectors, and endpoints.',
    whyItMatters:
      'Services can exist happily while routing to nothing at all, which makes selectors a common troubleshooting target.',
    commonMistakes: [
      'Inspecting the Deployment but never checking Service endpoints.',
      'Changing Pod labels when the Service selector is actually wrong.',
      'Assuming the Service object itself being present means it is working.',
    ],
    quickGuide: [
      'Inspect the Service and its endpoints.',
      'Correct the selector to match the Pods.',
      'Verify endpoints are populated before grading.',
    ],
    hints: [
      'Start with `kubectl get endpoints api-service`.',
      'The Pods are labeled `app=api`; the Service is not.',
      'A repaired selector should yield non-empty endpoints.',
    ],
    commands: [
      { command: 'kubectl get service api-service', purpose: 'Inspect the Service definition at a high level.' },
      { command: 'kubectl get endpoints api-service', purpose: 'See whether the Service has usable backends.' },
      { command: 'kubectl patch service api-service -p {"spec":{"selector":{"app":"api"}}}', purpose: 'Repair the Service selector.' },
      { command: 'kubectl describe service api-service', purpose: 'Verify that the selector and endpoints now align.' },
    ],
    values: [
      { value: 'app=ap1', meaning: 'The intentionally broken selector label.' },
      { value: 'app=api', meaning: 'The correct selector for the healthy Pods.' },
      { value: '<none>', meaning: 'A Service with no endpoints to route traffic to.' },
    ],
    glossary: [
      { term: 'Service selector', definition: 'The label query Kubernetes uses to build a Service backend set.' },
      { term: 'Endpoints', definition: 'The concrete Pod IPs a Service can route traffic to.' },
      { term: 'Label', definition: 'A key/value tag on an object used for grouping and selection.' },
    ],
    fieldGuide: [
      { field: 'spec.selector', explanation: 'The mission is broken at the Service selector field.' },
      { field: 'subsets.addresses', explanation: 'The Endpoints object should become populated after the fix.' },
      { field: 'metadata.labels', explanation: 'The target Pods already carry the correct label; do not “fix” them unnecessarily.' },
    ],
    tutorial: tutorial(
      'Inspect endpoints first because an empty backend set immediately narrows the problem to selector wiring.',
      'Patch the Service selector to `app=api` so it matches the healthy Pods.',
      'Describe the Service again to confirm endpoints are no longer empty before grading.',
    ),
    feedback: {
      startTitle: 'Service lab active',
      startBody: 'The Service exists, but its selector does not match the intended Pods.',
      failTitle: 'Service still has no backends',
      failBody: 'The selector and endpoints are still not aligned.',
      repairTitle: 'Service repair recorded',
      repairBody: 'The simulator saw a Service selector change.',
      passTitle: 'Backends restored',
      passBody: 'The Service selector now matches Pods and endpoints are populated.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'networking',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Service selector mismatch'],
      startLines: ['Scenario injected for service/api-service.', 'Check whether the Service actually has endpoints.'],
      inspectors: [
        inspector(
          ['kubectl get service api-service'],
          'Inspect Service summary.',
          ['NAME          TYPE        CLUSTER-IP     PORT(S)', 'api-service   ClusterIP   10.96.0.44    80/TCP'],
          ['NAME          TYPE        CLUSTER-IP     PORT(S)', 'api-service   ClusterIP   10.96.0.44    80/TCP'],
        ),
        inspector(
          ['kubectl get endpoints api-service'],
          'Inspect Service endpoints.',
          ['NAME          ENDPOINTS   AGE', 'api-service   <none>      4m'],
          ['NAME          ENDPOINTS          AGE', 'api-service   10.244.1.7:8080   4m'],
        ),
        inspector(
          ['kubectl describe service api-service'],
          'Inspect Service selector and endpoint details.',
          ['Selector: app=ap1', 'Endpoints: <none>'],
          ['Selector: app=api', 'Endpoints: 10.244.1.7:8080'],
        ),
      ],
      actions: [
        action('patch-service', 'Patch the Service selector', ['kubectl patch service api-service -p {"spec":{"selector":{"app":"api"}}}'], 'Align the Service selector with the real Pods.', ['service/api-service patched']),
      ],
      successCriteria: ['service/api-service selector is app=api', 'endpoints/api-service contains at least one backend'],
    },
  }),
  mission({
    id: 'ingress-backend',
    title: 'Ingress backend correction',
    difficulty: 'Core',
    learningGoal: 'Fix an Ingress path that points at the wrong Service backend.',
    description: 'Repair the backend service name and verify the route target is correct.',
    docsUrl: 'https://kubernetes.io/docs/concepts/services-networking/ingress/',
    tooltip: 'Practice routing clues at the Ingress layer.',
    whyItMatters:
      'Ingress objects often fail because the route target is wrong even when Pods and Services look healthy.',
    commonMistakes: [
      'Checking Pods but not the Ingress backend target.',
      'Changing the Service instead of the Ingress path rule.',
      'Ignoring `describe ingress` output where the bad backend is visible.',
    ],
    quickGuide: [
      'Inspect the Ingress backend.',
      'Patch the backend service name.',
      'Describe the Ingress again to confirm the route target.',
    ],
    hints: [
      'The route should point to `web-service`, not `web-srevice`.',
      'Use `kubectl describe ingress web-ingress`.',
      'The app is healthy; the route target is the broken piece.',
    ],
    commands: [
      { command: 'kubectl get ingress web-ingress', purpose: 'Inspect the Ingress object at a high level.' },
      { command: 'kubectl describe ingress web-ingress', purpose: 'See the incorrect backend service name.' },
      { command: 'kubectl patch ingress web-ingress -p {"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"web-service","port":{"number":80}}}}]}}]}}', purpose: 'Repair the backend service target.' },
      { command: 'kubectl describe ingress web-ingress', purpose: 'Verify the route now targets the correct Service.' },
    ],
    values: [
      { value: 'web-srevice', meaning: 'The intentionally misspelled backend name.' },
      { value: 'web-service', meaning: 'The corrected backend Service for the route.' },
    ],
    glossary: [
      { term: 'Ingress', definition: 'A Kubernetes API object that defines HTTP or HTTPS routing rules into the cluster.' },
      { term: 'Backend service', definition: 'The Service an Ingress path sends traffic to.' },
      { term: 'Path rule', definition: 'A route definition that matches traffic and sends it to a backend.' },
    ],
    fieldGuide: [
      { field: 'spec.rules[].http.paths[].backend.service.name', explanation: 'This is the broken field in the current mission.' },
      { field: 'metadata.annotations', explanation: 'Annotations can matter for controllers, but the core fix here is the backend name.' },
      { field: 'spec.rules[].host', explanation: 'The host is already correct and is not the source of failure.' },
    ],
    tutorial: tutorial(
      'Describe the Ingress to confirm the path points at a misspelled Service backend.',
      'Patch the backend service name so the path routes to `web-service`.',
      'Describe the Ingress once more and grade only after the backend target is corrected.',
    ),
    feedback: {
      startTitle: 'Ingress lab active',
      startBody: 'The route target is misspelled even though the Ingress object exists.',
      failTitle: 'Backend still wrong',
      failBody: 'The simulated route still points at the wrong Service.',
      repairTitle: 'Ingress repair recorded',
      repairBody: 'The simulator saw an Ingress backend change.',
      passTitle: 'Route corrected',
      passBody: 'The Ingress now targets the correct backend service.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'networking',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Ingress backend correction'],
      startLines: ['Scenario injected for ingress/web-ingress.', 'Inspect the backend target before touching any Services.'],
      inspectors: [
        inspector(
          ['kubectl get ingress web-ingress'],
          'Inspect Ingress summary.',
          ['NAME         CLASS   HOSTS         ADDRESS   PORTS', 'web-ingress  nginx   demo.local              80'],
          ['NAME         CLASS   HOSTS         ADDRESS   PORTS', 'web-ingress  nginx   demo.local              80'],
        ),
        inspector(
          ['kubectl describe ingress web-ingress'],
          'Inspect route backend target.',
          ['Rules:', '  / -> web-srevice:80 (<error: endpoints not found>)'],
          ['Rules:', '  / -> web-service:80 (10.244.1.7:8080)'],
        ),
      ],
      actions: [
        action('patch-ingress', 'Patch the Ingress backend name', ['kubectl patch ingress web-ingress -p {"spec":{"rules":[{"http":{"paths":[{"path":"/","backend":{"service":{"name":"web-service","port":{"number":80}}}}]}}]}}'], 'Point the path at the correct Service.', ['ingress.networking.k8s.io/web-ingress patched']),
      ],
      successCriteria: ['ingress/web-ingress backend service is web-service'],
    },
  }),
  mission({
    id: 'crashloop-args',
    title: 'CrashLoopBackOff arguments repair',
    difficulty: 'Core',
    learningGoal: 'Fix a bad container argument so the Pod exits cleanly and stays running.',
    description: 'Inspect logs and Pod details to correct a broken command argument.',
    docsUrl: 'https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/',
    tooltip: 'Practice logs-first troubleshooting for CrashLoopBackOff symptoms.',
    whyItMatters:
      'Crash loops often require logs and spec inspection together; image health alone does not explain them.',
    commonMistakes: [
      'Checking only events without reading container logs.',
      'Patching the wrong field when the issue lives in args.',
      'Treating CrashLoopBackOff like a scheduling problem.',
    ],
    quickGuide: [
      'Inspect Pod status and logs.',
      'Patch the broken argument.',
      'Verify the Pod remains Running.',
    ],
    hints: [
      'The current args point at `/bad-path`.',
      'Use `kubectl logs worker-job`.',
      'The fix is in the container args, not in the image.',
    ],
    commands: [
      { command: 'kubectl get pod worker-job', purpose: 'See the CrashLoopBackOff state.' },
      { command: 'kubectl logs worker-job', purpose: 'Read the failure clue from the container logs.' },
      { command: 'kubectl patch pod worker-job -p {"spec":{"containers":[{"name":"worker","args":["--config=/etc/app/config.yaml"]}]}}', purpose: 'Repair the broken argument.' },
      { command: 'kubectl get pod worker-job -o wide', purpose: 'Verify the Pod remains Running.' },
    ],
    values: [
      { value: '--config=/bad-path', meaning: 'The broken argument causing the crash.' },
      { value: '--config=/etc/app/config.yaml', meaning: 'The corrected container argument.' },
      { value: 'CrashLoopBackOff', meaning: 'A repeated container restart failure state.' },
    ],
    glossary: [
      { term: 'CrashLoopBackOff', definition: 'A repeated restart cycle caused by a container process failing quickly.' },
      { term: 'Container args', definition: 'Arguments appended to a container entrypoint at runtime.' },
      { term: 'kubectl logs', definition: 'A core debugging command for reading container stdout and stderr.' },
    ],
    fieldGuide: [
      { field: 'spec.containers[0].args', explanation: 'The broken file path lives in the container arguments.' },
      { field: 'status.containerStatuses[].state', explanation: 'This shows the restart loop symptom in a real cluster.' },
      { field: 'status.phase', explanation: 'The mission passes once the Pod is Running instead of restarting.' },
    ],
    tutorial: tutorial(
      'Use `kubectl get pod worker-job` and `kubectl logs worker-job` to prove the process is crashing because of its args.',
      'Patch the Pod args so the container reads the valid config path.',
      'Verify the Pod reaches Running before grading the mission.',
    ),
    feedback: {
      startTitle: 'Crash loop lab active',
      startBody: 'The Pod crashes because its container command-line arguments are wrong.',
      failTitle: 'Pod still crashing',
      failBody: 'The grader still sees a crash loop or missing argument fix.',
      repairTitle: 'Args repair recorded',
      repairBody: 'The simulator saw a container argument change.',
      passTitle: 'Crash loop cleared',
      passBody: 'The Pod now uses the corrected args and stays Running.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'debug',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: CrashLoopBackOff arguments repair'],
      startLines: ['Scenario injected for pod/worker-job.', 'Use status and logs together to diagnose the crash.'],
      inspectors: [
        inspector(
          ['kubectl get pod worker-job', 'kubectl get pod worker-job -o wide'],
          'Inspect Pod summary and state.',
          ['NAME         READY   STATUS             RESTARTS', 'worker-job   0/1     CrashLoopBackOff   5'],
          ['NAME         READY   STATUS    RESTARTS', 'worker-job   1/1     Running   0'],
        ),
        inspector(
          ['kubectl logs worker-job'],
          'Inspect container logs.',
          ['Error: config file /bad-path not found'],
          ['Worker started with config /etc/app/config.yaml'],
        ),
        inspector(
          ['kubectl get pod worker-job -o yaml'],
          'Inspect Pod args.',
          ['spec:', '  containers:', '  - name: worker', '    args:', '    - --config=/bad-path'],
          ['spec:', '  containers:', '  - name: worker', '    args:', '    - --config=/etc/app/config.yaml'],
        ),
      ],
      actions: [
        action('patch-args', 'Patch the container args', ['kubectl patch pod worker-job -p {"spec":{"containers":[{"name":"worker","args":["--config=/etc/app/config.yaml"]}]}}'], 'Correct the bad config path.', ['pod/worker-job patched']),
      ],
      successCriteria: ['pod/worker-job args reference /etc/app/config.yaml', 'pod/worker-job is Running'],
    },
  }),
  mission({
    id: 'taint-toleration',
    title: 'Taint and toleration match',
    difficulty: 'Core',
    learningGoal: 'Allow a Pod onto a tainted node by adding the expected toleration.',
    description: 'Repair Pod scheduling by matching a node taint with the correct toleration.',
    docsUrl: 'https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/',
    tooltip: 'Practice taint troubleshooting when selectors are not the issue.',
    whyItMatters:
      'Taints and tolerations often explain why a Pod remains Pending even when labels and resources look correct.',
    commonMistakes: [
      'Assuming nodeSelector is the only placement mechanism.',
      'Removing taints instead of teaching the workload to tolerate them.',
      'Ignoring the scheduler event message that names the taint.',
    ],
    quickGuide: [
      'Read the Pending reason and scheduler event.',
      'Inspect the node taint.',
      'Patch the Pod toleration and verify it runs.',
    ],
    hints: [
      'The node is tainted with `dedicated=platform:NoSchedule`.',
      'The Pod lacks a matching toleration.',
      'Use `kubectl describe pod tolerant-api` for the clearest clue.',
    ],
    commands: [
      { command: 'kubectl describe pod tolerant-api', purpose: 'Inspect the scheduler taint message.' },
      { command: 'kubectl describe node worker-1', purpose: 'Read the node taints.' },
      { command: 'kubectl patch pod tolerant-api -p {"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"platform","effect":"NoSchedule"}]}}', purpose: 'Add the required toleration.' },
      { command: 'kubectl get pod tolerant-api -o wide', purpose: 'Verify the Pod lands on the node.' },
    ],
    values: [
      { value: 'dedicated=platform:NoSchedule', meaning: 'The node taint blocking placement.' },
      { value: 'NoSchedule', meaning: 'The scheduler will not place a Pod unless it tolerates the taint.' },
    ],
    glossary: [
      { term: 'Taint', definition: 'A node rule that repels Pods unless they declare a matching toleration.' },
      { term: 'Toleration', definition: 'A Pod rule that permits scheduling onto tainted nodes.' },
      { term: 'NoSchedule', definition: 'A taint effect that blocks new Pods from landing on a node.' },
    ],
    fieldGuide: [
      { field: 'spec.tolerations', explanation: 'The required fix lives here on the Pod.' },
      { field: 'spec.taints', explanation: 'The node exposes the scheduling barrier through this field.' },
      { field: 'status.phase', explanation: 'The Pod must reach Running after the toleration is added.' },
    ],
    tutorial: tutorial(
      'Use describe output on both the Pod and the node to correlate the unsatisfied taint with the missing toleration.',
      'Patch the Pod tolerations so it explicitly permits `dedicated=platform:NoSchedule`.',
      'Check the Pod summary again so you see it move from Pending to Running.',
    ),
    feedback: {
      startTitle: 'Taint lab active',
      startBody: 'The Pod cannot schedule because it does not tolerate the target node taint.',
      failTitle: 'Taint still blocks placement',
      failBody: 'The Pod still lacks the toleration it needs to land on the tainted node.',
      repairTitle: 'Toleration repair recorded',
      repairBody: 'The simulator saw a scheduling-related toleration change.',
      passTitle: 'Placement restored',
      passBody: 'The Pod now tolerates the taint and reaches Running.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'scheduling',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Taint and toleration match'],
      startLines: ['Scenario injected for pod/tolerant-api.', 'Read the scheduler event before changing node labels or images.'],
      inspectors: [
        inspector(
          ['kubectl get pod tolerant-api -o wide', 'kubectl get pod tolerant-api'],
          'Inspect Pod placement state.',
          ['NAME           READY   STATUS    NODE', 'tolerant-api   0/1     Pending   <none>'],
          ['NAME           READY   STATUS    NODE', 'tolerant-api   1/1     Running   worker-1'],
        ),
        inspector(
          ['kubectl describe pod tolerant-api'],
          'Inspect scheduler event.',
          ['Events: 0/2 nodes are available: 1 node(s) had taint {dedicated: platform}, that the pod did not tolerate.'],
          ['Events: Successfully assigned scheduling/tolerant-api to worker-1'],
        ),
        inspector(
          ['kubectl describe node worker-1'],
          'Inspect node taints.',
          ['Taints: dedicated=platform:NoSchedule'],
          ['Taints: dedicated=platform:NoSchedule'],
        ),
      ],
      actions: [
        action('patch-toleration', 'Patch the Pod toleration', ['kubectl patch pod tolerant-api -p {"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"platform","effect":"NoSchedule"}]}}'], 'Add the toleration that matches the node taint.', ['pod/tolerant-api patched']),
      ],
      successCriteria: ['pod/tolerant-api tolerates dedicated=platform:NoSchedule', 'pod/tolerant-api is Running on worker-1'],
    },
  }),
  mission({
    id: 'namespace-context',
    title: 'Namespace context cleanup',
    difficulty: 'Beginner',
    learningGoal: 'Fix a kubeconfig namespace mismatch so kubectl targets the correct scope.',
    description: 'Repair the current context namespace and confirm you can see the intended resources.',
    docsUrl: 'https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/',
    tooltip: 'Practice kubeconfig context hygiene, which matters heavily in CKA workflows.',
    whyItMatters:
      'A surprising number of “missing resource” problems come from being in the wrong namespace rather than from a broken workload.',
    commonMistakes: [
      'Changing manifests when kubectl is just pointed at the wrong namespace.',
      'Assuming the cluster is empty because `kubectl get pods` returns nothing.',
      'Forgetting to verify the current context after changing it.',
    ],
    quickGuide: [
      'Inspect the current namespace.',
      'Set the correct namespace on the current context.',
      'Confirm that the expected Pods are visible.',
    ],
    hints: [
      'The correct namespace is `team-green`.',
      'Use `kubectl config view --minify` to inspect the current namespace.',
      'This mission is about context, not about repairing a workload spec.',
    ],
    commands: [
      { command: 'kubectl config view --minify', purpose: 'Inspect the current namespace on the active context.' },
      { command: 'kubectl get pods', purpose: 'See that the wrong namespace returns no useful workload data.' },
      { command: 'kubectl config set-context --current --namespace=team-green', purpose: 'Repair the active namespace selection.' },
      { command: 'kubectl get pods', purpose: 'Confirm the expected namespace now shows the target Pod.' },
    ],
    values: [
      { value: 'default', meaning: 'The wrong namespace currently selected in the context.' },
      { value: 'team-green', meaning: 'The intended namespace for this exercise.' },
    ],
    glossary: [
      { term: 'Context', definition: 'A kubeconfig entry that bundles cluster, user, and namespace preferences.' },
      { term: 'Namespace', definition: 'A scope boundary used to organize Kubernetes resources.' },
      { term: 'kubeconfig', definition: 'The configuration file kubectl uses to choose clusters, users, and contexts.' },
    ],
    fieldGuide: [
      { field: 'contexts[].context.namespace', explanation: 'The current context is pointing at the wrong namespace.' },
      { field: 'metadata.namespace', explanation: 'The target Pods live in team-green, so scope matters.' },
      { field: 'current-context', explanation: 'The context itself remains the same; only its namespace needs correction.' },
    ],
    tutorial: tutorial(
      'Inspect the current context before assuming the target Pods are missing or broken.',
      'Set the current context namespace to `team-green` so kubectl points at the intended resource scope.',
      'Re-run `kubectl get pods` and grade only after the expected namespace contents are visible.',
    ),
    feedback: {
      startTitle: 'Namespace lab active',
      startBody: 'Your active context points at the wrong namespace, which hides the resources you need.',
      failTitle: 'Namespace still wrong',
      failBody: 'The grader still sees the wrong namespace in the current context.',
      repairTitle: 'Context update recorded',
      repairBody: 'The simulator saw a kubeconfig namespace change.',
      passTitle: 'Namespace corrected',
      passBody: 'The current context now targets the correct namespace and exposes the intended resources.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'default',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Namespace context cleanup'],
      startLines: ['Scenario injected for kubeconfig context.', 'Treat this like a real “wrong namespace” debugging moment.'],
      inspectors: [
        inspector(
          ['kubectl config view --minify', "kubectl config view --minify -o 'jsonpath={..namespace}'"],
          'Inspect the current namespace.',
          ['current-context: kind-learning-cluster', 'namespace: default'],
          ['current-context: kind-learning-cluster', 'namespace: team-green'],
        ),
        inspector(
          ['kubectl get pods'],
          'Inspect namespace pod visibility.',
          ['No resources found in default namespace.'],
          ['NAME             READY   STATUS', 'green-console    1/1     Running'],
        ),
      ],
      actions: [
        action('set-namespace', 'Set the current namespace to team-green', ['kubectl config set-context --current --namespace=team-green'], 'Point kubectl at the intended namespace.', ['Context "kind-learning-cluster" modified.']),
      ],
      successCriteria: ['current context namespace is team-green', 'kubectl get pods shows the expected team-green workload'],
    },
  }),
  mission({
    id: 'job-repair',
    title: 'Job completion repair',
    difficulty: 'Core',
    learningGoal: 'Fix a failing Job image so the workload can complete successfully.',
    description: 'Repair a run-to-completion workload and verify Job success.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/job/',
    tooltip: 'Practice Job semantics instead of long-running service semantics.',
    whyItMatters:
      'Batch workloads use different health signals than Deployments, so you need to think in terms of completion rather than availability.',
    commonMistakes: [
      'Waiting for Running instead of Completed.',
      'Looking only at Pods without checking the Job summary.',
      'Changing the wrong controller object.',
    ],
    quickGuide: [
      'Inspect the Job status and Pod failure clue.',
      'Repair the Job image.',
      'Verify the Job reaches completion.',
    ],
    hints: [
      'The Job image is `busybox:missing`.',
      'Use `kubectl get job nightly-report` and `kubectl describe job nightly-report`.',
      'Completed is the success state for this mission.',
    ],
    commands: [
      { command: 'kubectl get job nightly-report', purpose: 'Inspect completion counts.' },
      { command: 'kubectl describe job nightly-report', purpose: 'Read the failing image clue.' },
      { command: 'kubectl set image job/nightly-report report=busybox:1.36', purpose: 'Repair the Job image.' },
      { command: 'kubectl wait --for=condition=complete job/nightly-report --timeout=90s', purpose: 'Verify the Job finishes.' },
    ],
    values: [
      { value: '0/1', meaning: 'The Job has not completed successfully yet.' },
      { value: '1/1', meaning: 'The Job has completed and passes the lab.' },
      { value: 'busybox:missing', meaning: 'The broken image in the initial Job.' },
    ],
    glossary: [
      { term: 'Job', definition: 'A controller that runs Pods to successful completion.' },
      { term: 'Completion', definition: 'The signal that a Job finished its intended unit of work.' },
      { term: 'BackoffLimit', definition: 'A Job setting that controls how many failures are retried.' },
    ],
    fieldGuide: [
      { field: 'spec.template.spec.containers[0].image', explanation: 'The Job template starts with a broken image.' },
      { field: 'status.succeeded', explanation: 'The Job passes once succeeded increments to 1.' },
      { field: 'status.conditions', explanation: 'Completion is surfaced through Job conditions.' },
    ],
    tutorial: tutorial(
      'Read the Job summary first so you remember the success signal is completion, not steady-state availability.',
      'Repair the image on the Job template using `kubectl set image`.',
      'Wait for the Job to complete before grading the mission.',
    ),
    feedback: {
      startTitle: 'Job lab active',
      startBody: 'The batch Job cannot complete because its image is invalid.',
      failTitle: 'Job still incomplete',
      failBody: 'The grader does not yet see a completed Job.',
      repairTitle: 'Job repair recorded',
      repairBody: 'The simulator saw a Job template change.',
      passTitle: 'Job completed',
      passBody: 'The Job image and completion state now satisfy the mission.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'batch',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Job completion repair'],
      startLines: ['Scenario injected for job/nightly-report.', 'Think in terms of completion instead of Deployment availability.'],
      inspectors: [
        inspector(
          ['kubectl get job nightly-report'],
          'Inspect Job completion counts.',
          ['NAME             COMPLETIONS   DURATION   AGE', 'nightly-report   0/1           0s         2m'],
          ['NAME             COMPLETIONS   DURATION   AGE', 'nightly-report   1/1           14s        2m'],
        ),
        inspector(
          ['kubectl describe job nightly-report'],
          'Inspect Job image clue.',
          ['Image: busybox:missing', 'Events: Failed to pull image "busybox:missing"'],
          ['Image: busybox:1.36', 'Events: Job completed successfully'],
        ),
      ],
      actions: [
        action('set-image', 'Update the Job image', ['kubectl set image job/nightly-report report=busybox:1.36'], 'Repair the broken batch image.', ['job.batch/nightly-report image updated']),
        action('wait-complete', 'Wait for Job completion', ['kubectl wait --for=condition=complete job/nightly-report --timeout=90s'], 'Verify the batch run finishes.', ['job.batch/nightly-report condition met']),
      ],
      successCriteria: ['job/nightly-report image is busybox:1.36', 'job/nightly-report is complete'],
    },
  }),
  mission({
    id: 'cronjob-schedule',
    title: 'CronJob schedule correction',
    difficulty: 'Core',
    learningGoal: 'Repair a CronJob schedule string so the workload runs on the intended cadence.',
    description: 'Fix an invalid or incorrect schedule and un-suspend the CronJob.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/',
    tooltip: 'Practice scheduled workloads and the fields that control them.',
    whyItMatters:
      'CronJobs fail quietly when schedules or suspend flags are wrong, so explicit inspection matters.',
    commonMistakes: [
      'Checking Jobs without checking the CronJob source object.',
      'Fixing the schedule but forgetting `suspend`.',
      'Treating a scheduled workload like an always-on service.',
    ],
    quickGuide: [
      'Inspect the CronJob schedule and suspend state.',
      'Patch the schedule and unsuspend it.',
      'Verify the CronJob shows the intended timing.',
    ],
    hints: [
      'The target schedule is `*/5 * * * *`.',
      'The broken object is suspended.',
      'Use `kubectl get cronjob cleanup-runner -o yaml`.',
    ],
    commands: [
      { command: 'kubectl get cronjob cleanup-runner', purpose: 'Inspect schedule and suspend summary.' },
      { command: 'kubectl get cronjob cleanup-runner -o yaml', purpose: 'Read the incorrect schedule and suspend fields.' },
      { command: 'kubectl patch cronjob cleanup-runner -p {"spec":{"schedule":"*/5 * * * *","suspend":false}}', purpose: 'Repair the schedule and unsuspend the CronJob.' },
      { command: 'kubectl describe cronjob cleanup-runner', purpose: 'Verify the updated CronJob configuration.' },
    ],
    values: [
      { value: '61 * * * *', meaning: 'The intentionally invalid schedule in the broken scenario.' },
      { value: '*/5 * * * *', meaning: 'The corrected schedule for the mission.' },
      { value: 'suspend: true', meaning: 'The object is paused in the broken state.' },
    ],
    glossary: [
      { term: 'CronJob', definition: 'A controller that creates Jobs on a repeating schedule.' },
      { term: 'schedule', definition: 'A cron-formatted string that determines when the Job should run.' },
      { term: 'suspend', definition: 'A flag that pauses future Job creation until set back to false.' },
    ],
    fieldGuide: [
      { field: 'spec.schedule', explanation: 'The schedule string starts off wrong in this mission.' },
      { field: 'spec.suspend', explanation: 'The CronJob is also paused until you unset the suspension.' },
      { field: 'status.lastScheduleTime', explanation: 'This field would update after real scheduled execution, but the simulator grades config correctness here.' },
    ],
    tutorial: tutorial(
      'Inspect the CronJob YAML to see both the invalid schedule and the suspend flag.',
      'Patch the CronJob with the intended cadence and `suspend: false`.',
      'Describe the object again so you verify the schedule fields are correct before grading.',
    ),
    feedback: {
      startTitle: 'CronJob lab active',
      startBody: 'The CronJob will not run on the intended cadence because its schedule and suspend state are wrong.',
      failTitle: 'CronJob still misconfigured',
      failBody: 'The schedule or suspend state still does not match the mission target.',
      repairTitle: 'CronJob repair recorded',
      repairBody: 'The simulator saw a CronJob configuration change.',
      passTitle: 'CronJob corrected',
      passBody: 'The schedule and suspend state now match the mission requirements.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'batch',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: CronJob schedule correction'],
      startLines: ['Scenario injected for cronjob/cleanup-runner.', 'Inspect schedule and suspend state together.'],
      inspectors: [
        inspector(
          ['kubectl get cronjob cleanup-runner'],
          'Inspect CronJob summary.',
          ['NAME             SCHEDULE    SUSPEND   ACTIVE', 'cleanup-runner   61 * * * * true      0'],
          ['NAME             SCHEDULE      SUSPEND   ACTIVE', 'cleanup-runner   */5 * * * *  false     0'],
        ),
        inspector(
          ['kubectl get cronjob cleanup-runner -o yaml'],
          'Inspect CronJob YAML.',
          ['spec:', '  schedule: 61 * * * *', '  suspend: true'],
          ['spec:', '  schedule: */5 * * * *', '  suspend: false'],
        ),
        inspector(
          ['kubectl describe cronjob cleanup-runner'],
          'Inspect CronJob configuration.',
          ['Schedule: 61 * * * *', 'Suspend: True'],
          ['Schedule: */5 * * * *', 'Suspend: False'],
        ),
      ],
      actions: [
        action('patch-cronjob', 'Patch the CronJob schedule and suspend state', ['kubectl patch cronjob cleanup-runner -p {"spec":{"schedule":"*/5 * * * *","suspend":false}}'], 'Repair the schedule and unpause the object.', ['cronjob.batch/cleanup-runner patched']),
      ],
      successCriteria: ['cronjob/cleanup-runner schedule is */5 * * * *', 'cronjob/cleanup-runner suspend is false'],
    },
  }),
  mission({
    id: 'network-policy',
    title: 'NetworkPolicy access restore',
    difficulty: 'Advanced',
    learningGoal: 'Repair ingress access by applying the intended allow policy.',
    description: 'Fix a policy that currently blocks traffic from the frontend namespace.',
    docsUrl: 'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
    tooltip: 'Practice policy reasoning with allowed and denied traffic paths.',
    whyItMatters:
      'NetworkPolicy failures can look like application downtime even when Pods and Services are healthy.',
    commonMistakes: [
      'Checking the Service but not the network policy source.',
      'Allowing the wrong namespace or pod label.',
      'Assuming “deny all” symptoms mean the app itself is broken.',
    ],
    quickGuide: [
      'Inspect the policy and denial symptom.',
      'Apply the intended allow policy.',
      'Verify traffic is allowed from the frontend path.',
    ],
    hints: [
      'Frontend traffic should be allowed from namespace `shop-frontend`.',
      'Use `kubectl describe networkpolicy orders-allow-web`.',
      'The broken state behaves like a default deny for the desired client.',
    ],
    commands: [
      { command: 'kubectl describe networkpolicy orders-allow-web', purpose: 'Inspect the current ingress rules.' },
      { command: 'kubectl get networkpolicy orders-allow-web -o yaml', purpose: 'See the broken policy selectors.' },
      { command: 'kubectl apply -f allow-orders-from-frontend.yaml', purpose: 'Apply the intended ingress allow policy in the simulator.' },
      { command: 'kubectl get networkpolicy orders-allow-web -o yaml', purpose: 'Verify that the correct namespace selector is present.' },
    ],
    values: [
      { value: 'shop-fronted', meaning: 'The misspelled namespace label in the broken policy.' },
      { value: 'shop-frontend', meaning: 'The namespace label that should be allowed.' },
      { value: 'Ingress', meaning: 'The policy direction used in this mission.' },
    ],
    glossary: [
      { term: 'NetworkPolicy', definition: 'A Kubernetes resource that controls which traffic is allowed to Pods.' },
      { term: 'Namespace selector', definition: 'A label selector used to match source or destination namespaces in a policy.' },
      { term: 'Ingress rule', definition: 'A rule that controls traffic entering selected Pods.' },
    ],
    fieldGuide: [
      { field: 'spec.ingress[].from[].namespaceSelector', explanation: 'The namespace match is wrong in the broken policy.' },
      { field: 'spec.policyTypes', explanation: 'This mission only concerns ingress policy behavior.' },
      { field: 'spec.podSelector', explanation: 'The target workload selector is already correct.' },
    ],
    tutorial: tutorial(
      'Inspect the NetworkPolicy object first so you understand which traffic source is being matched incorrectly.',
      'Apply the allow policy that targets `shop-frontend` instead of the misspelled label.',
      'Read the policy YAML again so you confirm the namespace selector now reflects the intended access path.',
    ),
    feedback: {
      startTitle: 'Network policy lab active',
      startBody: 'Traffic is blocked because the allow policy points at the wrong namespace label.',
      failTitle: 'Traffic still blocked',
      failBody: 'The simulated policy still does not allow the intended frontend namespace.',
      repairTitle: 'Policy repair recorded',
      repairBody: 'The simulator saw a NetworkPolicy change.',
      passTitle: 'Access restored',
      passBody: 'The NetworkPolicy now allows the intended frontend namespace.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'orders',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: NetworkPolicy access restore'],
      startLines: ['Scenario injected for networkpolicy/orders-allow-web.', 'Treat this like a routing problem at the policy layer.'],
      inspectors: [
        inspector(
          ['kubectl describe networkpolicy orders-allow-web'],
          'Inspect policy details.',
          ['Ingress rules allow namespace label team=shop-fronted', 'Result: frontend requests are denied'],
          ['Ingress rules allow namespace label team=shop-frontend', 'Result: frontend requests are allowed'],
        ),
        inspector(
          ['kubectl get networkpolicy orders-allow-web -o yaml'],
          'Inspect policy YAML.',
          ['spec:', '  ingress:', '  - from:', '    - namespaceSelector:', '        matchLabels:', '          team: shop-fronted'],
          ['spec:', '  ingress:', '  - from:', '    - namespaceSelector:', '        matchLabels:', '          team: shop-frontend'],
        ),
      ],
      actions: [
        action('apply-policy', 'Apply the corrected allow policy', ['kubectl apply -f allow-orders-from-frontend.yaml'], 'Replace the broken namespace selector with the intended one.', ['networkpolicy.networking.k8s.io/orders-allow-web configured']),
      ],
      successCriteria: ['networkpolicy/orders-allow-web allows namespace team=shop-frontend'],
    },
  }),
  mission({
    id: 'resource-requests',
    title: 'Resource request tuning',
    difficulty: 'Advanced',
    learningGoal: 'Fix unschedulable Pods by reducing an excessive CPU request.',
    description: 'Repair a Deployment that requests more CPU than the cluster can provide.',
    docsUrl: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
    tooltip: 'Practice reading scheduler resource errors instead of only placement labels.',
    whyItMatters:
      'Resource requests directly affect scheduling, so unrealistic values can block workloads even when everything else looks correct.',
    commonMistakes: [
      'Looking for node label problems when the scheduler is actually reporting insufficient resources.',
      'Editing limits when the request is the blocking field.',
      'Forgetting that a Deployment-level fix must propagate through rollout health.',
    ],
    quickGuide: [
      'Inspect the scheduler event and CPU request.',
      'Patch the request down to a realistic value.',
      'Verify the Pods schedule and become available.',
    ],
    hints: [
      'The request is currently 8 CPU on a small lab cluster.',
      'Use `kubectl describe deployment reporting-api`.',
      'The repaired request should be 250m in this mission.',
    ],
    commands: [
      { command: 'kubectl get deployment reporting-api', purpose: 'Inspect availability and rollout state.' },
      { command: 'kubectl describe deployment reporting-api', purpose: 'See the insufficient CPU scheduling clue.' },
      { command: 'kubectl patch deployment reporting-api -p {"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"requests":{"cpu":"250m"}}}]}}}}', purpose: 'Reduce the CPU request to a schedulable value.' },
      { command: 'kubectl rollout status deployment/reporting-api', purpose: 'Verify the Deployment becomes available.' },
    ],
    values: [
      { value: '8', meaning: 'The excessive CPU request in whole cores.' },
      { value: '250m', meaning: 'The corrected CPU request for this lab.' },
      { value: 'Insufficient cpu', meaning: 'The scheduler event pointing at the real root cause.' },
    ],
    glossary: [
      { term: 'Resource request', definition: 'The amount of CPU or memory the scheduler guarantees for a container.' },
      { term: 'mCPU', definition: 'A millicore unit commonly used for CPU requests such as 250m.' },
      { term: 'Unschedulable', definition: 'A state where the scheduler cannot place the workload on any node.' },
    ],
    fieldGuide: [
      { field: 'spec.template.spec.containers[0].resources.requests.cpu', explanation: 'The broken field is the CPU request.' },
      { field: 'status.conditions', explanation: 'Scheduler messages point at insufficient CPU instead of label mismatches.' },
      { field: 'status.availableReplicas', explanation: 'The Deployment should become available after the request is fixed.' },
    ],
    tutorial: tutorial(
      'Use describe output to confirm the scheduler says `Insufficient cpu` before patching anything else.',
      'Patch the Deployment request to `250m` so the workload fits the lab cluster.',
      'Watch rollout status and grade only after the Deployment becomes available.',
    ),
    feedback: {
      startTitle: 'Resources lab active',
      startBody: 'The Deployment cannot schedule because its CPU request is too large for the cluster.',
      failTitle: 'Request still unschedulable',
      failBody: 'The simulated scheduler still sees an excessive CPU request.',
      repairTitle: 'Resource tuning recorded',
      repairBody: 'The simulator saw a resource request change.',
      passTitle: 'Deployment schedulable',
      passBody: 'The corrected CPU request allows the Deployment to become available.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'capacity',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Resource request tuning'],
      startLines: ['Scenario injected for deployment/reporting-api.', 'Look for scheduler resource errors instead of label issues.'],
      inspectors: [
        inspector(
          ['kubectl get deployment reporting-api'],
          'Inspect Deployment availability.',
          ['NAME            READY   UP-TO-DATE   AVAILABLE', 'reporting-api   0/2     2            0'],
          ['NAME            READY   UP-TO-DATE   AVAILABLE', 'reporting-api   2/2     2            2'],
        ),
        inspector(
          ['kubectl describe deployment reporting-api'],
          'Inspect scheduler resource clue.',
          ['Requests: cpu: 8', 'Events: 0/2 nodes are available: Insufficient cpu'],
          ['Requests: cpu: 250m', 'Events: deployment has minimum availability'],
        ),
        inspector(
          ['kubectl rollout status deployment/reporting-api'],
          'Inspect rollout convergence.',
          ['Waiting for deployment "reporting-api" rollout to finish: 0 of 2 updated replicas are available...'],
          ['deployment "reporting-api" successfully rolled out'],
        ),
      ],
      actions: [
        action('patch-requests', 'Patch the CPU request', ['kubectl patch deployment reporting-api -p {"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"requests":{"cpu":"250m"}}}]}}}}'], 'Reduce the request to a schedulable value.', ['deployment.apps/reporting-api patched']),
        action('rollout-status', 'Confirm Deployment availability', ['kubectl rollout status deployment/reporting-api'], 'Verify the Pods schedule successfully.', ['deployment "reporting-api" successfully rolled out']),
      ],
      successCriteria: ['deployment/reporting-api requests cpu=250m', 'deployment/reporting-api is available'],
    },
  }),
  mission({
    id: 'serviceaccount-rbac',
    title: 'ServiceAccount binding repair',
    difficulty: 'Advanced',
    learningGoal: 'Restore workload access by binding the right ServiceAccount to the right Role.',
    description: 'Fix access for a controller Pod that runs under a limited ServiceAccount.',
    docsUrl: 'https://kubernetes.io/docs/concepts/security/service-accounts/',
    tooltip: 'Practice the connection between workload identity and RBAC binding.',
    whyItMatters:
      'When a workload cannot call the API, the issue may be its ServiceAccount identity rather than its code.',
    commonMistakes: [
      'Creating a binding for the wrong namespace or subject.',
      'Changing the Deployment image when the API permission is the real problem.',
      'Testing permissions as yourself instead of as the workload identity.',
    ],
    quickGuide: [
      'Inspect the workload identity and permission test.',
      'Create the missing RoleBinding.',
      'Re-test API access as the ServiceAccount.',
    ],
    hints: [
      'The ServiceAccount is `deployer` in namespace `rbac-lab`.',
      'The workload needs list access on ConfigMaps.',
      'Use `kubectl auth can-i list configmaps --as=system:serviceaccount:rbac-lab:deployer -n rbac-lab`.',
    ],
    commands: [
      { command: 'kubectl describe deployment releaser', purpose: 'Inspect the ServiceAccount used by the workload.' },
      { command: 'kubectl auth can-i list configmaps --as=system:serviceaccount:rbac-lab:deployer -n rbac-lab', purpose: 'Test the workload identity directly.' },
      { command: 'kubectl create rolebinding config-reader --role=configmap-reader --serviceaccount=rbac-lab:deployer -n rbac-lab', purpose: 'Bind the ServiceAccount to the correct Role.' },
      { command: 'kubectl auth can-i list configmaps --as=system:serviceaccount:rbac-lab:deployer -n rbac-lab', purpose: 'Verify the ServiceAccount can now access ConfigMaps.' },
    ],
    values: [
      { value: 'deployer', meaning: 'The ServiceAccount used by the target Deployment.' },
      { value: 'configmap-reader', meaning: 'The Role that should be bound to the workload identity.' },
      { value: 'yes', meaning: 'The permission test passes after the binding is created.' },
    ],
    glossary: [
      { term: 'ServiceAccount', definition: 'The identity a Pod uses when talking to the Kubernetes API.' },
      { term: 'RoleBinding', definition: 'The object that attaches a Role to a ServiceAccount.' },
      { term: 'auth can-i', definition: 'A kubectl check that answers whether an identity may perform a given action.' },
    ],
    fieldGuide: [
      { field: 'spec.template.spec.serviceAccountName', explanation: 'This shows which identity the Deployment already uses.' },
      { field: 'subjects[].name', explanation: 'The RoleBinding must name the `deployer` ServiceAccount.' },
      { field: 'roleRef.name', explanation: 'The binding must target the configmap-reader Role.' },
    ],
    tutorial: tutorial(
      'Inspect the Deployment and the `auth can-i` result so you prove the issue is identity-based.',
      'Create the RoleBinding for the `deployer` ServiceAccount against the configmap-reader Role.',
      'Re-run the authorization check as that ServiceAccount before grading the mission.',
    ),
    feedback: {
      startTitle: 'ServiceAccount lab active',
      startBody: 'The workload identity lacks the RoleBinding it needs to list ConfigMaps.',
      failTitle: 'Workload still unauthorized',
      failBody: 'The target ServiceAccount still cannot list ConfigMaps in its namespace.',
      repairTitle: 'Binding repair recorded',
      repairBody: 'The simulator saw a ServiceAccount-related binding change.',
      passTitle: 'Workload access restored',
      passBody: 'The ServiceAccount can now perform the required API action.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'rbac-lab',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: ServiceAccount binding repair'],
      startLines: ['Scenario injected for deployment/releaser.', 'Investigate the workload identity before changing anything else.'],
      inspectors: [
        inspector(
          ['kubectl describe deployment releaser'],
          'Inspect the Deployment identity.',
          ['Service Account: deployer', 'Events: API request forbidden when listing configmaps'],
          ['Service Account: deployer', 'Events: deployment has minimum availability'],
        ),
        inspector(
          ['kubectl auth can-i list configmaps --as=system:serviceaccount:rbac-lab:deployer -n rbac-lab'],
          'Test ServiceAccount permission.',
          ['no'],
          ['yes'],
        ),
      ],
      actions: [
        action('create-binding', 'Create the ServiceAccount RoleBinding', ['kubectl create rolebinding config-reader --role=configmap-reader --serviceaccount=rbac-lab:deployer -n rbac-lab'], 'Grant the workload identity the needed read access.', ['rolebinding.rbac.authorization.k8s.io/config-reader created']),
      ],
      successCriteria: ['serviceaccount/deployer can list configmaps in rbac-lab'],
    },
  }),
  mission({
    id: 'daemonset-image',
    title: 'DaemonSet image repair',
    difficulty: 'Advanced',
    learningGoal: 'Repair a DaemonSet image and confirm all nodes run healthy Pods.',
    description: 'Use DaemonSet-aware commands to fix a broken logging agent rollout.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/',
    tooltip: 'Practice host-wide controller health instead of single-Pod repair.',
    whyItMatters:
      'DaemonSets are common for agents, so cluster-wide failures need a controller-level repair mindset.',
    commonMistakes: [
      'Fixing one Pod instead of the DaemonSet template.',
      'Forgetting to verify that every desired node is updated.',
      'Using Deployment commands for a DaemonSet-specific problem.',
    ],
    quickGuide: [
      'Inspect the DaemonSet summary.',
      'Repair the image in the template.',
      'Check that desired and available counts align.',
    ],
    hints: [
      'The broken image is `fluent-bit:bad`.',
      'Use `kubectl get daemonset node-logger`.',
      'The pass signal is full DaemonSet availability across nodes.',
    ],
    commands: [
      { command: 'kubectl get daemonset node-logger', purpose: 'Inspect desired versus available pods.' },
      { command: 'kubectl describe daemonset node-logger', purpose: 'Read the failing image clue.' },
      { command: 'kubectl set image daemonset/node-logger logger=fluent-bit:2.2', purpose: 'Repair the DaemonSet image.' },
      { command: 'kubectl rollout status daemonset/node-logger', purpose: 'Verify all DaemonSet Pods are updated.' },
    ],
    values: [
      { value: '0/2', meaning: 'No desired nodes are running the healthy DaemonSet Pod yet.' },
      { value: '2/2', meaning: 'Every target node runs the healthy agent.' },
      { value: 'fluent-bit:bad', meaning: 'The broken image value in the initial DaemonSet.' },
    ],
    glossary: [
      { term: 'DaemonSet', definition: 'A controller that ensures a Pod runs on each eligible node.' },
      { term: 'Desired number scheduled', definition: 'How many nodes the controller expects to run the Pod on.' },
      { term: 'Number available', definition: 'How many DaemonSet Pods are actually healthy and ready.' },
    ],
    fieldGuide: [
      { field: 'spec.template.spec.containers[0].image', explanation: 'The template image is the root cause here.' },
      { field: 'status.numberAvailable', explanation: 'The mission passes when the available count matches the desired count.' },
      { field: 'status.updatedNumberScheduled', explanation: 'A full update confirms the new template rolled out.' },
    ],
    tutorial: tutorial(
      'Inspect the DaemonSet summary first so you focus on cluster-wide controller health instead of one Pod.',
      'Set the DaemonSet image to `fluent-bit:2.2` on the template.',
      'Run rollout status and confirm all nodes are covered before grading.',
    ),
    feedback: {
      startTitle: 'DaemonSet lab active',
      startBody: 'The logging DaemonSet cannot become healthy because its image is invalid.',
      failTitle: 'DaemonSet still unhealthy',
      failBody: 'The DaemonSet has not reached full healthy coverage across its target nodes.',
      repairTitle: 'DaemonSet repair recorded',
      repairBody: 'The simulator saw a DaemonSet template change.',
      passTitle: 'DaemonSet recovered',
      passBody: 'The DaemonSet now uses the correct image and reports full healthy coverage.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'node-agents',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: DaemonSet image repair'],
      startLines: ['Scenario injected for daemonset/node-logger.', 'Repair the controller template, not one individual Pod.'],
      inspectors: [
        inspector(
          ['kubectl get daemonset node-logger'],
          'Inspect DaemonSet coverage.',
          ['NAME         DESIRED   CURRENT   READY   AVAILABLE', 'node-logger  2         2         0       0'],
          ['NAME         DESIRED   CURRENT   READY   AVAILABLE', 'node-logger  2         2         2       2'],
        ),
        inspector(
          ['kubectl describe daemonset node-logger'],
          'Inspect image clue.',
          ['Image: fluent-bit:bad', 'Events: Failed to pull image "fluent-bit:bad"'],
          ['Image: fluent-bit:2.2', 'Events: Rolling update completed'],
        ),
        inspector(
          ['kubectl rollout status daemonset/node-logger'],
          'Inspect DaemonSet rollout.',
          ['Waiting for daemon set "node-logger" rollout to finish: 0 of 2 updated pods are available...'],
          ['daemon set "node-logger" successfully rolled out'],
        ),
      ],
      actions: [
        action('set-image', 'Update the DaemonSet image', ['kubectl set image daemonset/node-logger logger=fluent-bit:2.2'], 'Repair the node agent image.', ['daemonset.apps/node-logger image updated']),
        action('rollout-status', 'Confirm DaemonSet rollout', ['kubectl rollout status daemonset/node-logger'], 'Verify every node runs the updated agent.', ['daemon set "node-logger" successfully rolled out']),
      ],
      successCriteria: ['daemonset/node-logger image is fluent-bit:2.2', 'daemonset/node-logger is fully available'],
    },
  }),
  mission({
    id: 'statefulset-service',
    title: 'StatefulSet service wiring',
    difficulty: 'Advanced',
    learningGoal: 'Repair a StatefulSet that references the wrong headless Service name.',
    description: 'Fix the governing service reference so the StatefulSet uses the intended network identity.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/',
    tooltip: 'Practice StatefulSet networking assumptions and naming.',
    whyItMatters:
      'StatefulSets rely on stable network identity, so the serviceName field is more operationally important than it first appears.',
    commonMistakes: [
      'Fixing Pods manually instead of the StatefulSet spec.',
      'Ignoring the serviceName field because the Pods exist.',
      'Treating StatefulSets exactly like Deployments when network identity matters.',
    ],
    quickGuide: [
      'Inspect the StatefulSet service reference.',
      'Patch the governing service name.',
      'Verify the StatefulSet becomes ready.',
    ],
    hints: [
      'The correct headless Service is `db-headless`.',
      'The broken spec points at `db-healdess`.',
      'Use `kubectl get statefulset accounts-db -o yaml`.',
    ],
    commands: [
      { command: 'kubectl get statefulset accounts-db', purpose: 'Inspect readiness and replica status.' },
      { command: 'kubectl get statefulset accounts-db -o yaml', purpose: 'See the broken serviceName field.' },
      { command: 'kubectl patch statefulset accounts-db -p {"spec":{"serviceName":"db-headless"}}', purpose: 'Repair the governing headless Service reference.' },
      { command: 'kubectl rollout status statefulset/accounts-db', purpose: 'Verify the StatefulSet becomes ready.' },
    ],
    values: [
      { value: 'db-healdess', meaning: 'The misspelled governing service name.' },
      { value: 'db-headless', meaning: 'The correct headless Service for stable identity.' },
      { value: 'Ready=0/2', meaning: 'The StatefulSet is not healthy in the broken scenario.' },
    ],
    glossary: [
      { term: 'StatefulSet', definition: 'A controller for stateful workloads with stable network identities and ordinals.' },
      { term: 'Headless Service', definition: 'A Service without a cluster IP often used to expose stable Pod DNS records.' },
      { term: 'serviceName', definition: 'The StatefulSet field that ties Pods to their governing service DNS identity.' },
    ],
    fieldGuide: [
      { field: 'spec.serviceName', explanation: 'The mission is broken at the governing service reference.' },
      { field: 'status.readyReplicas', explanation: 'The StatefulSet should become fully ready after the fix.' },
      { field: 'spec.replicas', explanation: 'Replica count is already correct and is not the issue here.' },
    ],
    tutorial: tutorial(
      'Inspect the StatefulSet YAML so you spot the misspelled `serviceName` field rather than chasing one Pod.',
      'Patch the serviceName to `db-headless` so the controller uses the right governing service.',
      'Check rollout status and grade only after the StatefulSet reports healthy replicas.',
    ),
    feedback: {
      startTitle: 'StatefulSet lab active',
      startBody: 'The StatefulSet references the wrong headless Service name for its stable identity.',
      failTitle: 'StatefulSet still miswired',
      failBody: 'The governing service reference or readiness state is still wrong.',
      repairTitle: 'StatefulSet repair recorded',
      repairBody: 'The simulator saw a StatefulSet serviceName change.',
      passTitle: 'StatefulSet wired correctly',
      passBody: 'The StatefulSet now points at the correct headless Service and reports healthy replicas.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'datastores',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: StatefulSet service wiring'],
      startLines: ['Scenario injected for statefulset/accounts-db.', 'Inspect the StatefulSet spec before changing any Services.'],
      inspectors: [
        inspector(
          ['kubectl get statefulset accounts-db'],
          'Inspect StatefulSet readiness.',
          ['NAME         READY   AGE', 'accounts-db  0/2     6m'],
          ['NAME         READY   AGE', 'accounts-db  2/2     6m'],
        ),
        inspector(
          ['kubectl get statefulset accounts-db -o yaml'],
          'Inspect serviceName wiring.',
          ['spec:', '  serviceName: db-healdess'],
          ['spec:', '  serviceName: db-headless'],
        ),
        inspector(
          ['kubectl rollout status statefulset/accounts-db'],
          'Inspect StatefulSet rollout.',
          ['Waiting for statefulset rolling update to complete 0 pods at revision...'],
          ['statefulset rolling update complete 2 pods at revision accounts-db-7c4b8'],
        ),
      ],
      actions: [
        action('patch-service-name', 'Patch the StatefulSet serviceName', ['kubectl patch statefulset accounts-db -p {"spec":{"serviceName":"db-headless"}}'], 'Repair the governing headless Service reference.', ['statefulset.apps/accounts-db patched']),
        action('rollout-status', 'Confirm StatefulSet readiness', ['kubectl rollout status statefulset/accounts-db'], 'Verify the controller reaches ready replicas.', ['statefulset rolling update complete 2 pods at revision accounts-db-7c4b8']),
      ],
      successCriteria: ['statefulset/accounts-db serviceName is db-headless', 'statefulset/accounts-db reports ready replicas'],
    },
  }),
  mission({
    id: 'label-selector-repair',
    title: 'Label selector repair',
    difficulty: 'Foundation',
    learningGoal: 'Repair mismatched labels and selectors so a controller can manage the intended Pods.',
    description: 'Use labels and selector logic from the object model docs to restore a ReplicaSet match.',
    docsUrl: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/',
    tooltip: 'Practice equality-based selectors and matching labels across objects.',
    whyItMatters:
      'Labels and selectors are a core grouping primitive in Kubernetes, and small mismatches can break controller ownership and service targeting.',
    commonMistakes: [
      'Changing the controller selector instead of fixing the Pod labels it expects.',
      'Forgetting that selector requirements must all match at the same time.',
      'Looking only at a Pod list without checking the actual label keys and values.',
    ],
    quickGuide: [
      'Inspect the ReplicaSet selector and the current Pod labels.',
      'Patch the Pod label to satisfy the selector.',
      'Verify the ReplicaSet sees the intended Pod.',
    ],
    hints: [
      'The selector expects `tier=frontend`.',
      'The Pod currently uses `tier=front-end`.',
      'Start with `kubectl get pods --show-labels` and compare against the controller selector.',
    ],
    commands: [
      { command: 'kubectl get pods --show-labels', purpose: 'Inspect the current label set on the Pods.' },
      { command: 'kubectl describe replicaset ui-rs', purpose: 'Read the selector the controller expects.' },
      { command: 'kubectl label pod ui-pod tier=frontend --overwrite', purpose: 'Repair the label so it matches the ReplicaSet selector.' },
      { command: 'kubectl get pods -l tier=frontend', purpose: 'Verify the repaired label now satisfies the selector.' },
    ],
    values: [
      { value: 'tier=front-end', meaning: 'The broken label value on the Pod.' },
      { value: 'tier=frontend', meaning: 'The selector value required by the ReplicaSet.' },
      { value: 'equality-based selector', meaning: 'The style of selector this mission focuses on.' },
    ],
    glossary: [
      { term: 'Label', definition: 'A key/value pair attached to an object for grouping and selection.' },
      { term: 'Selector', definition: 'A query that matches objects by labels.' },
      { term: 'ReplicaSet', definition: 'A controller that ensures a specified number of Pod replicas exist.' },
    ],
    fieldGuide: [
      { field: 'metadata.labels', explanation: 'The Pod label value is the broken part of this mission.' },
      { field: 'spec.selector', explanation: 'The ReplicaSet selector is already correct and should not be changed.' },
      { field: 'status.readyReplicas', explanation: 'The controller is only healthy once the selector matches a Pod.' },
    ],
    tutorial: tutorial(
      'Inspect the Pod labels and the ReplicaSet selector side by side so you can see the mismatch clearly.',
      'Patch the Pod label to `tier=frontend`, which is the exact value required by the controller.',
      'Use a label-filtered `kubectl get` to confirm the selector now matches the target Pod.',
    ),
    feedback: {
      startTitle: 'Labels lab active',
      startBody: 'The controller selector and Pod labels do not currently match.',
      failTitle: 'Selector still mismatched',
      failBody: 'The controller still cannot match the intended Pod by label.',
      repairTitle: 'Label repair recorded',
      repairBody: 'The simulator saw a label change that affects selector matching.',
      passTitle: 'Selector restored',
      passBody: 'The Pod label now matches the controller selector and the grouping logic is healthy again.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'objects',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Label selector repair'],
      startLines: ['Scenario injected for replicaset/ui-rs and pod/ui-pod.', 'Compare the controller selector against the Pod labels.'],
      inspectors: [
        inspector(
          ['kubectl get pods --show-labels'],
          'Inspect the current Pod labels.',
          ['NAME     READY   STATUS    LABELS', 'ui-pod   1/1     Running   app=ui,tier=front-end'],
          ['NAME     READY   STATUS    LABELS', 'ui-pod   1/1     Running   app=ui,tier=frontend'],
        ),
        inspector(
          ['kubectl describe replicaset ui-rs'],
          'Inspect the controller selector.',
          ['Selector: app=ui,tier=frontend', 'Replicas: 0 current / 1 desired'],
          ['Selector: app=ui,tier=frontend', 'Replicas: 1 current / 1 desired'],
        ),
        inspector(
          ['kubectl get pods -l tier=frontend'],
          'Inspect selector results.',
          ['No resources found in objects namespace.'],
          ['NAME     READY   STATUS', 'ui-pod   1/1     Running'],
        ),
      ],
      actions: [
        action('fix-label', 'Patch the Pod tier label', ['kubectl label pod ui-pod tier=frontend --overwrite'], 'Repair the label so the selector matches.', ['pod/ui-pod labeled']),
      ],
      successCriteria: ['pod/ui-pod has label tier=frontend', 'replicaset/ui-rs selector matches one ready Pod'],
    },
  }),
  mission({
    id: 'cross-namespace-service',
    title: 'Cross-namespace service lookup',
    difficulty: 'Foundation',
    learningGoal: 'Learn namespace-scoped DNS and service naming by fixing a cross-namespace lookup.',
    description: 'Repair a lookup workflow by querying a Service with the correct namespace-qualified name.',
    docsUrl: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/',
    tooltip: 'Practice namespace scoping and why short names only resolve locally.',
    whyItMatters:
      'Namespaces scope resource visibility and DNS lookups, so a Service that exists can still look broken from the wrong namespace.',
    commonMistakes: [
      'Assuming a short service name will resolve across namespaces.',
      'Trying to rebuild the Service instead of fixing the lookup target.',
      'Ignoring the pod namespace when reasoning about DNS behavior.',
    ],
    quickGuide: [
      'Confirm the caller Pod namespace and target Service namespace.',
      'Use the service name with its namespace qualifier.',
      'Verify the namespace-qualified DNS name resolves correctly.',
    ],
    hints: [
      'The caller Pod is in `test`, but the Service is in `prod`.',
      'A short query for `data` only searches the Pod namespace first.',
      'Try `data.prod` instead of just `data`.',
    ],
    commands: [
      { command: 'kubectl get service data -n prod', purpose: 'Confirm the Service exists in the target namespace.' },
      { command: 'kubectl describe pod dns-client -n test', purpose: 'Inspect the caller Pod namespace and DNS context.' },
      { command: 'kubectl exec -n test dns-client -- nslookup data.prod', purpose: 'Query the Service with a namespace-qualified name.' },
      { command: 'kubectl exec -n test dns-client -- nslookup data.prod.svc.cluster.local', purpose: 'Verify the full cluster DNS name also resolves.' },
    ],
    values: [
      { value: 'test', meaning: 'The namespace where the client Pod runs.' },
      { value: 'prod', meaning: 'The namespace where the target Service exists.' },
      { value: 'data.prod', meaning: 'The corrected namespace-qualified lookup target.' },
    ],
    glossary: [
      { term: 'Namespace', definition: 'A scope boundary for most Kubernetes resources.' },
      { term: 'FQDN', definition: 'A fully qualified domain name such as service.namespace.svc.cluster.local.' },
      { term: 'DNS search path', definition: 'The namespace- and cluster-aware suffix list used for Pod name resolution.' },
    ],
    fieldGuide: [
      { field: 'metadata.namespace', explanation: 'The caller and the Service live in different namespaces.' },
      { field: 'spec.dnsPolicy', explanation: 'Normal cluster DNS behavior expands short names relative to the Pod namespace.' },
      { field: 'service.namespace.svc.cluster.local', explanation: 'This naming pattern is the key concept in the fix.' },
    ],
    tutorial: tutorial(
      'Inspect where the client Pod runs and where the Service actually exists before assuming the Service is missing.',
      'Use `data.prod` or the full service FQDN so the lookup targets the correct namespace.',
      'Run nslookup again and verify the namespace-qualified query resolves successfully.',
    ),
    feedback: {
      startTitle: 'Namespace DNS lab active',
      startBody: 'The lookup is failing because the caller uses the wrong namespace scope for DNS resolution.',
      failTitle: 'Lookup still scoped incorrectly',
      failBody: 'The simulated client is still querying the Service without the namespace-aware DNS name.',
      repairTitle: 'Namespace-aware lookup recorded',
      repairBody: 'The simulator saw a namespace-qualified DNS query.',
      passTitle: 'Cross-namespace lookup fixed',
      passBody: 'The Service lookup now uses the correct namespace-qualified DNS name.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'test',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Cross-namespace service lookup'],
      startLines: ['Scenario injected for pod/dns-client in namespace test.', 'Think about namespace scope before assuming the Service is missing.'],
      inspectors: [
        inspector(
          ['kubectl get service data -n prod'],
          'Confirm the target Service exists.',
          ['NAME   TYPE        CLUSTER-IP   PORT(S)', 'data   ClusterIP   10.96.0.88   80/TCP'],
          ['NAME   TYPE        CLUSTER-IP   PORT(S)', 'data   ClusterIP   10.96.0.88   80/TCP'],
        ),
        inspector(
          ['kubectl describe pod dns-client -n test'],
          'Inspect the client Pod namespace context.',
          ['Namespace: test', 'DNS Policy: ClusterFirst'],
          ['Namespace: test', 'DNS Policy: ClusterFirst'],
        ),
        inspector(
          ['kubectl exec -n test dns-client -- nslookup data.prod'],
          'Query the namespace-qualified service name.',
          ['** server can not find data.prod: NXDOMAIN'],
          ['Name: data.prod.svc.cluster.local', 'Address: 10.96.0.88'],
          ['Name: data.prod.svc.cluster.local', 'Address: 10.96.0.88'],
        ),
        inspector(
          ['kubectl exec -n test dns-client -- nslookup data.prod.svc.cluster.local'],
          'Query the full service FQDN.',
          ['** server can not find data.prod.svc.cluster.local: NXDOMAIN'],
          ['Name: data.prod.svc.cluster.local', 'Address: 10.96.0.88'],
        ),
      ],
      actions: [
        action('use-qualified-dns', 'Use the namespace-qualified service DNS name', ['kubectl exec -n test dns-client -- nslookup data.prod'], 'Query the Service with namespace scope.', ['Server: 10.96.0.10', 'Name: data.prod.svc.cluster.local', 'Address: 10.96.0.88']),
      ],
      successCriteria: ['client lookup uses data.prod or full service FQDN', 'service resolution returns the prod namespace service IP'],
    },
  }),
  mission({
    id: 'finalizer-stuck-delete',
    title: 'Finalizer troubleshooting',
    difficulty: 'Advanced',
    learningGoal: 'Recognize a stuck terminating object caused by a finalizer and understand the cleanup implication.',
    description: 'Inspect a resource in Terminating and identify the finalizer that is blocking deletion.',
    docsUrl: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/',
    tooltip: 'Practice safe reasoning about finalizers instead of force-removing them blindly.',
    whyItMatters:
      'Finalizers are part of real deletion workflows, and the right move is often to understand the cleanup dependency before touching the object.',
    commonMistakes: [
      'Immediately removing a finalizer without understanding why it exists.',
      'Ignoring deletionTimestamp and looking only at STATUS output.',
      'Treating a stuck Terminating resource like a scheduler or image problem.',
    ],
    quickGuide: [
      'Inspect the object YAML and deletion timestamp.',
      'Identify the finalizer that is blocking deletion.',
      'Verify you understand the cleanup dependency the finalizer represents.',
    ],
    hints: [
      'The object is already marked for deletion.',
      'Look at `metadata.deletionTimestamp` and `metadata.finalizers`.',
      'The educational goal is understanding the blocker, not force-deleting the object.',
    ],
    commands: [
      { command: 'kubectl get pvc archive-data', purpose: 'Observe the Terminating state at a high level.' },
      { command: 'kubectl get pvc archive-data -o yaml', purpose: 'Inspect deletionTimestamp and finalizers directly.' },
      { command: 'kubectl describe pvc archive-data', purpose: 'Read the protection clue and why deletion is blocked.' },
      { command: 'kubectl get pod archive-reader -o yaml', purpose: 'Verify the dependent Pod still uses the volume.' },
    ],
    values: [
      { value: 'kubernetes.io/pvc-protection', meaning: 'The protection finalizer blocking deletion until usage is cleared.' },
      { value: 'deletionTimestamp', meaning: 'The marker showing that deletion has already been requested.' },
      { value: 'Terminating', meaning: 'The object is pending deletion but not yet removed.' },
    ],
    glossary: [
      { term: 'Finalizer', definition: 'A metadata key that delays deletion until cleanup conditions are satisfied.' },
      { term: 'deletionTimestamp', definition: 'The field showing when an object was marked for deletion.' },
      { term: 'PVC protection', definition: 'A built-in safety mechanism that prevents deleting in-use persistent storage.' },
    ],
    fieldGuide: [
      { field: 'metadata.finalizers', explanation: 'This field explains why the object remains in Terminating.' },
      { field: 'metadata.deletionTimestamp', explanation: 'This confirms deletion was requested already.' },
      { field: 'spec.volumes[].persistentVolumeClaim.claimName', explanation: 'A dependent Pod still references the PVC in this scenario.' },
    ],
    tutorial: tutorial(
      'Inspect the YAML and confirm that deletion has already been requested via deletionTimestamp.',
      'Identify the pvc-protection finalizer and connect it to the dependent Pod still using the claim.',
      'Use the mission as practice for safe reasoning: understand the cleanup path before considering forceful removal.',
    ),
    feedback: {
      startTitle: 'Finalizer lab active',
      startBody: 'A PVC is stuck in Terminating because a protection finalizer still applies.',
      failTitle: 'Root cause not identified yet',
      failBody: 'The simulated grader still needs evidence that you found the finalizer and its dependency.',
      repairTitle: 'Finalizer diagnosis recorded',
      repairBody: 'The simulator saw a finalizer-aware inspection step.',
      passTitle: 'Deletion blocker understood',
      passBody: 'You identified the finalizer and the dependent object keeping deletion from completing.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'storage',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Finalizer troubleshooting'],
      startLines: ['Scenario injected for pvc/archive-data.', 'This lab is about diagnosis and safe reasoning, not reckless force deletion.'],
      inspectors: [
        inspector(
          ['kubectl get pvc archive-data'],
          'Inspect the high-level PVC state.',
          ['NAME           STATUS        VOLUME        CAPACITY', 'archive-data   Terminating   pv-archive    20Gi'],
          ['NAME           STATUS        VOLUME        CAPACITY', 'archive-data   Terminating   pv-archive    20Gi'],
        ),
        inspector(
          ['kubectl get pvc archive-data -o yaml'],
          'Inspect the finalizer metadata.',
          [
            'metadata:',
            '  deletionTimestamp: "2026-03-24T05:00:00Z"',
            '  finalizers:',
            '  - kubernetes.io/pvc-protection',
          ],
          [
            'metadata:',
            '  deletionTimestamp: "2026-03-24T05:00:00Z"',
            '  finalizers:',
            '  - kubernetes.io/pvc-protection',
          ],
        ),
        inspector(
          ['kubectl describe pvc archive-data'],
          'Inspect the protection explanation.',
          ['Finalizers: [kubernetes.io/pvc-protection]', 'Message: PVC is still in use by pod archive-reader'],
          ['Finalizers: [kubernetes.io/pvc-protection]', 'Message: PVC is still in use by pod archive-reader'],
        ),
        inspector(
          ['kubectl get pod archive-reader -o yaml'],
          'Inspect the dependent Pod volume reference.',
          ['spec:', '  volumes:', '  - persistentVolumeClaim:', '      claimName: archive-data'],
          ['spec:', '  volumes:', '  - persistentVolumeClaim:', '      claimName: archive-data'],
        ),
      ],
      actions: [
        action('diagnose-finalizer', 'Identify the finalizer and dependency', ['kubectl describe pvc archive-data'], 'Understand what cleanup dependency is blocking deletion.', ['Diagnosis recorded: pvc-protection finalizer is blocking deletion while pod archive-reader still uses the claim.']),
      ],
      successCriteria: ['metadata.finalizers includes kubernetes.io/pvc-protection', 'dependent pod/archive-reader is identified as the deletion blocker'],
    },
  }),
  mission({
    id: 'endpointslice-readiness',
    title: 'EndpointSlice readiness review',
    difficulty: 'Advanced',
    learningGoal: 'Read EndpointSlice data to understand which backends are actually ready for Service traffic.',
    description: 'Inspect Service backend health using EndpointSlice conditions rather than only Service summaries.',
    docsUrl: 'https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/',
    tooltip: 'Practice reading ready, serving, and terminating conditions on service backends.',
    whyItMatters:
      'EndpointSlice is the source of truth for Service backends at scale, so it is a useful layer when networking symptoms are subtle.',
    commonMistakes: [
      'Checking only the Service object without reading backend readiness.',
      'Assuming every endpoint listed is actually ready for traffic.',
      'Ignoring the difference between ready and terminating states.',
    ],
    quickGuide: [
      'Inspect the Service and its EndpointSlices.',
      'Find which endpoint is not ready for traffic.',
      'Verify the ready backend after the simulated recovery.',
    ],
    hints: [
      'The key fields are `conditions.ready`, `serving`, and `terminating`.',
      'Use `kubectl get endpointslice -l kubernetes.io/service-name=checkout -o yaml`.',
      'One endpoint starts off not ready in this mission.',
    ],
    commands: [
      { command: 'kubectl get service checkout', purpose: 'Confirm the Service exists and identify its selector scope.' },
      { command: 'kubectl get endpointslice -l kubernetes.io/service-name=checkout -o yaml', purpose: 'Inspect endpoint readiness details.' },
      { command: 'kubectl describe endpointslice checkout-abc', purpose: 'Read the per-endpoint condition summary.' },
      { command: 'kubectl patch endpointslice checkout-abc --type=merge -p {"endpoints":[{"addresses":["10.244.1.9"],"conditions":{"ready":true,"serving":true,"terminating":false}}]}', purpose: 'Simulate the backend becoming ready.' },
    ],
    values: [
      { value: 'ready: false', meaning: 'The backend is not currently eligible for normal Service traffic.' },
      { value: 'serving: true', meaning: 'The endpoint is actively serving responses.' },
      { value: 'terminating: false', meaning: 'The endpoint is not in the middle of shutdown.' },
    ],
    glossary: [
      { term: 'EndpointSlice', definition: 'A scalable API resource that tracks Service backend endpoints.' },
      { term: 'ready', definition: 'A shortcut meaning the endpoint is serving and not terminating.' },
      { term: 'terminating', definition: 'A state indicating the endpoint is being removed.' },
    ],
    fieldGuide: [
      { field: 'endpoints[].conditions.ready', explanation: 'This is the primary signal for whether a backend is routable.' },
      { field: 'metadata.labels.kubernetes.io/service-name', explanation: 'This label connects the EndpointSlice to the Service.' },
      { field: 'endpoints[].nodeName', explanation: 'This can help locate the backend physically when debugging.' },
    ],
    tutorial: tutorial(
      'List the EndpointSlices for the Service so you debug the backend set rather than just the Service object.',
      'Read the endpoint conditions and identify the backend whose ready condition is false.',
      'Apply the simulated recovery and then re-check the EndpointSlice to confirm the endpoint is now ready.',
    ),
    feedback: {
      startTitle: 'EndpointSlice lab active',
      startBody: 'One backend endpoint is not yet ready for Service traffic.',
      failTitle: 'Backend readiness still incomplete',
      failBody: 'The simulated EndpointSlice still contains a backend that is not ready.',
      repairTitle: 'EndpointSlice recovery recorded',
      repairBody: 'The simulator saw an endpoint readiness update.',
      passTitle: 'Backend readiness restored',
      passBody: 'The EndpointSlice now reports a ready backend for the Service.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'networking',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: EndpointSlice readiness review'],
      startLines: ['Scenario injected for service/checkout and endpointslice/checkout-abc.', 'Inspect backend conditions instead of only the Service wrapper.'],
      inspectors: [
        inspector(
          ['kubectl get service checkout'],
          'Inspect the Service wrapper.',
          ['NAME       TYPE        CLUSTER-IP    PORT(S)', 'checkout   ClusterIP   10.96.0.71   80/TCP'],
          ['NAME       TYPE        CLUSTER-IP    PORT(S)', 'checkout   ClusterIP   10.96.0.71   80/TCP'],
        ),
        inspector(
          ['kubectl get endpointslice -l kubernetes.io/service-name=checkout -o yaml'],
          'Inspect endpoint readiness data.',
          [
            'endpoints:',
            '- addresses:',
            '  - 10.244.1.9',
            '  conditions:',
            '    ready: false',
            '    serving: false',
            '    terminating: false',
          ],
          [
            'endpoints:',
            '- addresses:',
            '  - 10.244.1.9',
            '  conditions:',
            '    ready: true',
            '    serving: true',
            '    terminating: false',
          ],
        ),
        inspector(
          ['kubectl describe endpointslice checkout-abc'],
          'Inspect EndpointSlice summary.',
          ['AddressType: IPv4', 'Endpoints: 10.244.1.9 ready=false serving=false terminating=false'],
          ['AddressType: IPv4', 'Endpoints: 10.244.1.9 ready=true serving=true terminating=false'],
        ),
      ],
      actions: [
        action('recover-endpoint', 'Mark the endpoint ready', ['kubectl patch endpointslice checkout-abc --type=merge -p {"endpoints":[{"addresses":["10.244.1.9"],"conditions":{"ready":true,"serving":true,"terminating":false}}]}'], 'Simulate a backend recovering to ready state.', ['endpointslice.discovery.k8s.io/checkout-abc patched']),
      ],
      successCriteria: ['endpointslice/checkout-abc reports ready=true for the backend endpoint'],
    },
  }),
  mission({
    id: 'pod-dns-policy',
    title: 'Pod DNS policy fix',
    difficulty: 'Advanced',
    learningGoal: 'Repair a hostNetwork Pod DNS policy so it uses cluster-aware resolution correctly.',
    description: 'Fix a Pod that should use ClusterFirstWithHostNet instead of inheriting node DNS behavior.',
    docsUrl: 'https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/',
    tooltip: 'Practice DNS policy details that affect hostNetwork workloads.',
    whyItMatters:
      'DNS behavior can change subtly with hostNetwork Pods, and the right policy matters if they still need cluster Service discovery.',
    commonMistakes: [
      'Assuming hostNetwork Pods can keep the default cluster-first behavior automatically.',
      'Debugging Service objects when the Pod DNS policy is the actual issue.',
      'Ignoring the hostNetwork note in the DNS docs.',
    ],
    quickGuide: [
      'Inspect the Pod DNS policy and network mode.',
      'Patch the policy to ClusterFirstWithHostNet.',
      'Verify the Pod can resolve cluster Services under the intended policy.',
    ],
    hints: [
      'The Pod uses `hostNetwork: true`.',
      'The correct policy is `ClusterFirstWithHostNet`.',
      'Use `kubectl get pod dns-proxy -o yaml` to inspect the spec.',
    ],
    commands: [
      { command: 'kubectl get pod dns-proxy -o yaml', purpose: 'Inspect hostNetwork and dnsPolicy together.' },
      { command: 'kubectl describe pod dns-proxy', purpose: 'Read the DNS policy clue for the hostNetwork Pod.' },
      { command: 'kubectl patch pod dns-proxy -p {"spec":{"dnsPolicy":"ClusterFirstWithHostNet"}}', purpose: 'Repair the DNS policy.' },
      { command: 'kubectl exec dns-proxy -- nslookup kubernetes.default', purpose: 'Verify Service discovery after the policy fix.' },
    ],
    values: [
      { value: 'hostNetwork: true', meaning: 'The Pod shares the node network namespace.' },
      { value: 'Default', meaning: 'The broken DNS policy in this mission.' },
      { value: 'ClusterFirstWithHostNet', meaning: 'The corrected DNS policy for hostNetwork Pods.' },
    ],
    glossary: [
      { term: 'dnsPolicy', definition: 'The per-Pod setting that controls how DNS resolution is configured.' },
      { term: 'hostNetwork', definition: 'A Pod setting that makes the Pod share the node network namespace.' },
      { term: 'ClusterFirstWithHostNet', definition: 'The DNS policy recommended for hostNetwork Pods that still need cluster DNS.' },
    ],
    fieldGuide: [
      { field: 'spec.hostNetwork', explanation: 'This field changes the DNS policy expectation in the docs.' },
      { field: 'spec.dnsPolicy', explanation: 'The repair lives here and should become ClusterFirstWithHostNet.' },
      { field: '/etc/resolv.conf behavior', explanation: 'This is the practical effect of choosing the right DNS policy.' },
    ],
    tutorial: tutorial(
      'Inspect the Pod spec so you notice the hostNetwork setting before treating this like a general DNS outage.',
      'Patch the Pod DNS policy to ClusterFirstWithHostNet, which the official DNS docs call out for this case.',
      'Run a service lookup and confirm the Pod can resolve cluster services again.',
    ),
    feedback: {
      startTitle: 'DNS policy lab active',
      startBody: 'A hostNetwork Pod is using the wrong DNS policy for cluster-aware resolution.',
      failTitle: 'DNS policy still incorrect',
      failBody: 'The Pod DNS policy is still not the hostNetwork-safe cluster DNS option.',
      repairTitle: 'DNS policy repair recorded',
      repairBody: 'The simulator saw a dnsPolicy change for the Pod.',
      passTitle: 'DNS policy corrected',
      passBody: 'The hostNetwork Pod now uses ClusterFirstWithHostNet and can resolve cluster services.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'networking',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Pod DNS policy fix'],
      startLines: ['Scenario injected for pod/dns-proxy.', 'Host network mode changes which DNS policy is appropriate.'],
      inspectors: [
        inspector(
          ['kubectl get pod dns-proxy -o yaml'],
          'Inspect the Pod DNS fields.',
          ['spec:', '  hostNetwork: true', '  dnsPolicy: Default'],
          ['spec:', '  hostNetwork: true', '  dnsPolicy: ClusterFirstWithHostNet'],
        ),
        inspector(
          ['kubectl describe pod dns-proxy'],
          'Inspect DNS behavior notes.',
          ['DNS Policy: Default', 'Events: service lookup kubernetes.default failed using node DNS behavior'],
          ['DNS Policy: ClusterFirstWithHostNet', 'Events: service lookup kubernetes.default succeeded'],
        ),
        inspector(
          ['kubectl exec dns-proxy -- nslookup kubernetes.default'],
          'Inspect service DNS lookup.',
          ['** server can not find kubernetes.default: NXDOMAIN'],
          ['Name: kubernetes.default.svc.cluster.local', 'Address: 10.96.0.1'],
        ),
      ],
      actions: [
        action('patch-dns-policy', 'Patch the Pod DNS policy', ['kubectl patch pod dns-proxy -p {"spec":{"dnsPolicy":"ClusterFirstWithHostNet"}}'], 'Use the hostNetwork-safe cluster DNS policy.', ['pod/dns-proxy patched']),
      ],
      successCriteria: ['pod/dns-proxy dnsPolicy is ClusterFirstWithHostNet', 'cluster service lookup for kubernetes.default succeeds'],
    },
  }),
  mission({
    id: 'pod-security-baseline',
    title: 'Pod Security Baseline review',
    difficulty: 'Advanced',
    learningGoal: 'Identify and remove fields that violate the Baseline Pod Security profile.',
    description: 'Inspect a Pod spec that uses restricted host namespace and privileged settings.',
    docsUrl: 'https://kubernetes.io/docs/concepts/security/pod-security-standards/',
    tooltip: 'Practice mapping real Pod fields to Baseline policy restrictions.',
    whyItMatters:
      'Pod Security Standards give concrete field-level guidance, so they make good learning scenarios for secure workload design.',
    commonMistakes: [
      'Treating Baseline and Restricted as vague concepts instead of field-level controls.',
      'Forgetting that privileged and host namespace fields are blocked under Baseline.',
      'Looking only at container image settings instead of securityContext and host namespace fields.',
    ],
    quickGuide: [
      'Inspect the Pod spec for Baseline-disallowed fields.',
      'Patch out privileged and hostNetwork usage.',
      'Verify the Pod spec now aligns with Baseline expectations.',
    ],
    hints: [
      'Baseline disallows privileged containers and host namespaces.',
      'The broken Pod has both `privileged: true` and `hostNetwork: true`.',
      'Use the YAML and describe views to map the fields back to the policy table.',
    ],
    commands: [
      { command: 'kubectl get pod unsafe-toolbox -o yaml', purpose: 'Inspect the spec for Baseline violations.' },
      { command: 'kubectl describe pod unsafe-toolbox', purpose: 'Read the disallowed security context and host namespace clues.' },
      { command: 'kubectl patch pod unsafe-toolbox -p {"spec":{"hostNetwork":false,"containers":[{"name":"toolbox","securityContext":{"privileged":false}}]}}', purpose: 'Remove Baseline-disallowed fields.' },
      { command: 'kubectl get pod unsafe-toolbox -o yaml', purpose: 'Verify the Pod spec now aligns with the Baseline profile.' },
    ],
    values: [
      { value: 'privileged: true', meaning: 'Disallowed for Baseline in this mission.' },
      { value: 'hostNetwork: true', meaning: 'A host namespace setting disallowed under Baseline.' },
      { value: 'privileged: false', meaning: 'The safer corrected setting modeled here.' },
    ],
    glossary: [
      { term: 'Pod Security Standards', definition: 'Official policy profiles that define permitted and restricted Pod fields.' },
      { term: 'Baseline', definition: 'A minimally restrictive profile that blocks known privilege escalation paths.' },
      { term: 'privileged container', definition: 'A container that bypasses many standard isolation controls.' },
    ],
    fieldGuide: [
      { field: 'spec.hostNetwork', explanation: 'Baseline disallows sharing the host network namespace.' },
      { field: 'spec.containers[].securityContext.privileged', explanation: 'Baseline disallows privileged containers.' },
      { field: 'spec.hostPID / spec.hostIPC', explanation: 'These are related host namespace fields covered by the same policy family.' },
    ],
    tutorial: tutorial(
      'Inspect the Pod YAML and map each risky field back to the Baseline policy guidance from the docs.',
      'Patch the Pod to remove hostNetwork and privileged container usage in the simulated repair flow.',
      'Re-read the YAML so you can confirm the Pod fields now align with Baseline expectations.',
    ),
    feedback: {
      startTitle: 'Pod security lab active',
      startBody: 'The Pod spec uses fields that the Baseline policy is designed to disallow.',
      failTitle: 'Policy violations still present',
      failBody: 'The simulated Pod spec still includes Baseline-disallowed fields.',
      repairTitle: 'Security hardening recorded',
      repairBody: 'The simulator saw a Baseline-aligned security update.',
      passTitle: 'Pod aligned with Baseline',
      passBody: 'The Pod no longer uses the Baseline-disallowed privileged and host network settings in this mission.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'security',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Pod Security Baseline review'],
      startLines: ['Scenario injected for pod/unsafe-toolbox.', 'Use the policy table mindset: field-by-field, not guesswork.'],
      inspectors: [
        inspector(
          ['kubectl get pod unsafe-toolbox -o yaml'],
          'Inspect the Pod security fields.',
          [
            'spec:',
            '  hostNetwork: true',
            '  containers:',
            '  - name: toolbox',
            '    securityContext:',
            '      privileged: true',
          ],
          [
            'spec:',
            '  hostNetwork: false',
            '  containers:',
            '  - name: toolbox',
            '    securityContext:',
            '      privileged: false',
          ],
        ),
        inspector(
          ['kubectl describe pod unsafe-toolbox'],
          'Inspect the violation summary.',
          ['Security note: privileged container and hostNetwork would violate Baseline expectations'],
          ['Security note: Pod fields align with the simulated Baseline target for this mission'],
        ),
      ],
      actions: [
        action('harden-pod', 'Patch out Baseline-disallowed fields', ['kubectl patch pod unsafe-toolbox -p {"spec":{"hostNetwork":false,"containers":[{"name":"toolbox","securityContext":{"privileged":false}}]}}'], 'Remove privileged and host namespace behavior from the Pod.', ['pod/unsafe-toolbox patched']),
      ],
      successCriteria: ['pod/unsafe-toolbox hostNetwork is false', 'pod/unsafe-toolbox privileged is false'],
    },
  }),
  mission({
    id: 'serviceaccount-token-mount',
    title: 'ServiceAccount token mount control',
    difficulty: 'Advanced',
    learningGoal: 'Disable automatic ServiceAccount token mounting for a Pod that does not need API credentials.',
    description: 'Repair a Pod spec by setting automountServiceAccountToken to false.',
    docsUrl: 'https://kubernetes.io/docs/concepts/security/service-accounts/',
    tooltip: 'Practice least-privilege identity design for workloads that do not need API access.',
    whyItMatters:
      'The service account docs recommend thinking carefully about identity and token exposure, especially for workloads that do not need API calls.',
    commonMistakes: [
      'Leaving API credentials mounted in Pods that never talk to the cluster API.',
      'Changing the ServiceAccount name when the issue is token mounting behavior.',
      'Ignoring the difference between identity assignment and credential injection.',
    ],
    quickGuide: [
      'Inspect the Pod spec for token automount behavior.',
      'Patch the Pod to disable automatic token mounting.',
      'Verify the spec now follows a least-privilege pattern.',
    ],
    hints: [
      'The Pod does not need to call the Kubernetes API.',
      'The key field is `automountServiceAccountToken`.',
      'The secure target for this mission is `false`.',
    ],
    commands: [
      { command: 'kubectl get pod static-web -o yaml', purpose: 'Inspect ServiceAccount and automount behavior.' },
      { command: 'kubectl describe pod static-web', purpose: 'Read the identity and token mounting clue.' },
      { command: 'kubectl patch pod static-web -p {"spec":{"automountServiceAccountToken":false}}', purpose: 'Disable automatic token injection.' },
      { command: 'kubectl get pod static-web -o yaml', purpose: 'Verify the Pod spec now disables token mounting.' },
    ],
    values: [
      { value: 'automountServiceAccountToken: true', meaning: 'The broken, over-permissive starting state in this mission.' },
      { value: 'automountServiceAccountToken: false', meaning: 'The least-privilege correction for this Pod.' },
      { value: 'default ServiceAccount', meaning: 'The Pod identity remains present even when token automount is disabled.' },
    ],
    glossary: [
      { term: 'ServiceAccount', definition: 'A namespaced workload identity in Kubernetes.' },
      { term: 'automountServiceAccountToken', definition: 'A Pod or ServiceAccount setting that controls automatic token injection.' },
      { term: 'least privilege', definition: 'A design principle that grants only the access actually required.' },
    ],
    fieldGuide: [
      { field: 'spec.serviceAccountName', explanation: 'The Pod identity remains valid; the issue is whether credentials are mounted.' },
      { field: 'spec.automountServiceAccountToken', explanation: 'The repair target lives here and should become false.' },
      { field: 'projected token volume behavior', explanation: 'This is what the docs describe for modern short-lived token mounting.' },
    ],
    tutorial: tutorial(
      'Inspect the Pod spec to separate workload identity from automatic credential injection.',
      'Patch the Pod to set `automountServiceAccountToken: false`, which is appropriate when the workload does not need API access.',
      'Re-read the YAML and verify the Pod now follows the intended least-privilege pattern.',
    ),
    feedback: {
      startTitle: 'ServiceAccount token lab active',
      startBody: 'The Pod is mounting API credentials even though it does not need them.',
      failTitle: 'Token mount still enabled',
      failBody: 'The Pod spec still allows automatic ServiceAccount token injection.',
      repairTitle: 'Token mount change recorded',
      repairBody: 'The simulator saw an automountServiceAccountToken update.',
      passTitle: 'Least-privilege pattern applied',
      passBody: 'The Pod now disables automatic ServiceAccount token mounting while keeping its identity configuration explicit.',
    },
    cli: {
      contextName: 'kind-learning-cluster',
      namespace: 'security',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: ServiceAccount token mount control'],
      startLines: ['Scenario injected for pod/static-web.', 'Treat this like a least-privilege hardening review.'],
      inspectors: [
        inspector(
          ['kubectl get pod static-web -o yaml'],
          'Inspect token mount behavior.',
          ['spec:', '  serviceAccountName: default', '  automountServiceAccountToken: true'],
          ['spec:', '  serviceAccountName: default', '  automountServiceAccountToken: false'],
        ),
        inspector(
          ['kubectl describe pod static-web'],
          'Inspect workload identity notes.',
          ['Service Account: default', 'Security note: API credentials are mounted even though the Pod is static content only'],
          ['Service Account: default', 'Security note: token mounting disabled for a non-API workload'],
        ),
      ],
      actions: [
        action('disable-token-mount', 'Disable automatic token mounting', ['kubectl patch pod static-web -p {"spec":{"automountServiceAccountToken":false}}'], 'Apply least-privilege token handling to the Pod.', ['pod/static-web patched']),
      ],
      successCriteria: ['pod/static-web automountServiceAccountToken is false'],
    },
  }),
  // These setup-focused missions come from the official Kubernetes learning
  // environment guidance. They broaden the simulator beyond break/fix drills so
  // learners can also practice the path to getting a safe local lab ready.
  mission({
    id: 'kubectl-client-check',
    title: 'kubectl client verification',
    difficulty: 'Beginner',
    learningGoal: 'Verify that kubectl is installed and ready before cluster setup begins.',
    description: 'Practice the earliest step from the learning environment docs: confirm the kubectl client works.',
    docsUrl: 'https://kubernetes.io/docs/setup/learning-environment/',
    tooltip: 'Start with the CLI itself before trying to create or debug any cluster.',
    whyItMatters:
      'The official learning-environment page starts with kubectl because every later setup and debugging action depends on it.',
    commonMistakes: [
      'Trying to troubleshoot clusters before confirming the client tool is installed.',
      'Checking only a binary path without validating the client version output.',
      'Assuming kubeconfig problems mean kubectl is missing or broken.',
    ],
    quickGuide: [
      'Run a client version check first.',
      'Confirm kubectl can print version information cleanly.',
      'Use that confirmation as the handoff point to local cluster setup.',
    ],
    hints: [
      'The key command is `kubectl version --client`.',
      'This mission is about client readiness, not cluster connectivity yet.',
      'A usable client output is the success signal here.',
    ],
    commands: [
      { command: 'kubectl version --client', purpose: 'Verify the kubectl client binary is installed and runnable.' },
      { command: 'kubectl options', purpose: 'Confirm the CLI can print built-in help and flags.' },
      { command: 'kubectl config view', purpose: 'Inspect whether kubectl can also read configuration once installed.' },
    ],
    values: [
      { value: 'Client Version', meaning: 'The successful output indicator that kubectl is installed.' },
      { value: 'kubectl', meaning: 'The Kubernetes command-line tool called out first in the official learning environment docs.' },
      { value: 'config view', meaning: 'A follow-up check that becomes useful after the client is present.' },
    ],
    glossary: [
      { term: 'kubectl', definition: 'The command-line client used to communicate with Kubernetes clusters.' },
      { term: 'client version', definition: 'The local CLI version output that proves the tool itself is installed.' },
      { term: 'kubeconfig', definition: 'The file kubectl uses to know which cluster and credentials to use.' },
    ],
    fieldGuide: [
      { field: 'client-only workflow', explanation: 'This mission validates the CLI before cluster communication enters the picture.' },
      { field: 'version output', explanation: 'Readable version output is the main pass condition.' },
      { field: 'config parsing', explanation: 'This is a secondary check once the client binary is confirmed to run.' },
    ],
    tutorial: tutorial(
      'Start with `kubectl version --client` because the official setup flow begins by making sure the CLI exists.',
      'Use a simple help-style command like `kubectl options` to confirm the binary is actually healthy and usable.',
      'Treat successful client output as the handoff point to local cluster creation or kubeconfig work.',
    ),
    feedback: {
      startTitle: 'kubectl setup lab active',
      startBody: 'This mission teaches the first official setup step: prove the kubectl client is installed and usable.',
      failTitle: 'Client readiness still unverified',
      failBody: 'The simulator still needs evidence that kubectl itself is working before cluster setup proceeds.',
      repairTitle: 'Client verification recorded',
      repairBody: 'The simulator saw a kubectl client validation step.',
      passTitle: 'kubectl verified',
      passBody: 'The simulated environment now shows kubectl as installed and ready for the next setup stage.',
    },
    cli: {
      contextName: 'not-configured-yet',
      namespace: 'default',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: kubectl client verification'],
      startLines: ['Scenario injected for local CLI readiness.', 'The official learning path begins by confirming kubectl itself works.'],
      inspectors: [
        inspector(
          ['kubectl version --client'],
          'Inspect client version output.',
          ['kubectl: command not verified yet', 'Expected next step: check client version output'],
          ['Client Version: v1.35.0', 'Kustomize Version: v5.7.1'],
          ['Client Version: v1.35.0', 'Kustomize Version: v5.7.1'],
        ),
        inspector(
          ['kubectl options'],
          'Inspect CLI help availability.',
          ['No client validation recorded yet.'],
          ['The following options can be passed to any command:', '--namespace string', '--context string'],
        ),
      ],
      actions: [
        action('verify-client', 'Run the kubectl client version check', ['kubectl version --client'], 'Prove that kubectl is installed and runnable.', ['Client Version: v1.35.0', 'Kustomize Version: v5.7.1']),
      ],
      successCriteria: ['kubectl version --client returns a client version', 'the CLI prints normal built-in output'],
    },
  }),
  mission({
    id: 'kind-cluster-bootstrap',
    title: 'kind cluster bootstrap',
    difficulty: 'Beginner',
    learningGoal: 'Practice the local learning-cluster path using kind as recommended by the docs.',
    description: 'Simulate creating a lightweight kind cluster and selecting its context for practice.',
    docsUrl: 'https://kubernetes.io/docs/setup/learning-environment/',
    tooltip: 'Use kind as a safe local lab choice before production-like setup.',
    whyItMatters:
      'The learning-environment docs recommend kind as a lightweight, local option for experimentation and learning.',
    commonMistakes: [
      'Creating a cluster but never confirming the kubeconfig context changed.',
      'Assuming a local cluster exists without checking `kind get clusters`.',
      'Jumping to kubeadm before mastering a simpler local lab flow.',
    ],
    quickGuide: [
      'Create the local kind cluster.',
      'List the available kind clusters.',
      'Confirm kubectl is pointed at the new kind context.',
    ],
    hints: [
      'Start with `kind create cluster --name learning`.',
      'The context should become `kind-learning` in this mission.',
      'Use both `kind get clusters` and `kubectl config current-context` to verify the lab is ready.',
    ],
    commands: [
      { command: 'kind create cluster --name learning', purpose: 'Simulate creating the local kind cluster.' },
      { command: 'kind get clusters', purpose: 'Confirm the local kind cluster now exists.' },
      { command: 'kubectl config current-context', purpose: 'Verify kubectl points at the kind context.' },
      { command: 'kubectl cluster-info', purpose: 'Confirm the cluster API endpoint is reachable in the simulated lab.' },
    ],
    values: [
      { value: 'kind-learning', meaning: 'The context name for the newly created kind cluster in this scenario.' },
      { value: 'learning', meaning: 'The kind cluster name used in this mission.' },
      { value: 'local learning cluster', meaning: 'The intended outcome from the official docs recommendation.' },
    ],
    glossary: [
      { term: 'kind', definition: 'Kubernetes IN Docker, a lightweight tool for running local clusters using containers as nodes.' },
      { term: 'context', definition: 'A kubeconfig entry that tells kubectl which cluster it should talk to.' },
      { term: 'cluster-info', definition: 'A kubectl command that summarizes key cluster endpoints once a cluster is reachable.' },
    ],
    fieldGuide: [
      { field: 'kind cluster list', explanation: 'This verifies the local cluster exists before you trust the kubeconfig state.' },
      { field: 'current-context', explanation: 'The kubectl context should switch to the local kind lab.' },
      { field: 'API reachability', explanation: 'The local cluster is only truly ready once the client can talk to it.' },
    ],
    tutorial: tutorial(
      'Create the kind cluster first because the docs recommend local, low-cost learning environments before complex production-like setups.',
      'List the kind clusters and check current-context so you validate both cluster creation and client targeting.',
      'Use cluster-info as the final confirmation that the simulated local lab is ready for workloads.',
    ),
    feedback: {
      startTitle: 'kind lab active',
      startBody: 'This mission models the recommended lightweight local learning path using kind.',
      failTitle: 'Local kind lab not ready yet',
      failBody: 'The simulated cluster creation or context verification is still incomplete.',
      repairTitle: 'kind setup step recorded',
      repairBody: 'The simulator saw a local cluster setup action.',
      passTitle: 'kind learning lab ready',
      passBody: 'The simulated kind cluster exists, the context is selected, and the local learning environment is ready.',
    },
    cli: {
      contextName: 'kind-learning',
      namespace: 'default',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: kind cluster bootstrap'],
      startLines: ['Scenario injected for local kind setup.', 'Use the local learning environment flow before doing cluster admin drills.'],
      inspectors: [
        inspector(
          ['kind get clusters'],
          'Inspect the available local kind clusters.',
          ['No kind clusters found.'],
          ['learning'],
          ['learning'],
        ),
        inspector(
          ['kubectl cluster-info'],
          'Inspect cluster API reachability.',
          ['To further debug and diagnose cluster problems, use kubectl cluster-info dump.', 'Cluster endpoint not ready yet in this mission.'],
          ['Kubernetes control plane is running at https://127.0.0.1:6443', 'CoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy'],
        ),
      ],
      actions: [
        action('create-kind', 'Create the kind learning cluster', ['kind create cluster --name learning'], 'Provision the local kind lab.', ['Creating cluster "learning" ...', 'Set kubectl context to "kind-learning"']),
        action('verify-cluster-info', 'Verify the kind cluster is reachable', ['kubectl cluster-info'], 'Confirm the local cluster responds to kubectl.', ['Kubernetes control plane is running at https://127.0.0.1:6443']),
      ],
      successCriteria: ['kind cluster named learning exists', 'kubectl can reach the kind-learning cluster'],
    },
  }),
  mission({
    id: 'minikube-startup',
    title: 'minikube startup verification',
    difficulty: 'Beginner',
    learningGoal: 'Practice the single-node local lab path using minikube from the official docs.',
    description: 'Simulate starting minikube and verifying node readiness before using the cluster.',
    docsUrl: 'https://kubernetes.io/docs/setup/learning-environment/',
    tooltip: 'Use minikube as another official local learning option and validate node readiness.',
    whyItMatters:
      'The docs present minikube as a good single-node local learning cluster, and learners need a clean way to verify it is actually up.',
    commonMistakes: [
      'Starting minikube without ever checking whether the node is Ready.',
      'Assuming the cluster is usable before the minikube profile finishes booting.',
      'Skipping cluster verification and going straight to workload commands.',
    ],
    quickGuide: [
      'Start the minikube profile.',
      'Check cluster context and nodes.',
      'Use node readiness as the final signal before deployment practice.',
    ],
    hints: [
      'The core command is `minikube start`.',
      'Follow with `kubectl get nodes`.',
      'A Ready minikube node is the pass condition in this mission.',
    ],
    commands: [
      { command: 'minikube start', purpose: 'Simulate booting the local single-node minikube cluster.' },
      { command: 'kubectl config current-context', purpose: 'Verify kubectl targets the minikube context.' },
      { command: 'kubectl get nodes', purpose: 'Check node readiness before using the cluster.' },
      { command: 'kubectl cluster-info', purpose: 'Confirm the local minikube API is reachable.' },
    ],
    values: [
      { value: 'minikube', meaning: 'The kubeconfig context and profile name used in this lab.' },
      { value: 'Ready', meaning: 'The node condition required before using the lab cluster.' },
      { value: 'single-node learning cluster', meaning: 'The simulated role of minikube in this scenario.' },
    ],
    glossary: [
      { term: 'minikube', definition: 'A tool that runs a single-node Kubernetes cluster on your local machine.' },
      { term: 'node readiness', definition: 'The condition that shows a worker or control-plane node is available for workloads.' },
      { term: 'profile', definition: 'A named local environment configuration used by tools like minikube.' },
    ],
    fieldGuide: [
      { field: 'current-context', explanation: 'kubectl should target the minikube context after startup.' },
      { field: 'node condition Ready=True', explanation: 'This is the most important operational signal after boot.' },
      { field: 'cluster-info endpoint', explanation: 'This confirms the local API server is reachable.' },
    ],
    tutorial: tutorial(
      'Start minikube first because the learning-environment docs recommend local safe clusters before production-like setups.',
      'Confirm current-context and then check `kubectl get nodes` so you validate that the cluster is more than just “started”.',
      'Treat a Ready node and working cluster-info output as the handoff point to workload practice.',
    ),
    feedback: {
      startTitle: 'minikube lab active',
      startBody: 'This mission models the single-node local learning path using minikube.',
      failTitle: 'minikube still not verified',
      failBody: 'The simulated cluster start or node readiness verification is incomplete.',
      repairTitle: 'minikube setup step recorded',
      repairBody: 'The simulator saw a minikube startup action.',
      passTitle: 'minikube lab ready',
      passBody: 'The simulated minikube environment is started, selected, and verified as ready for learning.',
    },
    cli: {
      contextName: 'minikube',
      namespace: 'default',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: minikube startup verification'],
      startLines: ['Scenario injected for minikube startup.', 'Use node readiness to confirm the local single-node lab is usable.'],
      inspectors: [
        inspector(
          ['kubectl get nodes'],
          'Inspect node readiness.',
          ['No nodes found or node not ready yet in this mission.'],
          ['NAME       STATUS   ROLES           AGE   VERSION', 'minikube   Ready    control-plane   2m    v1.35.0'],
          ['NAME       STATUS   ROLES           AGE   VERSION', 'minikube   Ready    control-plane   2m    v1.35.0'],
        ),
        inspector(
          ['kubectl cluster-info'],
          'Inspect local cluster reachability.',
          ['Cluster endpoint not verified yet in this mission.'],
          ['Kubernetes control plane is running at https://127.0.0.1:51039', 'CoreDNS is running at https://127.0.0.1:51039/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy'],
        ),
      ],
      actions: [
        action('start-minikube', 'Start minikube', ['minikube start'], 'Boot the local single-node learning cluster.', ['😄  minikube started', '🏄  Done! kubectl is now configured to use "minikube" cluster']),
        action('verify-node', 'Verify the minikube node is Ready', ['kubectl get nodes'], 'Confirm the local node is healthy before learning workloads.', ['NAME       STATUS   ROLES           AGE   VERSION', 'minikube   Ready    control-plane   2m    v1.35.0']),
      ],
      successCriteria: ['minikube start completes', 'kubectl get nodes shows a Ready minikube node'],
    },
  }),
  mission({
    id: 'hello-minikube-deploy',
    title: 'Hello Minikube deployment',
    difficulty: 'Beginner',
    learningGoal: 'Practice the “first app” flow recommended after local environment setup.',
    description: 'Simulate deploying an app and exposing it once the local learning cluster is ready.',
    docsUrl: 'https://kubernetes.io/docs/setup/learning-environment/',
    tooltip: 'Follow local setup with a simple first deployment workflow.',
    whyItMatters:
      'The learning-environment page points to Hello Minikube next, so learners benefit from a gentle first deployment mission before deeper cluster problems.',
    commonMistakes: [
      'Deploying a workload but forgetting to expose it.',
      'Checking only the Deployment and not the Service.',
      'Trying advanced debugging before proving the first simple app flow works.',
    ],
    quickGuide: [
      'Create the Deployment.',
      'Expose it through a Service.',
      'Verify both the Deployment and Service exist and look healthy.',
    ],
    hints: [
      'Use `kubectl create deployment hello-node --image=registry.k8s.io/echoserver:1.10`.',
      'Follow with `kubectl expose deployment hello-node --type=LoadBalancer --port=8080`.',
      'Check both the Deployment and Service after creation.',
    ],
    commands: [
      { command: 'kubectl create deployment hello-node --image=registry.k8s.io/echoserver:1.10', purpose: 'Simulate creating the first practice deployment.' },
      { command: 'kubectl get deployment hello-node', purpose: 'Verify the deployment exists and becomes available.' },
      { command: 'kubectl expose deployment hello-node --type=LoadBalancer --port=8080', purpose: 'Expose the deployment through a service.' },
      { command: 'kubectl get service hello-node', purpose: 'Verify the service exists for the first app.' },
    ],
    values: [
      { value: 'hello-node', meaning: 'The sample application name used for the first app workflow.' },
      { value: 'LoadBalancer', meaning: 'The service type used in this educational flow.' },
      { value: 'registry.k8s.io/echoserver:1.10', meaning: 'The sample image used for the first deployment mission.' },
    ],
    glossary: [
      { term: 'Deployment', definition: 'A controller for stateless application replicas.' },
      { term: 'Service', definition: 'A stable network endpoint that exposes one or more Pods.' },
      { term: 'Hello Minikube', definition: 'A simple tutorial path for deploying a first application in a local learning cluster.' },
    ],
    fieldGuide: [
      { field: 'spec.replicas / availableReplicas', explanation: 'The Deployment should become available after creation.' },
      { field: 'spec.type', explanation: 'The Service type in this mission is LoadBalancer for tutorial continuity.' },
      { field: 'selector / endpoints relationship', explanation: 'The Service becomes meaningful when it targets the created workload.' },
    ],
    tutorial: tutorial(
      'Create a simple deployment first so you establish a clean “my cluster can run workloads” baseline.',
      'Expose the deployment through a Service and treat that as part of the first-app workflow, not an optional extra.',
      'Verify both objects with kubectl before moving on to more advanced training.',
    ),
    feedback: {
      startTitle: 'First app lab active',
      startBody: 'This mission models the simple deployment path that usually follows local learning-cluster setup.',
      failTitle: 'First app flow still incomplete',
      failBody: 'The deployment or service creation step is still missing in the simulated workflow.',
      repairTitle: 'First app step recorded',
      repairBody: 'The simulator saw part of the first deployment workflow.',
      passTitle: 'First app deployed',
      passBody: 'The simulated Hello Minikube-style deployment and service flow is complete.',
    },
    cli: {
      contextName: 'minikube',
      namespace: 'default',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: Hello Minikube deployment'],
      startLines: ['Scenario injected for first deployment practice.', 'Treat this as the simplest proof that your learning cluster is useful.'],
      inspectors: [
        inspector(
          ['kubectl get deployment hello-node'],
          'Inspect the first deployment.',
          ['Error from server (NotFound): deployments.apps "hello-node" not found'],
          ['NAME         READY   UP-TO-DATE   AVAILABLE', 'hello-node   1/1     1            1'],
          ['NAME         READY   UP-TO-DATE   AVAILABLE', 'hello-node   1/1     1            1'],
        ),
        inspector(
          ['kubectl get service hello-node'],
          'Inspect the service exposure.',
          ['Error from server (NotFound): services "hello-node" not found'],
          ['NAME         TYPE           CLUSTER-IP    PORT(S)', 'hello-node   LoadBalancer   10.96.0.55   8080:30386/TCP'],
        ),
      ],
      actions: [
        action('create-deployment', 'Create the hello-node deployment', ['kubectl create deployment hello-node --image=registry.k8s.io/echoserver:1.10'], 'Create the sample first application workload.', ['deployment.apps/hello-node created']),
        action('expose-service', 'Expose the deployment as a Service', ['kubectl expose deployment hello-node --type=LoadBalancer --port=8080'], 'Expose the first application with a Service.', ['service/hello-node exposed']),
      ],
      successCriteria: ['deployment/hello-node exists and is available', 'service/hello-node exists and exposes the app'],
    },
  }),
  mission({
    id: 'kubeadm-readiness-choice',
    title: 'kubeadm learning path choice',
    difficulty: 'Foundation',
    learningGoal: 'Learn when kubeadm is appropriate and why the docs say to start with simpler learning environments first.',
    description: 'Simulate choosing the right environment by recognizing that kubeadm is a production-like, advanced path.',
    docsUrl: 'https://kubernetes.io/docs/setup/learning-environment/',
    tooltip: 'Teach environment selection, not just cluster commands.',
    whyItMatters:
      'The official page explicitly warns that kubeadm is significantly more complex and should follow easier learning environments like kind or minikube.',
    commonMistakes: [
      'Starting with kubeadm before building confidence in a local learning environment.',
      'Treating multi-machine cluster setup as the first step for basic learning.',
      'Skipping the environment-selection decision and only thinking about raw commands.',
    ],
    quickGuide: [
      'Inspect the environment goal.',
      'Choose a simpler local path first.',
      'Use kubeadm only when the learning goal is production-like cluster practice.',
    ],
    hints: [
      'The docs say kubeadm is an advanced, production-like path.',
      'The recommended first choices are kind, minikube, or an online playground.',
      'This mission passes when you choose the lower-complexity learning path first.',
    ],
    commands: [
      { command: 'kubectl config current-context', purpose: 'Ground the environment decision in the current local setup path.' },
      { command: 'kind get clusters', purpose: 'Model the “start simple” local environment choice.' },
      { command: 'minikube start', purpose: 'Model the other recommended local environment choice.' },
      { command: 'kubeadm init', purpose: 'Contrast the advanced production-like option with the learning-first choices.' },
    ],
    values: [
      { value: 'advanced', meaning: 'How the docs characterize kubeadm for learning environments.' },
      { value: 'production-like cluster', meaning: 'The role kubeadm serves in the learning page guidance.' },
      { value: 'start simple first', meaning: 'The core takeaway from this mission.' },
    ],
    glossary: [
      { term: 'kubeadm', definition: 'A tool for setting up production-like Kubernetes clusters with more moving parts and complexity.' },
      { term: 'learning environment', definition: 'A safe environment to practice Kubernetes without production risk.' },
      { term: 'production-like', definition: 'Closer to real cluster administration, but more complex than beginner-friendly local tools.' },
    ],
    fieldGuide: [
      { field: 'environment choice', explanation: 'This mission teaches the decision before the command sequence.' },
      { field: 'complexity tradeoff', explanation: 'The official docs explicitly distinguish simple learning labs from advanced kubeadm setups.' },
      { field: 'progression path', explanation: 'The intended path is local lab first, production-like cluster later.' },
    ],
    tutorial: tutorial(
      'Read the environment goal first: if you are just learning, choose a simple local or browser-based lab before kubeadm.',
      'Use kind or minikube as the first practical path because that matches the official progression advice.',
      'Treat kubeadm as a later-stage learning topic when you want production-like cluster practice rather than beginner onboarding.',
    ),
    feedback: {
      startTitle: 'Environment choice lab active',
      startBody: 'This mission teaches the docs-guided decision between simple learning environments and advanced kubeadm setup.',
      failTitle: 'Learning path still too complex',
      failBody: 'The simulator still expects you to choose the simpler learning path before the production-like one.',
      repairTitle: 'Environment decision recorded',
      repairBody: 'The simulator saw a learning-environment choice that matches the official guidance.',
      passTitle: 'Learning path chosen well',
      passBody: 'The simulated workflow now reflects the official recommendation: start simple, then move to kubeadm later if needed.',
    },
    cli: {
      contextName: 'kind-learning',
      namespace: 'default',
      prompt: 'student@cka-sim:~$',
      bannerLines: ['CKA Practice Simulator CLI', 'Mission: kubeadm learning path choice'],
      startLines: ['Scenario injected for environment-selection practice.', 'The goal is to choose the right learning path, not the most complex one.'],
      inspectors: [
        inspector(
          ['kubeadm init'],
          'Inspect the advanced production-like path.',
          ['kubeadm path selected too early for this learning-first mission.', 'Docs guidance: start with kind, minikube, or an online playground first.'],
          ['kubeadm is acknowledged as the later, production-like path once foundational learning is complete.'],
        ),
        inspector(
          ['kind get clusters'],
          'Inspect the simpler local path.',
          ['No local learning path recorded yet.'],
          ['learning', 'Selected simple local environment before production-like kubeadm work.'],
          ['learning', 'Selected simple local environment before production-like kubeadm work.'],
        ),
      ],
      actions: [
        action('choose-simple-path', 'Choose a simple learning environment first', ['kind get clusters'], 'Model the docs-recommended local-first learning path.', ['learning', 'Environment decision recorded: simple local lab chosen before kubeadm.']),
      ],
      successCriteria: ['a simple local learning path is chosen before kubeadm', 'kubeadm is recognized as a later-stage production-like option'],
    },
  }),
]

export const missionById = Object.fromEntries(missions.map((item) => [item.id, item]))
