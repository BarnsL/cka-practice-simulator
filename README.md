# CKA Practice Simulator

A public project for building a **Certified Kubernetes Administrator (CKA) practice simulator** around the **Kubernetes API**.

## Goal

This repository will host a simulator that can:

- provision realistic CKA-style troubleshooting scenarios
- evaluate fixes by querying the Kubernetes API
- align exercises to official CNCF CKA exam domains
- support structured development with source-level annotations and external project memory

## Working conventions

- Source code should be **annotated where intent, grading logic, cluster mutations, or validation rules are non-obvious**.
- Comments should explain **why** a grading rule, scenario injector, or API interaction exists, not restate the code.
- Project memory should be maintained in the Obsidian vault at `C:\Users\barns\Desktop\Projects\OBSIDIAN CODEX MEMORY`.
- New memory notes should follow the existing prose-title style used in that vault.

## Planned components

- scenario injector for broken cluster states
- grader that validates repairs through the Kubernetes API
- exercise catalog mapped to CKA domains
- local cluster workflow for repeatable practice sessions
- optional AI-assisted scaffolding workflows for rapid iteration

## Official references

- [Kubernetes API overview](https://kubernetes.io/docs/reference/using-api/)
- [Kubernetes API reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [Client-go](https://github.com/kubernetes/client-go)
- [CNCF CKA program](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/)

## Status

Repository initialized. Implementation scaffold is next.
