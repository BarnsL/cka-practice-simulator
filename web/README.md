# CKA Practice Simulator Web UI

This frontend is a learning-first GUI for the simulator.

## Purpose

The web UI is designed to teach Kubernetes concepts while the learner practices:

- multiple simulated mission cards explain what each exercise is for
- buttons and tooltips reveal the simulator workflow
- the terminal panel keeps the experience CLI-oriented
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

The current GUI ships with four simulated missions:

- pod image repair
- node scheduling clinic
- persistent volume binding workshop
- RBAC access mission

These are intentionally backed by local educational state rather than live HTTP endpoints so the GUI can already teach the inject -> inspect -> repair -> grade loop while the backend API layer continues to evolve.
