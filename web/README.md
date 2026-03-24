# CKA Practice Simulator Web UI

This frontend is a learning-first GUI for the simulator.

## Purpose

The web UI is designed to teach Kubernetes concepts while the learner practices:

- scenario cards explain what each exercise is for
- buttons and tooltips reveal the simulator workflow
- the terminal panel keeps the experience CLI-oriented
- glossary and API field explanations help the learner understand what the grader is checking

## Commands

```bash
npm install
npm test
npm run build
npm run dev
```

## Current scope

The first implemented flow is the pod image repair exercise. It is intentionally backed by local educational state rather than live HTTP endpoints so the GUI can already teach the inject -> inspect -> repair -> grade loop.
