# Packaging

The source of truth is `tools/package.mjs`. It generates platform-specific
package folders and installer inputs from the shared Studio UI build.

Every package includes:

- `studio-ui`: the frontend.
- `studio-api`: the local sidecar API that serves the frontend and controls
  EvoScientist bootstrap/config/run actions.

For production packages that do not require users to install Python, build the
sidecar binary on each target platform before packaging:

```bash
PYTHON=python3.11 npm run build:sidecar
npm run package
```

The package launcher prefers the binary:

- macOS: native app launcher + `studio-api/studio-api`
- Linux: `studio-api/studio-api`
- Windows: `studio-api/studio-api.exe`

If the binary is absent, the launcher falls back to `python3 studio_api.py`.

## macOS

Run on macOS:

```bash
npm run package:mac
```

Outputs:

- `dist/packages/macos/EvoScientist Studio.app`
- `dist/installers/EvoScientist-Studio-0.1.9-macos.dmg`
- `dist/installers/EvoScientist-Studio-0.1.9-macos.pkg`

The macOS `.app` opens an internal `WKWebView` window and starts the bundled
sidecar. It should not launch Safari or Chrome for normal use.

## Windows

Run anywhere to generate Windows package inputs:

```bash
npm run package:windows
```

Outputs:

- `dist/installers/EvoScientist-Studio-0.1.9-windows-portable.zip`
- `dist/packages/windows/EvoScientist-Studio/install.ps1`
- `dist/packages/windows/EvoScientist-Studio/EvoScientistStudio.iss`

Build the native `.exe` on Windows with Inno Setup:

```powershell
iscc dist\packages\windows\EvoScientist-Studio\EvoScientistStudio.iss
```

## Linux

Run anywhere to generate Linux package inputs:

```bash
npm run package:linux
```

Outputs:

- `dist/installers/EvoScientist-Studio-0.1.9-linux-appdir.tar.gz`
- `dist/packages/linux/EvoScientist-Studio.AppDir`

Build an AppImage on Linux with `appimagetool`.
