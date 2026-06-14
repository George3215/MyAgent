# Changelog

## 0.1.8 - 2026-06-14

- Restored the clean light UI palette for daily use.
- Kept the simplified primary navigation: Workbench, Experiments, Install/Model, Analytics, Security.
- Added visible Claude Code, Ollama, EvoScientist Core, and security gateway status panels.
- Merged model/API setup into the install flow so first-run configuration is visible.
- Added red deny and green allow approval buttons with centered Chinese labels.
- Added a native macOS app launcher backed by `WKWebView`; packaged macOS builds no longer open the UI in Safari or Chrome.
- Bundled the `studio-api` sidecar path for macOS packaging and kept Python fallback for development.
- Improved Claude Code detection for macOS GUI launches by searching `~/.local/bin`, Homebrew paths, and standard system paths.
- Added parent-process monitoring so the sidecar exits when the native macOS app exits.
- Kept destructive command execution blocked by policy; delete/system commands such as `rm`, `rmdir`, `sudo`, `dd`, and `mkfs` are not user-overridable.

## Earlier Local Builds

Local installer artifacts from `0.1.0` through `0.1.7` may remain in
`dist/installers/` for comparison and rollback testing. They are intentionally
ignored by Git. Publish only reviewed release artifacts through GitHub Releases.
