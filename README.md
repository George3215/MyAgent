# EvoScientist Studio

Cross-platform Studio frontend scaffold for EvoScientist.

This repository is intentionally built as one shared product codebase:

- `apps/studio-ui`: Studio frontend, zero external runtime dependencies.
- `apps/desktop-shell`: desktop shell notes and future Windows/Linux shell plan.
- `packages/contracts`: local API contracts shared by UI and backend.
- `tools`: dependency-free dev, build, and check scripts.
- `docs`: architecture, compatibility, onboarding, packaging, and gateway notes.

## Local Preview

```bash
npm run api
```

This starts the local `studio-api` sidecar and opens Studio in the browser for
development. The frontend talks to the same local API process for health checks,
bootstrap, model/API configuration, and task launch.

For static UI-only development:

```bash
npm run dev
```

## Build

```bash
npm run build
```

The static frontend is written to:

```text
dist/studio-ui/
```

## Package

```bash
npm run package
```

This prepares macOS, Windows, and Linux package folders and installer inputs:

- macOS `.app`, `.dmg`, and `.pkg`.
- Windows portable zip, PowerShell installer, and Inno Setup `.iss`.
- Linux AppDir, install script, and `.tar.gz`.

For a one-click macOS build with a bundled `studio-api` binary:

```bash
npm run package:mac:full
```

The packaged macOS `.app` uses a native `WKWebView` window. It does not hand the
user to Safari or Chrome. The native launcher starts the bundled `studio-api`
sidecar, reads its actual local URL, and loads the internal UI inside the app
window.

The package starts `studio-api`, then the frontend connects to it. On first run,
Studio follows a Claude Code-first bootstrap:

1. Detect or install Claude Code with the official installer.
2. Guide the user through API/base/key/model setup.
3. Start Claude Code as an installation and repair agent.
4. Let Claude Code install EvoScientist Core into Studio's controlled data
   directory.
5. Return to Studio and let the user switch between Claude Code research mode
   and EvoScientist research mode.

Studio keeps a deterministic fallback installer too: it can use bundled `uv`,
download `uv` when needed, install managed Python 3.13, fetch EvoScientist Core
by Git or GitHub zip fallback, and install dependencies with `uv sync`.

For cross-machine reliability, the first installer success criterion is narrow:
Claude Code must install or be detected, and Studio must be able to start a
Claude Code task from the UI. Ollama is the recommended model route for domestic
or local models, and EvoScientist Core remains an optional advanced install step
after Claude Code is working.

## Cross-Platform Direction

The frontend and backend API are shared across Windows, macOS, and Linux.
Platform-specific work is isolated to the desktop shell and installer layer:

- Windows: `.exe` / `.msi`, Start Menu, desktop shortcut, `%LOCALAPPDATA%`.
- macOS: `.app` / `.dmg`, Applications, Dock, Keychain, Application Support.
- Linux: `.AppImage` / `.deb` / `.rpm`, `.desktop`, XDG data directories.

The first visual prototype is static so it can be reviewed immediately on macOS.
After the UI direction is accepted, the next step is to connect it to the
EvoScientist Python/FastAPI Studio backend.

## EvoScientist Compatibility

Studio is designed to keep the original EvoScientist project as a separate core
runtime. The desktop installer clones or downloads EvoScientist into a
controlled data directory, installs dependencies with a Studio-managed Python
runtime, and starts a local adapter API. Studio then talks to that adapter
instead of rewriting the upstream project.

The first-run flow should guide users through:

- Approving automation permissions.
- Installing or detecting Claude Code from the Studio installer flow.
- Installing or detecting Ollama for Claude Code model routing.
- Selecting Ollama / BYOK / local model mode. The MVP defaults to Ollama so
  Claude Code can use local or domestic models instead of relying on a region
  restricted Anthropic endpoint.
- Filling Ollama API base, optional token, and Claude model name such as
  `kimi-k2.5:cloud`, `glm-5:cloud`, or a local model.
- Testing Claude Code and Ollama connectivity.
- Starting the local backend and opening the chat workspace.

## Local API Contract

The bundled sidecar exposes:

- `GET /api/health`
- `GET /api/claude/status`
- `POST /api/claude/install`
- `GET /api/ollama/status`
- `POST /api/ollama/install`
- `POST /api/bootstrap/start`
- `GET /api/bootstrap/status`
- `GET /api/runtime`
- `POST /api/runtime`
- `POST /api/config/model`
- `GET /api/config/model`
- `GET /api/chat/state`
- `POST /api/chat/send`
- `POST /api/chat/clear`
- `POST /api/run`

This is the minimum "frontend and backend are connected" path. The frontend does
not need users to open a terminal.
