# AGENTS.md

Instructions and guidelines for AI agents working in the **Morse Trainulator (摩斯訓練儀)** repository.

---

## Language & Communication

- **Preferred Language**: Traditional Chinese (繁體中文，台灣在地常用語彙與電報術語).
- Keep descriptions clear, concise, objective, and professional.

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles mapped to GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

---

## Core Engineering & Design Principles

### 1. Zero-Dependency & Dual-Track Architecture
- `index.html` (modular architecture: `js/core/`, `js/ui/`, `css/`) and `prototype_morse_card.html` (all-in-one standalone file) must remain 100% functionally and visually synchronized.
- Both tracks must be runnable locally via `file:///` without requiring a local development server or compilation build step.

### 2. UI & Iconography Standard (MDI Icons)
- **Strictly No Emoji / 顏文字 in Production UI**: All iconography across the interface, buttons, meters, map grids, and status notifications must use **Material Design Icons (MDI)** instead of Unicode emoji characters.
- **Rationale**: Guarantees consistent typography height, vector crispness, professional telegraphic instrumentation aesthetics, and identical rendering across Windows, macOS, Linux, iOS, and Android.
- See ADR: `docs/adr/0001-use-material-design-icons.md`.

### 3. Automated Testing
- All changes must pass the full test suite (`npm test`).
- Test assertions must verify both `index.html` and `prototype_morse_card.html`.
