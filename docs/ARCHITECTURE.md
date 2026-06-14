# Architecture

## Goal

Build one cross-platform Studio product around the existing EvoScientist agent
runtime without forcing users to operate a terminal UI.

The original EvoScientist project remains a compatibility target, but packaged
Studio builds install the owner-controlled Core source from
`https://github.com/George3215/MyEvoScientist.git`. Studio adds the product
shell, local API adapter, permission layer, and visualization layer around that
Core runtime.

## Shared Layers

```text
Studio UI
        |
Local Studio API
        |
Runtime switch
        |
        +-- Claude Code runtime
        |
        +-- EvoScientist compatibility adapter
                |
                +-- EvoScientist LangGraph agent runtime
                        |
                        +-- SQLite + workspace files + memory
```

## EvoScientist Compatibility

Studio should not fork user-visible behavior directly into the original project
at the beginning. Keep these parts separate:

- `EvoScientist Core`: cloned from `George3215/MyEvoScientist` and installed
  into a Studio-managed Python runtime.
- `Claude Code Runtime`: installed or detected first, then used as the
  installation/repair agent for EvoScientist and as an optional research
  runtime.
- `Studio API`: local sidecar that serves the UI, installs EvoScientist Core,
  stores model configuration, switches runtimes, and exposes `/api/*`.
- `Studio Adapter`: local API behavior that converts CLI/TUI events into structured
  `runEvent`, `task`, `experiment`, `quota`, `artifact`, and `analytics` data.
- `Studio UI`: desktop-facing product interface.
- `Studio Installer`: platform-specific bootstrapper that can clone, install,
  repair, upgrade, and launch the core runtime.

This keeps the Studio product independent from upstream changes. The owner fork
can be patched for compatibility first, then upstream changes can be pulled only
after they have been tested against Studio.

## Connected First-Run Flow

The first-run success criterion is deliberately narrow: Claude Code must be
installed or detected, and Studio must be able to launch a Claude Code task from
the UI. Ollama is the preferred model routing layer for domestic/local models,
but it should not make the app fail to open. EvoScientist Core is an optional
advanced install after Claude Code is working.

The packaged app must follow this order:

1. Launch `studio-api` on a local free port.
2. Serve Studio UI from that API process.
3. UI calls `GET /api/health`.
4. UI calls `GET /api/claude/status`.
5. If Claude Code is missing, UI calls `POST /api/claude/install`, which runs
   the official Claude Code installer as an explicit vendor installation action.
6. UI calls `GET /api/ollama/status`.
7. If Ollama is missing, UI calls `POST /api/ollama/install`.
8. User fills API base, optional token, provider, and Claude model. The default
   MVP model path is Ollama: `ANTHROPIC_BASE_URL=http://localhost:11434`,
   `ANTHROPIC_AUTH_TOKEN=ollama`, and model names such as `kimi-k2.5:cloud` or
   `glm-5:cloud`.
9. UI calls `POST /api/config/model`.
10. User approves EvoScientist installation.
11. UI calls `POST /api/bootstrap/start` with `strategy=claude_code_first`.
12. API starts Claude Code through `ollama launch claude --model ... --yes --`
    in non-interactive print mode with a restricted install/repair plan and
    disallowed destructive commands.
13. Claude Code clones/downloads EvoScientist, prepares `uv` and Python 3.13,
    runs `uv sync --python 3.13`, then exits.
14. Studio marks EvoScientist Core installed and exposes a runtime switch.
15. User chooses `claude_code` or `evoscientist` through `POST /api/runtime`.
16. User sends a task.
17. UI calls `POST /api/run`, which launches the selected runtime.

## Platform Layers

Only the shell and installer are platform-specific:

- Windows launcher and installer.
- macOS `.app` bundle and `.dmg`.
- Linux AppImage/deb/rpm and `.desktop` file.

## Port Strategy

The backend selects a free local port at runtime. The desktop shell writes the
actual API base URL into the frontend boot config. The frontend never hard-codes
the local backend port.

## Data Strategy

Use platform-standard data directories:

- Windows: `%LOCALAPPDATA%/EvoScientistStudio`
- macOS: `~/Library/Application Support/EvoScientistStudio`
- Linux: `$XDG_DATA_HOME/EvoScientistStudio` or `~/.local/share/EvoScientistStudio`

## Recovery Strategy

Use three layers:

- Conversation resume through EvoScientist checkpoints.
- Run resume through append-only `run_events`.
- Experiment resume through persistent experiment cards.

## Authorization Strategy

The desktop shell must request explicit user approval before high-impact actions:

- Clone or update EvoScientist.
- Install or update Claude Code through the official installer.
- Install Python dependencies.
- Read and write a selected workspace.
- Call a model provider or managed gateway.
- Collect task, experiment, usage, and error metrics for visualization.

All approvals should be persisted as revocable permission grants with timestamps,
scope, and current status.

Destructive delete and system-level commands are not permission grants. The
Studio adapter must hard-block `rm -rf`, `rmdir`, `del`, `Remove-Item`,
`find -delete`, `git clean`, `git reset --hard`, `sudo`, `dd`, `mkfs`, reboot,
shutdown, and comparable destructive operations before they reach any shell or
agent tool executor. User approval must not override this policy.
