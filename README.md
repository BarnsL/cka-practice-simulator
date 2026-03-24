# CKA Practice Simulator

A Go CLI that evaluates Certified Kubernetes Administrator practice scenarios against a real or fake Kubernetes cluster.

## Interfaces

- `cka-sim.exe` for CLI-first practice
- `web/` for the learning-focused GUI

## Prerequisites

- Go 1.21+
- `kubectl` configured (for live mode)

## First-time setup

```bash
go mod tidy
```

## Build

```bash
go build -o cka-sim ./cmd/cka-sim
```

### Build the web GUI

```bash
cd web
npm install
npm run build
```

## Run

### Grade a repaired pod

```bash
./cka-sim grade --namespace default --pod nginx-pod --image nginx:1.25
```

### Inject a broken pod image

```bash
./cka-sim inject --namespace default --pod nginx-pod --broken-image nginx:no-such-tag
```

### Run the built-in local test

```bash
./cka-sim self-test
```

This runs an end-to-end inject -> repair -> grade flow with the Kubernetes fake client, so it works even before you have a kubeconfig or local cluster.

### Run the learning GUI

```bash
cd web
npm run dev
```

The GUI is intentionally educational. It now includes a working in-app simulated CLI, a stateful free-play kubectl sandbox, a dashboard-inspired visual learner panel, thirty-two mission labs mapped across official Kubernetes docs topics, learning-oriented buttons and tooltips, a step-by-step tutorial, and easy-access dictionaries for commands, values, glossary terms, and grader-checked fields.

## Test

```bash
go test ./...
```

## Scenarios

### Pod Image Check

Verifies a pod is Running and uses the expected image.

This is the first grading slice for the simulator: it models a common repair task where a candidate must correct a pod image and wait for the workload to become healthy again.

### Pod Image Injector

Creates or updates a pod so its first container uses a deliberately broken image.

That gives the learner a repeatable starting state before the grader checks whether the repair was completed successfully.

## Testing without a cluster

The unit tests use `k8s.io/client-go/kubernetes/fake`, so they do not need a live Kubernetes cluster.

The `self-test` command uses that same fake-client approach to give you a runnable local executable test path.

The GUI currently teaches the simulator workflow locally before live backend endpoints are wired into the web app. The terminal now accepts modeled `kubectl` commands for each mission, shows token-by-token command breakdowns in the learning sidebar, offers a broader free-play mode where common kubectl actions mutate a simulated cluster state that later commands can inspect, and includes a rudimentary dashboard-style visual layer that maps CLI activity into overview, workloads, services, config, and cluster sections.

Current simulated missions in the GUI:

- Pod image repair
- Node scheduling clinic
- Persistent volume binding workshop
- RBAC access mission
- Deployment rollout recovery
- Readiness probe repair
- ConfigMap key correction
- Secret environment repair
- Service selector mismatch
- Ingress backend correction
- CrashLoopBackOff arguments repair
- Taint and toleration match
- Namespace context cleanup
- Job completion repair
- CronJob schedule correction
- NetworkPolicy access restore
- Resource request tuning
- ServiceAccount binding repair
- DaemonSet image repair
- StatefulSet service wiring
- Label selector repair
- Cross-namespace service lookup
- Finalizer troubleshooting
- EndpointSlice readiness review
- Pod DNS policy fix
- Pod Security Baseline review
- ServiceAccount token mount control
- kubectl client verification
- kind cluster bootstrap
- minikube startup verification
- Hello Minikube deployment
- kubeadm learning path choice

## Official references

- [Kubernetes API overview](https://kubernetes.io/docs/reference/using-api/)
- [Kubernetes API reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [client-go](https://github.com/kubernetes/client-go)
- [Kerno walkthrough of Kubernetes Dashboard views](https://www.kerno.io/blog/kubernetes-dashboard-deploy-visualize-cluster)
- [Archived Kubernetes Dashboard repository](https://github.com/kubernetes-retired/dashboard)
