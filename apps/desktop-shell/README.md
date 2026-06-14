# Desktop Shell Placeholder

This folder is reserved for the cross-platform desktop shell.

Recommended path:

1. Keep `apps/studio-ui` as the shared web frontend.
2. Package the Python/FastAPI Studio backend as a sidecar process.
3. Use Tauri first if the Python sidecar workflow is acceptable.
4. Use Electron if packaging, WebView, or sidecar behavior blocks Tauri.

The shell must inject the actual local API URL into the frontend at launch.
The UI must not hard-code ports such as `4716`.

