# Studio API

`studio_api.py` is the local sidecar API used by EvoScientist Studio.

Responsibilities:

- Serve the Studio frontend from one local port.
- Clone and install EvoScientist Core on first run.
- Store model/API configuration for EvoScientist.
- Launch EvoScientist one-shot tasks from the Studio UI.

The implementation uses the Python standard library so the packaged preview can
run without installing FastAPI first. A production build can replace this with a
FastAPI app while preserving the same endpoint contract.
