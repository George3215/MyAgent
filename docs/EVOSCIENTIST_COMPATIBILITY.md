# EvoScientist Compatibility

## Principle

EvoScientist Studio should keep the current EvoScientist project available as a
standalone core runtime. The desktop product should not require users to open a
terminal, but it should also avoid directly rewriting the upstream repository.

## Target Layout

```text
EvoScientist Studio app
  apps/studio-ui              desktop-facing UI
  apps/desktop-shell          Tauri/Electron shell
  apps/studio-api             local sidecar API
  adapter/evoscientist-core   calls upstream EvoScientist

User data directory
  core/EvoScientist           cloned official repository
  env/                        Python virtual environment
  runs/                       append-only run event logs
  experiments/                experiment cards and metrics
  artifacts/                  reports, charts, code, exported files
  config/                     non-secret config
```

## Adapter Responsibilities

The adapter should translate EvoScientist behavior into stable Studio data:

- Chat text and model output become `runEvent` records.
- Tool calls become auditable events with input, output, duration, and status.
- Checkpoints remain compatible with EvoScientist resume behavior.
- Generated files become `artifact` records.
- Task state becomes a structured progress model.
- Experiment hypotheses and results become analytics snapshots.

Current bootstrap behavior:

- Clone upstream EvoScientist if it is missing.
- Prefer `uv sync` for dependency installation.
- Fall back to Python venv + `pip install -e`.
- Write isolated EvoScientist config under the Studio data directory.
- Launch EvoScientist with `evosci -p <prompt> --ui cli --workdir <workspace>`.

## Upgrade Path

Keep upstream EvoScientist as a pinned version at first. Later releases can add:

- Adapter version checks.
- Safe upstream update and rollback.
- Migration scripts for Studio metadata.
- Optional deep integration patches contributed back upstream.
