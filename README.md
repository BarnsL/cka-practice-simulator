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

The first GUI slice is intentionally educational. It includes a scenario catalog, learning-oriented buttons and tooltips, an embedded terminal-style practice panel, glossary help for Kubernetes fields, and a guided pod-image exercise that teaches the inject -> inspect -> repair -> grade loop.

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

The GUI currently uses the same idea for its first screen: it teaches the simulator workflow locally before live backend endpoints are wired into the web app.

## Official references

- [Kubernetes API overview](https://kubernetes.io/docs/reference/using-api/)
- [Kubernetes API reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [client-go](https://github.com/kubernetes/client-go)
- [CNCF CKA program](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/)
