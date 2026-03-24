# CKA Practice Simulator

A Go CLI that evaluates Certified Kubernetes Administrator practice scenarios against a real or fake Kubernetes cluster.

## Goal

This repository is the start of a CKA practice simulator built around the Kubernetes API as the grading source of truth.

## Working conventions

- Source code should be annotated where grading logic, Kubernetes API behavior, or scenario assumptions are non-obvious.
- Comments should explain why the simulator checks a condition, not restate the code.
- Project memory is maintained in the Obsidian vault at `C:\Users\barns\Desktop\Projects\OBSIDIAN CODEX MEMORY`.

## Prerequisites

- Go 1.21+
- `kubectl` configured for a cluster when running against live state

## First-time setup

```bash
go mod tidy
```

## Build

```bash
go build -o cka-sim ./cmd/cka-sim
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

## Official references

- [Kubernetes API overview](https://kubernetes.io/docs/reference/using-api/)
- [Kubernetes API reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [client-go](https://github.com/kubernetes/client-go)
- [CNCF CKA program](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/)
