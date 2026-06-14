# Packaging Plan

## Current Packaging Commands

This repo now has dependency-free packaging commands:

```bash
npm run package
npm run package:mac
npm run package:mac:full
npm run package:windows
npm run package:linux
```

Generated outputs:

```text
dist/packages/macos/EvoScientist Studio.app
dist/installers/EvoScientist-Studio-0.1.9-macos.dmg
dist/installers/EvoScientist-Studio-0.1.9-macos.pkg

dist/packages/windows/EvoScientist-Studio/
dist/packages/windows/EvoScientist-Studio/install.ps1
dist/packages/windows/EvoScientist-Studio/EvoScientistStudio.iss
dist/installers/EvoScientist-Studio-0.1.9-windows-portable.zip

dist/packages/linux/EvoScientist-Studio.AppDir/
dist/packages/linux/EvoScientist-Studio.AppDir/install.sh
dist/installers/EvoScientist-Studio-0.1.9-linux-appdir.tar.gz
```

The packages start the local `studio-api` sidecar and serve the Studio UI from
it. A full macOS package bundles the sidecar binary and a platform `uv` binary,
then loads the UI in a native `WKWebView` app window rather than opening a
browser tab.
The first-run flow is Claude Code-first: Studio detects or installs Claude Code,
guides API/key setup, starts Claude Code as the EvoScientist install/repair
agent, then lets the user switch between Claude Code and EvoScientist as the
active research runtime.

## Phase 1: macOS visual prototype

- Build and preview `apps/studio-ui`.
- Confirm product layout, density, navigation, and progress panels.
- Generate `.app` and `.dmg` on macOS.

## Phase 2: Windows package

- Package Python backend with PyInstaller or Nuitka.
- Package frontend static assets with the app.
- Create installer and shortcuts.
- Hide terminal by default.

Current Windows output includes:

- A portable zip that opens the UI preview. A native Windows shell remains a
  packaging follow-up.
- `install.ps1`, which copies the package into
  `%LOCALAPPDATA%\Programs\EvoScientistStudio` and creates a desktop shortcut.
- `EvoScientistStudio.iss`, an Inno Setup script for producing a real `.exe`
  installer on Windows.

On a Windows build machine with Inno Setup installed:

```powershell
iscc dist\packages\windows\EvoScientist-Studio\EvoScientistStudio.iss
```

## Phase 3: macOS and Linux packages

- macOS: `.app` and `.dmg`, then signing/notarization when distribution starts.
- Linux: `.AppImage` first, then `.deb` and `.rpm` if needed.

Current Linux output includes:

- `EvoScientist-Studio.AppDir`, compatible with AppImage packaging.
- `install.sh`, which installs the preview launcher into the user's XDG data
  directory and creates a local command launcher.
- A `.tar.gz` archive for transfer to Linux machines.

On a Linux build machine with `appimagetool` installed:

```bash
appimagetool dist/packages/linux/EvoScientist-Studio.AppDir \
  dist/installers/EvoScientist-Studio-0.1.9-linux.AppImage
```

## Phase 4: Desktop shell

Preferred shell: Tauri.

Fallback shell: Electron.

Tauri is lighter, but Electron may be more forgiving for Python sidecar and
WebView compatibility issues.

## Installer Responsibilities

The packaged app should be installable without terminal usage. First launch
should run a guided bootstrapper:

1. Start the bundled `studio-api` sidecar.
2. Detect Claude Code with `claude --version`.
3. If missing, download and run the official Claude Code installer.
4. Ask the user to choose Claude Code auth, BYOK, or local model mode for the
   non-commercial MVP.
5. Collect API base, API key, default model, and optional quota limit.
6. Start Claude Code with a restricted install/repair plan.
7. Copy bundled `uv` into the Studio data directory, or download `uv` if needed.
8. Install managed Python 3.13 through `uv`.
9. Clone the official EvoScientist repository when Git is available, or download
   the GitHub zip archive when Git is missing.
10. Create or repair the EvoScientist Python environment.
11. Install EvoScientist dependencies with `uv sync --python 3.13`.
12. Store secrets in the OS keychain or encrypted local store.
13. Let the user switch active runtime: Claude Code or EvoScientist.
14. Open the main chat workspace.

The installer should never store a product master token in the client. In
managed gateway mode the client receives only a user/session credential for your
server.

## Production Installer Gap

The current full macOS installer is ready for first-run bootstrap testing. Before
selling this as a production automation product, these components must still be
completed:

- Signed/notarized `studio-api` sidecar binary for each platform.
- Signed/notarized Claude Code bootstrap workflow, with a clear user consent
  screen before vendor installer execution.
- Update and repair flows for EvoScientist Core.
- OS keychain integration for API keys.
- Signed macOS `.dmg`, signed Windows `.exe`, and Linux AppImage metadata.
- A first-run wizard that blocks automation until permissions are approved.

The source version already includes a Python standard-library sidecar at
`apps/studio-api/studio_api.py`. For production distribution, package this
sidecar with PyInstaller/Nuitka so users do not need to install Python manually.

Use for a full macOS test package:

```bash
PYTHON=python3.13 npm run package:mac:full
```

The launcher prefers a bundled `studio-api` binary when present and falls back
to `python3 studio_api.py` only for development builds.
