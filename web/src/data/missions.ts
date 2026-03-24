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
]

export const missionById = Object.fromEntries(missions.map((item) => [item.id, item]))
