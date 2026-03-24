# CKA Practice Simulator Web UI

This frontend is a learning-first GUI for the simulator.

## Purpose

The web UI is designed to teach Kubernetes concepts while the learner practices:

- multiple simulated mission cards explain what each exercise is for
- buttons and tooltips reveal the simulator workflow
- the terminal panel includes a working simulated command line for modeled `kubectl` commands
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
