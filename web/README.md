# CKA Practice Simulator Web UI

This frontend is a learning-first GUI for the simulator.

## Purpose

The web UI is designed to teach Kubernetes concepts while the learner practices:

- multiple simulated mission cards explain what each exercise is for
- buttons and tooltips reveal the simulator workflow
- the terminal panel includes a working simulated command line for modeled `kubectl` commands
- the sidebar breaks each command down token by token so learners can study what every command part means
- free play mode keeps a mutable simulated cluster state for common kubectl verbs
- a mini dashboard tab mirrors the broad Kubernetes Dashboard information layout while staying learner-first
- glossary, command, and value explanations help the learner understand what the grader is checking
- a tutorial tab gives a structured, step-by-step learning path

## Commands

```bash
npm install
npm test
npm run build
npm run dev
```

## Current scope

The current GUI ships with thirty-two simulated missions:

- pod image repair
- node scheduling clinic
- persistent volume binding workshop
- RBAC access mission
- deployment rollout recovery
- readiness probe repair
- ConfigMap key correction
- secret environment repair
- service selector mismatch
- ingress backend correction
- CrashLoopBackOff arguments repair
- taint and toleration match
- namespace context cleanup
- job completion repair
- CronJob schedule correction
- NetworkPolicy access restore
- resource request tuning
- ServiceAccount binding repair
- DaemonSet image repair
- StatefulSet service wiring
- label selector repair
- cross-namespace service lookup
- finalizer troubleshooting
- EndpointSlice readiness review
- pod DNS policy fix
- Pod Security Baseline review
- ServiceAccount token mount control
- kubectl client verification
- kind cluster bootstrap
- minikube startup verification
- Hello Minikube deployment
- kubeadm learning path choice

These are intentionally backed by local educational state rather than live HTTP endpoints so the GUI can already teach the inject -> inspect -> repair -> verify loop while the backend API layer continues to evolve. The latest mission batches were added from official docs coverage areas including labels/selectors, namespaces, finalizers, EndpointSlices, DNS behavior, Pod Security Standards, ServiceAccounts, and the learning-environment setup flow for kubectl, kind, minikube, Hello Minikube, and kubeadm readiness.

Free play mode complements the missions with a broader kubectl sandbox. It models common commands such as `get`, `describe`, `create deployment`, `run`, `expose`, `set image`, `scale`, `label`, `annotate`, `taint`, `delete`, `api-resources`, and `explain`, and later reads reflect earlier mutations to the simulated cluster state.

The dashboard tab is intentionally rudimentary. Instead of trying to recreate the full operational Kubernetes Dashboard, it borrows the high-level information architecture seen in Dashboard-style tools and the Kerno walkthrough: overview, workloads, services, config and storage, and cluster. The learner view then maps the most recent CLI command onto the visual section that should matter next.

This keeps the UI compatible with a future embedding under `purpleindustries.uk/kubernetes`, where the simulator can present both terminal-first practice and a simpler cluster visualizer without exposing the full complexity of a production admin dashboard.
