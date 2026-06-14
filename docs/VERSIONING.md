# Versioning

## Source Control

Use Git tags for product source versions:

```bash
git tag v0.1.9
git push origin main
git push origin v0.1.9
```

The repository should track source code, docs, packaging scripts, contract
schemas, and icon assets.

Do not commit generated build output:

- `dist/`
- PyInstaller work directories
- `.dmg`, `.pkg`, `.zip`, `.tar.gz`, `.AppImage`
- local logs and temporary installer state

These are already covered by `.gitignore` or should be attached to GitHub
Releases after verification.

## Local Installer Artifacts

It is acceptable to keep old local installers under `dist/installers/` while
testing. This preserves rollback points without mixing build artifacts into the
source repository.

Current clean macOS build:

```text
dist/installers/EvoScientist-Studio-0.1.9-macos.dmg
dist/installers/EvoScientist-Studio-0.1.9-macos.pkg
```

## Release Rules

- Increment `package.json` before building a new installer.
- Rebuild `studio-api` with `npm run build:sidecar` whenever
  `apps/studio-api/studio_api.py` changes.
- Run `npm run check`, `python -m py_compile`, and `node --check` before
  packaging.
- Verify macOS packages with `hdiutil verify` and `plutil -p`.
- Test packaged `.app` launch before tagging.
- Keep GitHub source tags and GitHub Release artifact versions aligned.
