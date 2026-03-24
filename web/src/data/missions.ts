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
  terminal: {
    intro: string[]
    broken: string[]
    inProgress: string[]
    repaired: string[]
    passed: string[]
  }
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
}

// These missions are intentionally simulated today. They let the GUI teach the
// operational reasoning behind Kubernetes tasks before every mission is backed
// by live backend endpoints.
export const missions: Mission[] = [
  {
    id: 'pod-image',
    title: 'Pod image repair',
    difficulty: 'Beginner',
    learningGoal: 'Learn how Pod phase and container image fields affect workload health.',
    description:
      'Fix a Pod with a bad image tag, then verify that the workload reaches Running.',
    docsUrl: 'https://kubernetes.io/docs/concepts/workloads/pods/',
    tooltip: 'Use this simulated mission to learn the inject -> inspect -> repair -> grade loop.',
    whyItMatters:
      'Many Kubernetes failures start with a single wrong field in the Pod spec. This mission teaches how small spec mistakes turn into visible runtime problems.',
    commonMistakes: [
      'Fixing the image but forgetting to wait for the Pod to become Running.',
      'Reading only the summary view and skipping `describe` or YAML inspection.',
      'Changing the wrong resource when the grader expects the Pod itself to be healthy.',
    ],
    quickGuide: [
      'Inject or read the broken state.',
      'Inspect the Pod and identify the failing image field.',
      'Repair the image and verify that the Pod reaches Running.',
      'Use the grader to confirm both configuration and runtime health.',
    ],
    hints: [
      'Inspect the Pod before changing anything. Start with `kubectl get pod demo-pod -o wide`.',
      'The failing field is in the Pod spec. Look closely at `spec.containers[0].image`.',
      'The grader also checks runtime health. A correct image alone is not enough until the Pod becomes Running.',
    ],
    solutionCommands: [
      'kubectl set image pod/demo-pod app=nginx:1.25',
      'kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s',
      'kubectl get pod demo-pod -o wide',
    ],
    commands: [
      {
        command: 'kubectl get pod demo-pod -o wide',
        purpose: 'See whether the Pod is running and capture its basic state quickly.',
      },
      {
        command: 'kubectl describe pod demo-pod',
        purpose: 'Inspect events, image details, and clues about why the workload is unhealthy.',
      },
      {
        command: 'kubectl set image pod/demo-pod app=nginx:1.25',
        purpose: 'Repair the broken image field directly.',
      },
      {
        command: 'kubectl wait --for=condition=Ready pod/demo-pod --timeout=90s',
        purpose: 'Verify that the Pod actually becomes healthy after the spec change.',
      },
    ],
    values: [
      {
        value: 'Pending',
        meaning: 'The Pod has been accepted but is not yet healthy enough to run for this exercise.',
      },
      {
        value: 'Running',
        meaning: 'The workload is healthy enough for the grader to consider the runtime state fixed.',
      },
      {
        value: 'nginx:no-such-tag',
        meaning: 'The intentionally broken image value used to simulate an image problem.',
      },
      {
        value: 'nginx:1.25',
        meaning: 'The expected repaired image for the simulated grader path.',
      },
    ],
    glossary: [
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
    ],
    fieldGuide: [
      {
        field: 'spec.containers[0].image',
        explanation:
          'The simulated mission injects a bad image here. Fixing it is the direct repair action.',
      },
      {
        field: 'status.phase',
        explanation:
          'The grader expects Running because the exercise is not complete until the workload is healthy.',
      },
      {
        field: 'metadata.name',
        explanation:
          'This identifies the exact object the grader reads. In this mission, that target is demo-pod.',
      },
    ],
    tutorial: [
      {
        title: 'Start the simulated mission',
        body: 'Use Start Scenario or Load Mission to create the broken Pod image state.',
      },
      {
        title: 'Inspect before editing',
        body: 'Read the terminal preview, glossary, and field inspector so you know what the grader will check.',
      },
      {
        title: 'Repair and grade',
        body: 'Apply the repair, then run Check My Fix to compare configuration and runtime state.',
      },
    ],
    terminal: {
      intro: [
        'CKA Practice Simulator Web Terminal',
        '---------------------------------',
        'PS> kubectl config current-context',
      ],
      broken: [
        'kind-learning-cluster',
        'PS> kubectl get pod demo-pod',
        'demo-pod   0/1   Pending',
        'PS> kubectl describe pod demo-pod',
        'Image: nginx:no-such-tag',
      ],
      inProgress: [
        'kind-learning-cluster',
        'PS> kubectl get pod demo-pod',
        'demo-pod   0/1   Pending',
        'Hint: investigate spec.containers[0].image and wait for Running.',
      ],
      repaired: [
        'PS> kubectl set image pod/demo-pod app=nginx:1.25',
        'pod/demo-pod image updated',
        'PS> kubectl get pod demo-pod',
        'demo-pod   1/1   Running',
      ],
      passed: ['Grade result: PASS'],
    },
    feedback: {
      startTitle: 'Scenario injected',
      startBody:
        'The simulator has created a broken Pod image state. Inspect the Pod, correct the image, and verify that the Pod reaches Running.',
      failTitle: 'Not fixed yet',
      failBody:
        'The Pod is still not Running. Focus on the image field and remember that success means both the right image and a healthy runtime state.',
      repairTitle: 'Repair simulated',
      repairBody:
        'The guided repair has updated the image and Pod health. Run Check My Fix next to see how the grader responds.',
      passTitle: 'Great work',
      passBody:
        'The simulated grader sees the corrected image and a Running Pod. This mirrors the mental loop you will use on a live cluster.',
    },
  },
  {
    id: 'node-scheduling',
    title: 'Node scheduling clinic',
    difficulty: 'Foundation',
    learningGoal: 'Understand why Pods land on specific nodes and how selectors affect scheduling.',
    description:
      'Diagnose a scheduling mismatch and learn how node labels and selectors influence placement.',
    docsUrl: 'https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/',
    tooltip: 'This simulated mission teaches scheduling clues instead of image debugging.',
    whyItMatters:
      'Scheduling issues are common in admin work because the Pod spec can look valid even when no node actually matches its requirements.',
    commonMistakes: [
      'Changing the node label without first reading the Pod selector.',
      'Confusing `nodeName` with `nodeSelector`.',
      'Forgetting that `Pending` often means “scheduler cannot place this Pod yet.”',
    ],
    quickGuide: [
      'Read the selector and placement requirements.',
      'Compare Pod expectations against node labels.',
      'Adjust the matching fields and confirm the Pod lands on a node.',
      'Grade the placement after the scheduler conditions are satisfied.',
    ],
    hints: [
      'The Pod is not broken because of its image. Look at placement requirements instead.',
      'Check `spec.nodeSelector` before changing node labels.',
      'The main clue is the relationship between `nodeSelector` and the available node labels.',
    ],
    solutionCommands: [
      'kubectl get nodes --show-labels',
      'kubectl patch pod scheduler-lab --type merge -p "{\\"spec\\":{\\"nodeSelector\\":{\\"zone\\":\\"lab-west\\"}}}"',
      'kubectl get pod scheduler-lab -o wide',
    ],
    commands: [
      {
        command: 'kubectl get nodes --show-labels',
        purpose: 'Compare node labels against the Pod scheduling rules.',
      },
      {
        command: 'kubectl describe pod scheduler-lab',
        purpose: 'Read scheduler events and understand why the Pod is still Pending.',
      },
      {
        command:
          'kubectl patch pod scheduler-lab --type merge -p "{\\"spec\\":{\\"nodeSelector\\":{\\"zone\\":\\"lab-west\\"}}}"',
        purpose: 'Repair the node selector so the scheduler can place the Pod.',
      },
    ],
    values: [
      {
        value: 'nodeSelector',
        meaning: 'A Pod rule that requires matching labels on the target node.',
      },
      {
        value: 'Pending',
        meaning: 'The Pod is not yet scheduled or started.',
      },
      {
        value: 'lab-west',
        meaning: 'The simulated node label value that satisfies this mission.',
      },
    ],
    glossary: [
      {
        term: 'nodeSelector',
        definition:
          'A simple map of required node labels. The scheduler only places the Pod on matching nodes.',
      },
      {
        term: 'nodeName',
        definition:
          'A direct node assignment field that bypasses most scheduler decision-making.',
      },
      {
        term: 'Scheduler',
        definition:
          'The control plane component that decides where unscheduled Pods should run.',
      },
    ],
    fieldGuide: [
      {
        field: 'spec.nodeSelector',
        explanation:
          'This field describes the labels a node must have before the Pod can be scheduled.',
      },
      {
        field: 'status.phase',
        explanation:
          'A Pod that remains Pending after image inspection often needs scheduling investigation.',
      },
      {
        field: 'metadata.labels',
        explanation:
          'Node labels are not the same as Pod labels. This mission teaches the difference.',
      },
    ],
    tutorial: [
      {
        title: 'Read the placement rules',
        body: 'Start by comparing the Pod selector against the labels exposed by cluster nodes.',
      },
      {
        title: 'Find the mismatch',
        body: 'The scheduler cannot place the Pod until its required labels actually exist on a node.',
      },
      {
        title: 'Repair and verify',
        body: 'Update the selector or node labels, then confirm the Pod schedules successfully.',
      },
    ],
    terminal: {
      intro: [
        'CKA Practice Simulator Web Terminal',
        '---------------------------------',
        'PS> kubectl config current-context',
      ],
      broken: [
        'kind-learning-cluster',
        'PS> kubectl get pod scheduler-lab -o wide',
        'scheduler-lab   0/1   Pending   <none>',
        'PS> kubectl describe pod scheduler-lab',
        'Warning  FailedScheduling  0/2 nodes match node selector zone=lab-west',
      ],
      inProgress: [
        'kind-learning-cluster',
        'PS> kubectl get nodes --show-labels',
        'worker-a zone=lab-east',
        'worker-b zone=lab-central',
      ],
      repaired: [
        'PS> kubectl patch pod scheduler-lab --type merge ...',
        'pod/scheduler-lab patched',
        'PS> kubectl get pod scheduler-lab -o wide',
        'scheduler-lab   1/1   Running   worker-a',
      ],
      passed: ['Grade result: PASS'],
    },
    feedback: {
      startTitle: 'Scheduling mission loaded',
      startBody:
        'This simulated mission focuses on placement, not container images. Read the node selector and scheduler clues first.',
      failTitle: 'Placement still blocked',
      failBody:
        'The scheduler still cannot place the Pod. Compare the selector values against the labels actually present on cluster nodes.',
      repairTitle: 'Placement repair simulated',
      repairBody:
        'The selector now matches a node. Check the Pod again and then ask the grader to confirm scheduling success.',
      passTitle: 'Scheduler reasoning complete',
      passBody:
        'You aligned placement rules with node labels, which is exactly the operational skill this mission is teaching.',
    },
  },
  {
    id: 'storage-binding',
    title: 'Persistent volume binding workshop',
    difficulty: 'Foundation',
    learningGoal: 'Learn how PVC status, storage classes, and requested capacity affect binding.',
    description:
      'Diagnose why a claim is stuck Pending and repair the request so storage can bind.',
    docsUrl: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/',
    tooltip: 'This simulated mission teaches storage reasoning and PVC states.',
    whyItMatters:
      'Storage problems are often invisible until a workload cannot mount what it expects. Reading claim status and requested values is a core admin skill.',
    commonMistakes: [
      'Checking only the Pod and skipping the PVC.',
      'Ignoring access mode or capacity mismatch messages.',
      'Changing a workload without confirming the claim is actually Bound.',
    ],
    quickGuide: [
      'Inspect the PVC before touching the workload.',
      'Read the requested storage, class, and access mode.',
      'Compare claim requirements against available persistent volumes.',
      'Confirm the PVC reaches Bound before grading the mission.',
    ],
    hints: [
      'The core object is the PVC, not the Pod.',
      'Look at requested capacity and access mode.',
      'A Bound PVC is the main sign that this simulated repair is complete.',
    ],
    solutionCommands: [
      'kubectl get pvc storage-lab',
      'kubectl patch pvc storage-lab --type merge -p "{\\"spec\\":{\\"resources\\":{\\"requests\\":{\\"storage\\":\\"5Gi\\"}}}}"',
      'kubectl get pvc storage-lab',
    ],
    commands: [
      {
        command: 'kubectl get pvc storage-lab',
        purpose: 'Check whether the claim is Pending or Bound.',
      },
      {
        command: 'kubectl describe pvc storage-lab',
        purpose: 'Read storage events and see why the claim is not binding.',
      },
      {
        command:
          'kubectl patch pvc storage-lab --type merge -p "{\\"spec\\":{\\"resources\\":{\\"requests\\":{\\"storage\\":\\"5Gi\\"}}}}"',
        purpose: 'Repair the claim request to fit the simulated available volume.',
      },
    ],
    values: [
      {
        value: 'Pending',
        meaning: 'The PVC has not found compatible storage yet.',
      },
      {
        value: 'Bound',
        meaning: 'The claim is attached to a matching persistent volume.',
      },
      {
        value: '5Gi',
        meaning: 'The simulated requested size that satisfies this exercise.',
      },
      {
        value: 'ReadWriteOnce',
        meaning: 'A common access mode value that restricts how the volume is mounted.',
      },
    ],
    glossary: [
      {
        term: 'PVC',
        definition:
          'A PersistentVolumeClaim is a workload request for storage with capacity, class, and access requirements.',
      },
      {
        term: 'PV',
        definition:
          'A PersistentVolume is cluster storage that can satisfy compatible claims.',
      },
      {
        term: 'storageClassName',
        definition:
          'A field that tells Kubernetes which storage provisioning behavior to use.',
      },
    ],
    fieldGuide: [
      {
        field: 'spec.resources.requests.storage',
        explanation:
          'This requested capacity must be satisfiable by an available volume.',
      },
      {
        field: 'status.phase',
        explanation:
          'For a PVC, Bound is the healthy target state in this mission.',
      },
      {
        field: 'spec.accessModes',
        explanation:
          'The requested access mode must be compatible with the available storage.',
      },
    ],
    tutorial: [
      {
        title: 'Inspect the claim first',
        body: 'Storage missions usually start with the PVC because that object explains what the workload is asking for.',
      },
      {
        title: 'Compare requested values',
        body: 'Read capacity, access mode, and storage class before changing anything.',
      },
      {
        title: 'Repair and bind',
        body: 'Adjust the claim until the simulated status becomes Bound, then grade the result.',
      },
    ],
    terminal: {
      intro: [
        'CKA Practice Simulator Web Terminal',
        '---------------------------------',
        'PS> kubectl config current-context',
      ],
      broken: [
        'kind-learning-cluster',
        'PS> kubectl get pvc storage-lab',
        'storage-lab   Pending   9Gi   standard',
        'PS> kubectl describe pvc storage-lab',
        'Warning  ProvisioningFailed  no volume satisfies request 9Gi',
      ],
      inProgress: [
        'kind-learning-cluster',
        'PS> kubectl get pv',
        'lab-pv-01   5Gi   ReadWriteOnce   Available',
      ],
      repaired: [
        'PS> kubectl patch pvc storage-lab --type merge ...',
        'persistentvolumeclaim/storage-lab patched',
        'PS> kubectl get pvc storage-lab',
        'storage-lab   Bound   5Gi   standard',
      ],
      passed: ['Grade result: PASS'],
    },
    feedback: {
      startTitle: 'Storage mission loaded',
      startBody:
        'This simulated mission teaches PVC reasoning. Read the claim status before changing any workload settings.',
      failTitle: 'Claim still not bound',
      failBody:
        'The claim remains Pending. Focus on requested storage, access mode, and whether the cluster has a compatible volume.',
      repairTitle: 'Storage repair simulated',
      repairBody:
        'The request now matches the simulated available storage. Grade the mission to confirm the binding logic.',
      passTitle: 'Storage reasoning complete',
      passBody:
        'You repaired the claim values and reached Bound, which is the key learning target for this mission.',
    },
  },
  {
    id: 'rbac-basics',
    title: 'RBAC access mission',
    difficulty: 'Intermediate',
    learningGoal: 'Understand how roles, bindings, and verbs affect access decisions.',
    description:
      'Investigate a Forbidden response and repair the missing permission path.',
    docsUrl: 'https://kubernetes.io/docs/reference/access-authn-authz/rbac/',
    tooltip: 'This simulated mission teaches permission debugging instead of scheduling or storage.',
    whyItMatters:
      'RBAC issues often look like application problems at first. Reading the denied verb, resource, and binding path is the fastest route to the real fix.',
    commonMistakes: [
      'Granting cluster-wide permissions when a namespace Role would be enough.',
      'Changing the service account without fixing the binding.',
      'Reading the error message without isolating the denied verb and resource.',
    ],
    quickGuide: [
      'Read the Forbidden message carefully.',
      'Identify the denied verb, resource, and identity.',
      'Repair the Role or RoleBinding so the right subject has the right permission.',
      'Use the grader after the simulated access check passes.',
    ],
    hints: [
      'The key data is in the denial text: subject, verb, and resource.',
      'A binding problem can exist even when the Role itself looks correct.',
      'Use `kubectl auth can-i` style thinking when reading the access path.',
    ],
    solutionCommands: [
      'kubectl auth can-i get pods --as system:serviceaccount:default:trainee -n default',
      'kubectl create rolebinding trainee-pod-reader --role=pod-reader --serviceaccount=default:trainee',
      'kubectl auth can-i get pods --as system:serviceaccount:default:trainee -n default',
    ],
    commands: [
      {
        command: 'kubectl auth can-i get pods --as system:serviceaccount:default:trainee -n default',
        purpose: 'Check whether the target identity currently has the permission.',
      },
      {
        command: 'kubectl get rolebinding -n default',
        purpose: 'Inspect which bindings already connect subjects to roles.',
      },
      {
        command:
          'kubectl create rolebinding trainee-pod-reader --role=pod-reader --serviceaccount=default:trainee',
        purpose: 'Create the missing namespace binding for the trainee account.',
      },
    ],
    values: [
      {
        value: 'Forbidden',
        meaning: 'Kubernetes denied the action because the current identity lacks authorization.',
      },
      {
        value: 'get',
        meaning: 'The denied verb in this mission.',
      },
      {
        value: 'pods',
        meaning: 'The target resource for the simulated RBAC failure.',
      },
      {
        value: 'default:trainee',
        meaning: 'The service account identity used in the mission.',
      },
    ],
    glossary: [
      {
        term: 'Role',
        definition:
          'A namespaced set of allowed verbs and resources.',
      },
      {
        term: 'RoleBinding',
        definition:
          'A namespaced object that attaches a Role to users, groups, or service accounts.',
      },
      {
        term: 'ServiceAccount',
        definition:
          'An in-cluster identity used by Pods and permission checks.',
      },
    ],
    fieldGuide: [
      {
        field: 'subjects',
        explanation:
          'Bindings only grant access to the identities listed in their subjects array.',
      },
      {
        field: 'roleRef',
        explanation:
          'This points to the Role or ClusterRole whose permissions the binding grants.',
      },
      {
        field: 'rules[].verbs',
        explanation:
          'The denied verb must be present in the referenced role for access to succeed.',
      },
    ],
    tutorial: [
      {
        title: 'Read the denial carefully',
        body: 'RBAC errors explain the missing path if you isolate the subject, verb, and resource.',
      },
      {
        title: 'Trace the permission chain',
        body: 'Match the subject to a binding, then match the binding to a role.',
      },
      {
        title: 'Repair the binding',
        body: 'Grant the smallest useful permission and then re-check access.',
      },
    ],
    terminal: {
      intro: [
        'CKA Practice Simulator Web Terminal',
        '---------------------------------',
        'PS> kubectl config current-context',
      ],
      broken: [
        'kind-learning-cluster',
        'PS> kubectl auth can-i get pods --as system:serviceaccount:default:trainee -n default',
        'no',
        'Error from server (Forbidden): trainee cannot get resource "pods" in API group ""',
      ],
      inProgress: [
        'kind-learning-cluster',
        'PS> kubectl get rolebinding -n default',
        'No binding grants pod-reader to default:trainee',
      ],
      repaired: [
        'PS> kubectl create rolebinding trainee-pod-reader --role=pod-reader --serviceaccount=default:trainee',
        'rolebinding.rbac.authorization.k8s.io/trainee-pod-reader created',
        'PS> kubectl auth can-i get pods --as system:serviceaccount:default:trainee -n default',
        'yes',
      ],
      passed: ['Grade result: PASS'],
    },
    feedback: {
      startTitle: 'RBAC mission loaded',
      startBody:
        'This simulated mission is about authorization. Read the denied verb, resource, and identity before changing anything.',
      failTitle: 'Permission still denied',
      failBody:
        'The access path is still incomplete. Trace the subject through bindings and then verify the role grants the needed verb.',
      repairTitle: 'RBAC repair simulated',
      repairBody:
        'The missing binding path is now in place. Use Check My Fix to confirm the permission flow.',
      passTitle: 'Authorization reasoning complete',
      passBody:
        'You repaired the subject-to-role path and turned a Forbidden access check into an allowed one.',
    },
  },
]

export const missionById = Object.fromEntries(missions.map((mission) => [mission.id, mission]))
