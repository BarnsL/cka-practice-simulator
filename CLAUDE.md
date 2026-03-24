# CKA Practice Simulator Working Rules

## Project purpose

Build a Certified Kubernetes Administrator practice simulator that uses the Kubernetes API to inject, observe, and grade hands-on repair scenarios.

## Hard boundaries

- Keep the project aligned to authentic CKA-style operational tasks.
- Prefer official Kubernetes and CNCF references when documenting behavior or requirements.
- Keep the initial scaffold lean until a concrete implementation plan is approved.

## Source annotation rule

- Annotate source code at the point of implementation when logic is not immediately obvious.
- Prioritize annotations around scenario injection, grading checks, Kubernetes API interactions, and assumptions tied to exam-style behavior.
- Avoid noisy comments that simply paraphrase syntax.

## Memory rule

- Use the Obsidian vault at `C:\Users\barns\Desktop\Projects\OBSIDIAN CODEX MEMORY` as the long-term memory layer for this project.
- Add or update notes using prose-as-title naming rather than category labels.
- Keep repository-local memory concise and route to deeper notes when needed.

## Initial architecture direction

- Separate scenario definitions from grading logic.
- Treat the Kubernetes API as the source of truth for validation.
- Design scenarios so they can run against disposable local clusters first.
