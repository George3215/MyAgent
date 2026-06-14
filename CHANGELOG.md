# Changelog

## 0.1.17 - 2026-06-14

- Reworked the chat composer spacing so the runtime selector, prompt box, and `发送` button keep stable widths across compact and wide desktop layouts.
- Added lightweight slide/fade transitions for sidebars, inspector panels, session log, backend panels, and repeated cards.
- Restyled the Studio shell toward a macOS-like light palette with softer system grays, restrained system blue accents, lower contrast shadows, and less warning-color noise.
- Verified the updated layout at 1280px and 2048px widths; the send button no longer clips and panel toggles remain icon-only.

## 0.1.16 - 2026-06-14

- Added `apps/studio-ui/src/info-adapter.js` as the editable frontend information adapter for health, runs, chat state, quota, analytics, and experiment data.
- Documented the protected UI boundary so Claude Code can update information endpoints without touching the chat layout, composer, send flow, or destructive command policy.
- Updated frontend checks to require the adapter boundary and prevent mutable information endpoints from being hard-coded back into the main UI.
- Wired optional analytics, quota, and experiment interfaces to real adapter values; missing data still displays `--` or `暂未接收`.

## 0.1.15 - 2026-06-14

- Removed prototype-only dashboard numbers from the Studio UI; unavailable quota, plan, cost, experiment, memory, and analytics data now display `--` or `暂未接收`.
- Made right-side inspector cards individually icon-collapsible and removed visible `折叠` / `展开` wording from the frontend.
- Increased the chat composer area with a larger multi-line input and green focus affordance.
- Reworked experiment and analytics views to derive their content from real `/api/runs` data instead of static demo cards.

## 0.1.14 - 2026-06-14

- Moved the left navigation collapse control into the sidebar and made collapse controls icon-only, so Workbench/Experiment navigation can collapse without visible Chinese button text.
- Rebuilt the packaged macOS app after the EvoScientist non-TTY runtime fix and the sidebar collapse UI update.

## 0.1.13 - 2026-06-14

- Fixed the packaged macOS EvoScientist runtime path by launching EvoScientist Core in Studio-controlled non-interactive mode, avoiding terminal-only approval prompts inside the native app.
- Kept destructive command blocking in Studio before run creation and in EvoScientist Core command execution; `rm -rf` style prompts still do not create runs.
- Reverified the packaged app with Claude Code, DeepSeek direct mode, chat history refresh/clear, collapsible panels, Core bootstrap from `George3215/MyEvoScientist.git`, and the EvoScientist runtime path.

## 0.1.12 - 2026-06-14

- Added collapsible non-chat panels for the app sidebar, inspector, chat history, backend status, and current session log.
- Fixed Chinese text alignment and overflow in small controls, status badges, approval buttons, and compact backend cards.
- Rewrote the main README in Chinese and documented the repository split: `George3215/MyAgent.git` for the App/frontend and `George3215/MyEvoScientist.git` for EvoScientist Core.
- Reverified UI -> studio-api -> Claude Code -> DeepSeek direct mode, including model configuration, chat history persistence, refresh, clear, and destructive command blocking.
- Reverified UI -> studio-api -> EvoScientist Core -> DeepSeek using the installed Core test environment.

## 0.1.9 - 2026-06-14

- Changed the default EvoScientist Core source to `https://github.com/George3215/MyEvoScientist.git`.
- Kept the original upstream EvoScientist concept as a compatibility target, but installation and future repair flows now use the owner-controlled fork to avoid upstream breaking changes.
- Hardened the macOS native launcher lifecycle so the app window remains available from the Dock and the sidecar is stopped only when the app terminates.
- Added DeepSeek BYOK support for both EvoScientist Core and Claude Code direct mode, including the separate Anthropic-compatible base URL used by Claude Code.
- Added a real `/api/runs` endpoint and frontend run feed so the UI shows actual backend run records instead of static progress placeholders.
- Added run watchers and timeouts for Claude Code and EvoScientist tasks so completed, failed, stale, and timed-out runs are reflected in state.
- Verified the full UI -> studio-api -> Claude Code -> DeepSeek and UI -> studio-api -> EvoScientist Core -> DeepSeek paths with real model calls.
- Made sidecar packaging select Python 3.13/3.12/3.11 automatically and keep uv/PyInstaller caches inside `dist/`.

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
