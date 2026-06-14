# Onboarding and Authorization

## First Run Flow

The app should guide users one step at a time:

1. Install and launch EvoScientist Studio from the platform installer.
2. Start the bundled local `studio-api` sidecar.
3. Detect Claude Code.
4. If Claude Code is missing, offer a one-click official Claude Code installer.
5. Detect Ollama.
6. If Ollama is missing, offer a one-click official Ollama installer.
7. Ask for automation permissions.
8. Choose model mode for the MVP: Ollama Claude Code, BYOK, or local model.
9. Fill API base, API key/token, Claude model name, and optional quota limit.
10. Test Claude Code + Ollama connectivity.
11. Start Claude Code through `ollama launch claude` as the EvoScientist
    installation/repair agent.
12. Let Claude Code install EvoScientist Core, then exit.
13. Choose active research runtime: `claude_code` or `evoscientist`.
14. Save configuration and open the chat workspace.

## Required Permission Grants

- `install_project`: clone EvoScientist and create a managed runtime directory.
- `install_claude_code`: install or verify Claude Code through the official
  vendor installer.
- `install_ollama`: install or verify Ollama so Claude Code can use domestic or
  local model routes through the Ollama integration.
- `install_dependencies`: create virtual environment and install packages.
- `workspace_files`: read and write files in user-approved workspaces.
- `model_calls`: call Ollama, user API key, managed gateway, or local model
  provider.
- `runtime_switch`: choose whether research tasks run through Claude Code or
  EvoScientist.
- `analytics`: collect task success rate, experiment effect, usage, and errors.

Optional grants:

- `auto_update`: check and apply Studio or adapter updates.
- `crash_report`: upload redacted crash metadata.

## Security Rules

- Product master tokens must stay on your server.
- User-provided API keys should be stored in the OS keychain when possible.
- Every automated action should have a permission scope and audit record.
- Users must be able to revoke permissions from the Authorization Center.
- The adapter should refuse workspace writes outside approved directories.
- Destructive delete commands are never approvable. Studio must hard-block
  `rm`, `rm -rf`, `rmdir`, `del`, `erase`, `Remove-Item`, `shred`, `wipe`,
  `sdelete`, `find -delete`, `git clean`, and `git reset --hard` even if a user
  has granted automation permissions.
- Studio must not expose dangerous mode in the commercial desktop flow.
  Automation approval means "run permitted research actions", not "bypass the
  command safety policy".
- Direct shell execution (`bash -c`, `sh -c`, `cmd /c`, PowerShell, or inline
  Python with `-c`) must go through a future reviewed command broker instead of
  being executed blindly by the local sidecar.
- Claude Code may be used as an install/repair agent, but it must run with
  restricted allowed tools and explicit destructive-command deny rules.

## Data Visualization Metrics

The first analytics dashboard should include:

- Push success rate for reports, code, charts, and experiment outputs.
- Experiment effectiveness by hypothesis, variable, and result score.
- Cost by model, task, project, and day.
- Resume success rate from checkpoints and run events.
- Failure categories: API, dependency, permission, execution, parsing.
