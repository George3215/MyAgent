#!/usr/bin/env python3
"""Local EvoScientist Studio API sidecar.

This server is intentionally dependency-free. It can run before EvoScientist is
installed, guide the user through bootstrap, then launch EvoScientist commands
after the core runtime is ready.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import tarfile
import threading
import time
import uuid
import webbrowser
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from urllib.request import urlretrieve

APP_NAME = "EvoScientistStudio"
DEFAULT_REPO_URL = "https://github.com/George3215/MyEvoScientist.git"
DEFAULT_PORT = 6287
CLAUDE_INSTALL_SH = "https://claude.ai/install.sh"
CLAUDE_INSTALL_PS1 = "https://claude.ai/install.ps1"
OLLAMA_INSTALL_SH = "https://ollama.com/install.sh"

LOCK = threading.Lock()
DELETE_COMMANDS = {
    "rm",
    "rmdir",
    "del",
    "erase",
    "rd",
    "remove-item",
    "shred",
    "wipe",
    "sdelete",
}
SYSTEM_DESTRUCTIVE_COMMANDS = {
    "sudo",
    "su",
    "chmod",
    "chown",
    "mkfs",
    "dd",
    "diskutil",
    "format",
    "shutdown",
    "reboot",
    "poweroff",
    "halt",
}
SHELL_COMMANDS = {
    "bash",
    "sh",
    "zsh",
    "fish",
    "cmd",
    "cmd.exe",
    "powershell",
    "powershell.exe",
    "pwsh",
    "pwsh.exe",
}
PROMPT_DESTRUCTIVE_PATTERNS = [
    r"\brm\s+-[A-Za-z]*r[A-Za-z]*f\b",
    r"\brm\s+-[A-Za-z]*f[A-Za-z]*r\b",
    r"\brmdir\s+/(s|q)\b",
    r"\bRemove-Item\b.*\b-Recurse\b.*\b-Force\b",
]
SECURITY_POLICY = {
    "mode": "hard_block_destructive_commands",
    "never_allow": sorted(DELETE_COMMANDS | SYSTEM_DESTRUCTIVE_COMMANDS),
    "shell_execution": "blocked",
    "user_approval_can_override": False,
}


def app_home() -> Path:
    override = os.environ.get("EVOSCIENTIST_STUDIO_HOME")
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_NAME
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / APP_NAME
    base = os.environ.get("XDG_DATA_HOME")
    if base:
        return Path(base) / APP_NAME
    return Path.home() / ".local" / "share" / APP_NAME


HOME = app_home()
CORE_DIR = HOME / "core" / "EvoScientist"
ENV_DIR = HOME / "env"
STATE_DIR = HOME / "state"
LOG_DIR = HOME / "logs"
RUN_DIR = HOME / "runs"
TOOL_DIR = HOME / "tools"
DOWNLOAD_DIR = HOME / "downloads"
WORKSPACE_DIR = HOME / "workspace"
CONFIG_DIR = HOME / "xdg-config" / "evoscientist"
BOOTSTRAP_STATE = STATE_DIR / "bootstrap.json"
MODEL_STATE = STATE_DIR / "model_config.json"
CLAUDE_STATE = STATE_DIR / "claude_code.json"
OLLAMA_STATE = STATE_DIR / "ollama.json"
RUNTIME_STATE = STATE_DIR / "runtime.json"
SECRET_ENV = HOME / "secrets.env"


def ensure_home() -> None:
    for directory in (
        HOME,
        STATE_DIR,
        LOG_DIR,
        RUN_DIR,
        TOOL_DIR,
        DOWNLOAD_DIR,
        WORKSPACE_DIR,
        CONFIG_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default: dict) -> dict:
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return dict(default)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")


def bootstrap_default() -> dict:
    return {
        "status": "not_installed",
        "phase": "waiting",
        "repo_url": DEFAULT_REPO_URL,
        "core_dir": str(CORE_DIR),
        "home": str(HOME),
        "log": str(LOG_DIR / "bootstrap.log"),
        "updated_at": now(),
    }


def claude_default() -> dict:
    return {
        "status": "not_installed",
        "phase": "waiting",
        "path": which("claude"),
        "version": "",
        "authenticated": False,
        "auth_method": "none",
        "api_provider": "",
        "log": str(LOG_DIR / "claude-code.log"),
        "updated_at": now(),
    }


def ollama_default() -> dict:
    return {
        "status": "not_installed",
        "phase": "waiting",
        "path": which("ollama"),
        "version": "",
        "base_url": "http://localhost:11434",
        "launch_claude": False,
        "log": str(LOG_DIR / "ollama.log"),
        "updated_at": now(),
    }


def runtime_default() -> dict:
    return {
        "active_runtime": "claude_code",
        "available": ["claude_code", "evoscientist"],
        "bootstrap_strategy": "claude_code_first",
        "updated_at": now(),
    }


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def append_log(text: str) -> None:
    ensure_home()
    with (LOG_DIR / "bootstrap.log").open("a", encoding="utf-8") as handle:
        handle.write(f"[{now()}] {text}\n")


def append_named_log(name: str, text: str) -> None:
    ensure_home()
    with (LOG_DIR / name).open("a", encoding="utf-8") as handle:
        handle.write(f"[{now()}] {text}\n")


def update_bootstrap(**updates: object) -> dict:
    with LOCK:
        state = load_json(BOOTSTRAP_STATE, bootstrap_default())
        state.update(updates)
        state["updated_at"] = now()
        write_json(BOOTSTRAP_STATE, state)
        return state


def update_claude(**updates: object) -> dict:
    with LOCK:
        state = load_json(CLAUDE_STATE, claude_default())
        state.update(updates)
        state["updated_at"] = now()
        write_json(CLAUDE_STATE, state)
        return state


def update_ollama(**updates: object) -> dict:
    with LOCK:
        state = load_json(OLLAMA_STATE, ollama_default())
        state.update(updates)
        state["updated_at"] = now()
        write_json(OLLAMA_STATE, state)
        return state


def update_runtime(**updates: object) -> dict:
    with LOCK:
        state = load_json(RUNTIME_STATE, runtime_default())
        state.update(updates)
        state["updated_at"] = now()
        write_json(RUNTIME_STATE, state)
        return state


def which(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    candidates: list[Path] = []
    if os.name == "nt":
        local = os.environ.get("LOCALAPPDATA")
        if local:
            candidates.extend([
                Path(local) / "Programs" / name / exe_name(name),
                Path(local) / "Microsoft" / "WindowsApps" / exe_name(name),
            ])
    else:
        home = Path.home()
        candidates.extend([
            home / ".local" / "bin" / name,
            home / "bin" / name,
            Path("/opt/homebrew/bin") / name,
            Path("/usr/local/bin") / name,
            Path("/usr/bin") / name,
            Path("/bin") / name,
        ])
    for candidate in candidates:
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return ""


def exe_name(name: str) -> str:
    return f"{name}.exe" if os.name == "nt" else name


def managed_tool(name: str) -> Path:
    return TOOL_DIR / exe_name(name)


def resource_root() -> Path:
    if getattr(sys, "frozen", False):
        executable = Path(sys.executable).resolve()
        if executable.parent.name == "studio-api":
            return executable.parent.parent
        return executable.parent
    return Path(__file__).resolve().parent.parent


def bundled_uv() -> Path | None:
    candidates = [
        resource_root() / "tools" / exe_name("uv"),
        Path(sys.executable).resolve().parent / "tools" / exe_name("uv"),
        Path.cwd() / "tools" / exe_name("uv"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def uv_env() -> dict:
    env = os.environ.copy()
    env["UV_CACHE_DIR"] = str(HOME / "uv-cache")
    env["UV_TOOL_DIR"] = str(HOME / "uv-tools")
    env["UV_PYTHON_INSTALL_DIR"] = str(HOME / "python")
    return env


def resolve_uv(*, install: bool = False) -> str:
    ensure_home()
    managed = managed_tool("uv")
    if managed.exists():
        return str(managed)

    bundled = bundled_uv()
    if bundled:
        shutil.copy2(bundled, managed)
        make_executable(managed)
        return str(managed)

    path_uv = which("uv")
    if path_uv:
        return path_uv

    if install:
        return str(download_uv())
    return ""


def make_executable(path: Path) -> None:
    if os.name != "nt":
        try:
            path.chmod(path.stat().st_mode | 0o755)
        except OSError:
            pass


def uv_release_asset() -> tuple[str, str]:
    machine = platform.machine().lower()
    arch = "aarch64" if machine in ("arm64", "aarch64") else "x86_64"
    if sys.platform == "darwin":
        return f"uv-{arch}-apple-darwin.tar.gz", "tar"
    if os.name == "nt":
        return f"uv-{arch}-pc-windows-msvc.zip", "zip"
    return f"uv-{arch}-unknown-linux-gnu.tar.gz", "tar"


def download_uv() -> Path:
    ensure_home()
    update_bootstrap(status="installing", phase="install_uv")
    asset, archive_type = uv_release_asset()
    url = f"https://github.com/astral-sh/uv/releases/latest/download/{asset}"
    archive = DOWNLOAD_DIR / asset
    extract_dir = DOWNLOAD_DIR / f"uv-{int(time.time())}"
    append_log(f"Downloading uv: {url}")
    urlretrieve(url, archive)
    extract_dir.mkdir(parents=True, exist_ok=True)
    if archive_type == "zip":
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(extract_dir)
    else:
        with tarfile.open(archive) as tf:
            tf.extractall(extract_dir)
    uv_binary = next((item for item in extract_dir.rglob(exe_name("uv")) if item.is_file()), None)
    if not uv_binary:
        raise RuntimeError(f"uv binary was not found in {archive}")
    target = managed_tool("uv")
    shutil.copy2(uv_binary, target)
    make_executable(target)
    return target


def ensure_python_runtime(uv: str) -> None:
    update_bootstrap(status="installing", phase="install_python", uv=uv, managed_python="3.13")
    run_command([uv, "python", "install", "3.13"], env=uv_env())


def core_is_present(path: Path) -> bool:
    return (path / ".git").exists() or ((path / "pyproject.toml").exists() and (path / "EvoScientist").exists())


def clone_or_download_core(repo_url: str) -> None:
    if CORE_DIR.exists() and core_is_present(CORE_DIR):
        update_bootstrap(status="installing", phase="core_already_available")
        append_log(f"Core already exists: {CORE_DIR}")
        return
    if CORE_DIR.exists():
        raise RuntimeError(f"core path exists but is not a recognized EvoScientist checkout: {CORE_DIR}")

    local_source = Path(repo_url).expanduser()
    if local_source.exists():
        if which("git") and (local_source / ".git").exists():
            update_bootstrap(status="installing", phase="git_clone_local")
            run_command(["git", "clone", "--depth", "1", str(local_source), str(CORE_DIR)])
        else:
            update_bootstrap(status="installing", phase="copy_local_core")
            append_log(f"Copying local EvoScientist source: {local_source}")
            shutil.copytree(local_source, CORE_DIR, ignore=shutil.ignore_patterns(".venv", "__pycache__", "dist", "build"))
        return

    if which("git"):
        update_bootstrap(status="installing", phase="git_clone")
        run_command(["git", "clone", "--depth", "1", str(repo_url), str(CORE_DIR)])
        return

    update_bootstrap(status="installing", phase="download_core_zip")
    download_github_repo_zip(repo_url)


def github_archive_url(repo_url: str) -> str:
    parsed = urlparse(repo_url)
    if parsed.netloc.lower() != "github.com":
        raise RuntimeError("git is unavailable and only GitHub repository URLs can be downloaded as zip archives")
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) < 2:
        raise RuntimeError(f"invalid GitHub repository URL: {repo_url}")
    owner, repo = parts[0], parts[1].removesuffix(".git")
    return f"https://github.com/{owner}/{repo}/archive/refs/heads/main.zip"


def download_github_repo_zip(repo_url: str) -> None:
    archive_url = github_archive_url(repo_url)
    archive = DOWNLOAD_DIR / "evoscientist-main.zip"
    extract_dir = DOWNLOAD_DIR / f"evoscientist-{int(time.time())}"
    append_log(f"Downloading EvoScientist Core archive: {archive_url}")
    urlretrieve(archive_url, archive)
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zf:
        zf.extractall(extract_dir)
    roots = [path for path in extract_dir.iterdir() if path.is_dir()]
    if not roots:
        raise RuntimeError("downloaded EvoScientist archive did not contain a source directory")
    shutil.copytree(roots[0], CORE_DIR)


def run_capture(args: list[str], *, cwd: Path | None = None, env: dict | None = None, timeout: int = 60) -> tuple[int, str]:
    try:
        result = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
        return result.returncode, result.stdout.strip()
    except Exception as exc:
        return 1, str(exc)


def resolve_claude() -> str:
    path = which("claude")
    if path:
        return path
    managed = managed_tool("claude")
    if managed.exists():
        return str(managed)
    return ""


def claude_status() -> dict:
    path = resolve_claude()
    state = load_json(CLAUDE_STATE, claude_default())
    if not path:
        state.update({"status": "not_installed", "path": "", "version": "", "authenticated": False})
        return state
    code, output = run_capture([path, "--version"], timeout=20)
    auth_code, auth_output = run_capture([path, "auth", "status"], timeout=20)
    auth = {}
    if auth_output:
        try:
            auth = json.loads(auth_output)
        except json.JSONDecodeError:
            auth = {"raw": auth_output}
    model_config = load_json(MODEL_STATE, {})
    direct_env_configured = (
        str(model_config.get("provider") or "") != "ollama"
        and str(model_config.get("claude_transport") or "") == "direct"
        and bool(model_config.get("api_key_set"))
    )
    logged_in = bool(auth.get("loggedIn"))
    authenticated = logged_in or direct_env_configured
    phase = "ready" if code == 0 and authenticated else "auth_required"
    if code != 0:
        phase = "version_check_failed"
    state.update(
        {
            "status": "installed" if code == 0 else "error",
            "phase": phase,
            "path": path,
            "version": output,
            "authenticated": authenticated,
            "auth_method": str(auth.get("authMethod") if logged_in else ("env_api_key" if direct_env_configured else "none")),
            "api_provider": str(auth.get("apiProvider") if logged_in else (model_config.get("provider") or "")),
            "auth_status_code": auth_code,
        }
    )
    write_json(CLAUDE_STATE, state)
    return state


def install_claude_code() -> dict:
    ensure_home()
    current = claude_status()
    if current.get("status") == "installed":
        return update_claude(phase="ready")

    update_claude(status="installing", phase="download_official_installer")
    if os.name == "nt":
        installer = DOWNLOAD_DIR / "claude-install.ps1"
        urlretrieve(CLAUDE_INSTALL_PS1, installer)
        args = [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(installer),
        ]
    else:
        installer = DOWNLOAD_DIR / "claude-install.sh"
        urlretrieve(CLAUDE_INSTALL_SH, installer)
        make_executable(installer)
        args = ["/bin/bash", str(installer)] if Path("/bin/bash").exists() else ["sh", str(installer)]

    update_claude(status="installing", phase="run_official_installer", installer=str(installer))
    append_named_log("claude-code.log", f"$ {' '.join(args)}")
    proc = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        append_named_log("claude-code.log", line.rstrip())
    code = proc.wait()
    if code != 0:
        state = update_claude(status="failed", phase="install_failed", error=f"installer exited with {code}")
        raise RuntimeError(str(state["error"]))
    installed = claude_status()
    installed["phase"] = "ready"
    return update_claude(**installed)


def resolve_ollama() -> str:
    path = which("ollama")
    if path:
        return path
    managed = managed_tool("ollama")
    if managed.exists():
        return str(managed)
    return ""


def ollama_status() -> dict:
    path = resolve_ollama()
    state = load_json(OLLAMA_STATE, ollama_default())
    if not path:
        state.update({"status": "not_installed", "path": "", "version": "", "launch_claude": False})
        return state
    code, output = run_capture([path, "--version"], timeout=20)
    launch_code, launch_output = run_capture([path, "launch", "claude", "--help"], timeout=20)
    state.update(
        {
            "status": "installed" if code == 0 else "error",
            "phase": "ready" if code == 0 else "version_check_failed",
            "path": path,
            "version": output,
            "launch_claude": launch_code == 0,
            "launch_help": launch_output[:2000],
        }
    )
    write_json(OLLAMA_STATE, state)
    return state


def install_ollama() -> dict:
    ensure_home()
    current = ollama_status()
    if current.get("status") == "installed":
        return update_ollama(phase="ready")
    if os.name == "nt":
        raise RuntimeError("Windows Ollama installer flow is not packaged yet; install Ollama from https://ollama.com/download/windows")

    installer = DOWNLOAD_DIR / "ollama-install.sh"
    update_ollama(status="installing", phase="download_official_installer", installer=str(installer))
    urlretrieve(OLLAMA_INSTALL_SH, installer)
    make_executable(installer)
    args = ["/bin/bash", str(installer)] if Path("/bin/bash").exists() else ["sh", str(installer)]
    update_ollama(status="installing", phase="run_official_installer")
    append_named_log("ollama.log", f"$ {' '.join(args)}")
    proc = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        append_named_log("ollama.log", line.rstrip())
    code = proc.wait()
    if code != 0:
        state = update_ollama(status="failed", phase="install_failed", error=f"installer exited with {code}")
        raise RuntimeError(str(state["error"]))
    installed = ollama_status()
    installed["phase"] = "ready"
    return update_ollama(**installed)


def claude_allowed_tools() -> str:
    return ",".join(
        [
            "Read",
            "Write",
            "Edit",
            "MultiEdit",
            "Glob",
            "Grep",
            "LS",
            "Bash(git *)",
            "Bash(uv *)",
            "Bash(python *)",
            "Bash(python3 *)",
            "Bash(pip *)",
            "Bash(ls *)",
            "Bash(pwd)",
        ]
    )


def claude_disallowed_tools() -> str:
    return ",".join(
        [
            "Bash(rm *)",
            "Bash(rmdir *)",
            "Bash(del *)",
            "Bash(erase *)",
            "Bash(chmod *)",
            "Bash(chown *)",
            "Bash(sudo *)",
            "Bash(dd *)",
            "Bash(mkfs *)",
            "Bash(diskutil *)",
            "Bash(git reset --hard*)",
            "Bash(git clean *)",
            "Bash(find * -delete*)",
        ]
    )


def claude_print_args(prompt: str) -> tuple[list[str], str]:
    claude = resolve_claude()
    if not claude:
        raise RuntimeError("Claude Code is not installed")
    model_config = load_json(MODEL_STATE, {})
    model = str(model_config.get("model") or "kimi-k2.5:cloud")
    provider = str(model_config.get("provider") or "ollama")
    transport = str(model_config.get("claude_transport") or "ollama")
    use_ollama = provider == "ollama" or transport == "ollama"
    claude_args = [
        "-p",
        "--permission-mode",
        "auto",
        "--allowedTools",
        claude_allowed_tools(),
        "--disallowedTools",
        claude_disallowed_tools(),
    ]
    if use_ollama:
        ollama = resolve_ollama()
        if not ollama:
            raise RuntimeError("Ollama is required for Claude Code Ollama mode")
        return [ollama, "launch", "claude", "--model", model, "--yes", "--", *claude_args], "ollama launch claude"
    return [claude, "--bare", "--model", model, *claude_args], "claude direct"


def run_claude_print(prompt: str, *, cwd: Path, log_path: Path, timeout: int = 1800) -> None:
    args, launcher = claude_print_args(prompt)
    validate_studio_command(args[:3], context="claude_code")
    append_named_log(log_path.name, f"$ {' '.join(args[:-1])} <prompt>")
    with log_path.open("a", encoding="utf-8") as log:
        log.write(f"[{now()}] launcher={launcher}\n")
        proc = subprocess.Popen(
            args,
            cwd=str(cwd),
            env=run_env(),
            stdin=subprocess.PIPE,
            stdout=log,
            stderr=subprocess.STDOUT,
            text=True,
        )
        try:
            proc.communicate(prompt, timeout=timeout)
            code = proc.returncode
        except subprocess.TimeoutExpired as exc:
            proc.kill()
            raise RuntimeError("Claude Code bootstrap timed out") from exc
    if code != 0:
        raise RuntimeError(f"Claude Code exited with {code}; see {log_path}")


def claude_bootstrap_prompt(repo_url: str) -> str:
    return f"""You are running inside EvoScientist Studio's controlled bootstrap workspace.

Goal:
Install or repair EvoScientist Core so Studio can run it later.

Repository:
{repo_url}

Target directory:
{CORE_DIR}

Rules:
- Do not use rm, rm -rf, rmdir, del, chmod, chown, sudo, dd, mkfs, git clean, git reset --hard, or find -delete.
- Keep all generated files inside {HOME}.
- Prefer uv and Python 3.13.
- If Git is available, clone EvoScientist into the target directory.
- If the target already contains EvoScientist, repair dependencies instead of deleting it.
- Run dependency installation with uv sync --python 3.13 from the EvoScientist directory.
- Stop when EvoScientist Core is installed and report the exact command Studio should use to run evosci.
"""


def bootstrap_core_with_claude(payload: dict) -> None:
    repo_url = str(payload.get("repo_url") or DEFAULT_REPO_URL)
    ensure_home()
    update_bootstrap(
        status="installing",
        phase="claude_code_prepare",
        repo_url=repo_url,
        claude=resolve_claude(),
        error="",
    )
    if claude_status().get("status") != "installed":
        install_claude_code()

    uv = resolve_uv(install=True)
    ensure_python_runtime(uv)
    if not CORE_DIR.exists():
        CORE_DIR.parent.mkdir(parents=True, exist_ok=True)

    update_bootstrap(status="installing", phase="claude_code_bootstrap", claude=resolve_claude())
    log_path = LOG_DIR / "claude-bootstrap.log"
    run_claude_print(claude_bootstrap_prompt(repo_url), cwd=HOME, log_path=log_path)

    if not core_is_present(CORE_DIR):
        append_log("Claude Code did not produce a recognized EvoScientist checkout; using deterministic fallback")
        bootstrap_core({"repo_url": repo_url, "install": True})
        return

    update_bootstrap(
        status="installed",
        phase="ready",
        bootstrap_agent="claude_code",
        evosci_command=resolve_evosci_display(),
        core_dir=str(CORE_DIR),
    )


def command_name(value: str) -> str:
    name = Path(value).name.lower()
    if name.endswith(".exe"):
        name = name[:-4]
    return name


def security_block_reason(args: list[str]) -> str:
    if not args:
        return "empty command"
    base = command_name(args[0])
    normalized = [str(arg).strip().strip("'\"").lower() for arg in args]
    normalized_names = [command_name(arg) for arg in normalized if arg]

    if base in DELETE_COMMANDS:
        return f"'{base}' is a destructive delete command and is never allowed"
    if base in SYSTEM_DESTRUCTIVE_COMMANDS:
        return f"'{base}' is a high-impact system command and is never allowed"
    if base in SHELL_COMMANDS:
        return "direct shell execution is not allowed by Studio"
    if any(name in DELETE_COMMANDS for name in normalized_names[1:]):
        return "delegating to a destructive delete command is never allowed"
    if base.startswith("python") and "-c" in normalized[1:]:
        return "inline Python execution is not allowed by Studio"
    if base == "py" and "-c" in normalized[1:]:
        return "inline Python execution is not allowed by Studio"
    if base == "git" and len(normalized) > 1:
        if normalized[1] == "clean":
            return "'git clean' can destroy local work and is never allowed"
        if normalized[1] == "reset" and "--hard" in normalized[2:]:
            return "'git reset --hard' can destroy local work and is never allowed"
    if base == "find" and "-delete" in normalized:
        return "'find -delete' is a destructive delete command and is never allowed"
    return ""


def validate_studio_command(args: list[str], *, context: str) -> None:
    if not isinstance(args, list) or not args or not all(isinstance(arg, str) for arg in args):
        raise RuntimeError("invalid command shape")
    reason = security_block_reason(args)
    if reason:
        append_log(f"SECURITY BLOCK ({context}): {reason}: {' '.join(args)}")
        raise RuntimeError(f"command blocked by Studio security policy: {reason}")


def validate_prompt_policy(prompt: str) -> None:
    for pattern in PROMPT_DESTRUCTIVE_PATTERNS:
        if re.search(pattern, prompt, flags=re.IGNORECASE):
            append_log(f"SECURITY BLOCK (prompt): destructive command pattern '{pattern}'")
            raise RuntimeError(
                "task prompt contains a destructive delete command. "
                "Studio never auto-runs rm -rf / recursive-force delete operations."
            )


def run_command(args: list[str], *, cwd: Path | None = None, env: dict | None = None) -> None:
    validate_studio_command(args, context="bootstrap")
    append_log(f"$ {' '.join(args)}")
    proc = subprocess.Popen(
        args,
        cwd=str(cwd) if cwd else None,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        append_log(line.rstrip())
    code = proc.wait()
    if code != 0:
        raise RuntimeError(f"command failed with exit code {code}: {' '.join(args)}")


def bootstrap_core(payload: dict) -> None:
    repo_url = payload.get("repo_url") or DEFAULT_REPO_URL
    install = bool(payload.get("install", True))
    ensure_home()
    update_bootstrap(
        status="installing",
        phase="checking_tools",
        repo_url=repo_url,
        git=which("git") or "not required: zip fallback enabled",
        studio_runtime=sys.executable,
        uv=resolve_uv(),
        error="",
    )
    append_log("Starting EvoScientist Core bootstrap")

    uv = resolve_uv(install=True)
    ensure_python_runtime(uv)
    clone_or_download_core(str(repo_url))

    if install:
        update_bootstrap(status="installing", phase="uv_sync", managed_python="3.13")
        run_command([uv, "sync", "--python", "3.13"], cwd=CORE_DIR, env=uv_env())

    update_bootstrap(
        status="installed",
        phase="ready",
        evosci_command=resolve_evosci_display(),
        core_dir=str(CORE_DIR),
    )
    append_log("EvoScientist Core bootstrap finished")


def venv_bin(name: str) -> str:
    if os.name == "nt":
        return str(ENV_DIR / "Scripts" / f"{name}.exe")
    return str(ENV_DIR / "bin" / name)


def resolve_evosci_command() -> tuple[list[str], Path | None]:
    uv = resolve_uv()
    if uv and CORE_DIR.exists():
        return [uv, "run", "--python", "3.13", "evosci"], CORE_DIR
    candidate = Path(venv_bin("evosci"))
    if os.name == "nt":
        candidate = Path(venv_bin("evosci"))
    if candidate.exists():
        return [str(candidate)], None
    exe = which("evosci") or which("EvoSci") or which("evoscientist")
    if exe:
        return [exe], None
    return [sys.executable, "-m", "EvoScientist"], CORE_DIR if CORE_DIR.exists() else None


def resolve_evosci_display() -> str:
    cmd, cwd = resolve_evosci_command()
    suffix = f"  (cwd: {cwd})" if cwd else ""
    return " ".join(cmd) + suffix


def public_model_config() -> dict:
    data = load_json(MODEL_STATE, {})
    if not data:
        return {"configured": False}
    public = dict(data)
    public.pop("api_key", None)
    public["api_key_set"] = bool(data.get("api_key_set"))
    public["configured"] = True
    return public


def list_runs(limit: int = 20) -> dict:
    ensure_home()
    records = []
    for path in STATE_DIR.glob("run-*.json"):
        record = load_json(path, {})
        if record:
            if record.get("status") == "running" and record.get("pid") and not pid_is_running(int(record["pid"])):
                record.update(
                    {
                        "status": "stale",
                        "error": "process is no longer running; run ended before Studio watcher recorded the exit",
                        "finished_at": now(),
                    }
                )
                write_json(path, record)
            records.append(record)
    records.sort(key=lambda item: str(item.get("started_at") or item.get("finished_at") or ""), reverse=True)
    records = records[:limit]
    return {"runs": records, "count": len(records)}


def pid_is_running(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False


def save_model_config(payload: dict) -> dict:
    ensure_home()
    mode = str(payload.get("mode") or "local_model")
    provider = str(payload.get("provider") or provider_for_mode(mode))
    model = str(payload.get("model") or payload.get("default_model") or "kimi-k2.5:cloud")
    api_base = str(payload.get("api_base") or "")
    api_key = str(payload.get("api_key") or "")
    workspace = str(payload.get("workspace") or WORKSPACE_DIR)
    claude_transport = str(payload.get("claude_transport") or ("ollama" if provider == "ollama" else "direct"))
    anthropic_base_url = str(payload.get("anthropic_base_url") or default_anthropic_base_url(provider, api_base))

    stored = {
        "mode": mode,
        "provider": provider,
        "model": model,
        "api_base": api_base,
        "anthropic_base_url": anthropic_base_url,
        "claude_transport": claude_transport,
        "workspace": workspace,
        "key_storage": "local_secret_env",
        "api_key_set": bool(api_key) or bool(load_json(MODEL_STATE, {}).get("api_key_set")),
        "updated_at": now(),
    }
    write_json(MODEL_STATE, stored)
    write_evosci_config(stored, api_key)
    return public_model_config()


def provider_for_mode(mode: str) -> str:
    if mode == "managed_gateway":
        return "custom-openai"
    if mode == "local_model":
        return "ollama"
    return "deepseek"


def default_anthropic_base_url(provider: str, api_base: str) -> str:
    if provider != "deepseek":
        return ""
    base = (api_base or "https://api.deepseek.com").rstrip("/")
    if base.endswith("/anthropic"):
        return base
    return f"{base}/anthropic"


def write_evosci_config(config: dict, api_key: str) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    workspace = Path(str(config["workspace"])).expanduser()
    workspace.mkdir(parents=True, exist_ok=True)
    yaml_lines = [
        f"provider: {config['provider']}",
        f"model: {config['model']}",
        "ui_backend: cli",
        "default_mode: daemon",
        "auto_approve: false",
        "dangerous_mode: false",
        "shell_allow_list: \"\"",
        f"default_workdir: {quote_yaml(str(workspace))}",
    ]
    provider = str(config["provider"])
    api_base = str(config.get("api_base") or "")
    anthropic_base = str(config.get("anthropic_base_url") or default_anthropic_base_url(provider, api_base))
    claude_transport = str(config.get("claude_transport") or "")
    key = api_key or read_existing_secret(provider)
    if provider == "custom-openai":
        yaml_lines.append(f"custom_openai_base_url: {quote_yaml(api_base)}")
    elif provider == "deepseek":
        pass
    elif provider == "ollama":
        yaml_lines.append(f"ollama_base_url: {quote_yaml(api_base or 'http://localhost:11434')}")
    (CONFIG_DIR / "config.yaml").write_text("\n".join(yaml_lines) + "\n", "utf-8")

    env_lines = [
        f"XDG_CONFIG_HOME={shell_value(str(HOME / 'xdg-config'))}",
        f"EVOSCIENTIST_WORKSPACE_DIR={shell_value(str(workspace))}",
    ]
    if provider == "custom-openai":
        if key:
            env_lines.append(f"CUSTOM_OPENAI_API_KEY={shell_value(key)}")
        if api_base:
            env_lines.append(f"CUSTOM_OPENAI_BASE_URL={shell_value(api_base)}")
    elif provider == "deepseek" and key:
        env_lines.append(f"DEEPSEEK_API_KEY={shell_value(key)}")
        if claude_transport == "direct" and anthropic_base:
            env_lines.append(f"ANTHROPIC_API_KEY={shell_value(key)}")
            env_lines.append(f"ANTHROPIC_AUTH_TOKEN={shell_value(key)}")
            env_lines.append(f"ANTHROPIC_BASE_URL={shell_value(anthropic_base)}")
    elif provider == "ollama":
        ollama_base = api_base or "http://localhost:11434"
        env_lines.append(f"OLLAMA_BASE_URL={shell_value(ollama_base)}")
        env_lines.append(f"ANTHROPIC_AUTH_TOKEN={shell_value(key or 'ollama')}")
        env_lines.append(f"ANTHROPIC_BASE_URL={shell_value(ollama_base)}")
        env_lines.append("ANTHROPIC_API_KEY=")
    SECRET_ENV.write_text("\n".join(env_lines) + "\n", "utf-8")
    try:
        SECRET_ENV.chmod(0o600)
    except OSError:
        pass


def quote_yaml(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def shell_value(value: str) -> str:
    return value.replace("\n", "")


def read_existing_secret(provider: str) -> str:
    if not SECRET_ENV.exists():
        return ""
    key_name = {
        "custom-openai": "CUSTOM_OPENAI_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
    }.get(provider)
    if not key_name:
        return ""
    for line in SECRET_ENV.read_text("utf-8").splitlines():
        if line.startswith(f"{key_name}="):
            return line.split("=", 1)[1]
    return ""


def run_env() -> dict:
    env = uv_env()
    env["XDG_CONFIG_HOME"] = str(HOME / "xdg-config")
    env["EVOSCIENTIST_DANGEROUS_MODE"] = "false"
    env["EVOSCIENTIST_STUDIO_SECURITY_POLICY"] = SECURITY_POLICY["mode"]
    env["EVOSCIENTIST_STUDIO_BLOCKED_COMMANDS"] = ",".join(SECURITY_POLICY["never_allow"])
    if SECRET_ENV.exists():
        for line in SECRET_ENV.read_text("utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                key, value = line.split("=", 1)
                env[key] = value
    model = load_json(MODEL_STATE, {})
    if model.get("provider") == "ollama" or model.get("claude_transport") == "ollama":
        base_url = str(model.get("api_base") or "http://localhost:11434")
        env.setdefault("OLLAMA_BASE_URL", base_url)
        env.setdefault("ANTHROPIC_AUTH_TOKEN", "ollama")
        env.setdefault("ANTHROPIC_BASE_URL", base_url)
        env.setdefault("ANTHROPIC_API_KEY", "")
    return env


def active_runtime(payload: dict | None = None) -> str:
    if payload and payload.get("runtime"):
        runtime = str(payload.get("runtime"))
    else:
        runtime = str(load_json(RUNTIME_STATE, runtime_default()).get("active_runtime") or "evoscientist")
    if runtime not in {"claude_code", "evoscientist"}:
        raise RuntimeError(f"unsupported runtime: {runtime}")
    return runtime


def start_claude_run(prompt: str, workspace: Path, run_id: str, log_path: Path, timeout_seconds: int) -> dict:
    state = claude_status()
    if state.get("status") != "installed" or state.get("phase") == "auth_required":
        raise RuntimeError("Claude Code is not installed or authenticated")
    workspace.mkdir(parents=True, exist_ok=True)
    thread = threading.Thread(
        target=claude_run_thread,
        args=(prompt, workspace, log_path, run_id, timeout_seconds),
        daemon=True,
    )
    thread.start()
    return {
        "run_id": run_id,
        "status": "running",
        "runtime": "claude_code",
        "prompt": prompt,
        "log_path": str(log_path),
        "timeout_seconds": timeout_seconds,
        "started_at": now(),
    }


def claude_run_thread(prompt: str, workspace: Path, log_path: Path, run_id: str, timeout_seconds: int) -> None:
    try:
        run_claude_print(prompt, cwd=workspace, log_path=log_path, timeout=timeout_seconds)
        record = load_json(STATE_DIR / f"run-{run_id}.json", {})
        record.update({"status": "done", "finished_at": now()})
        write_json(STATE_DIR / f"run-{run_id}.json", record)
    except Exception as exc:
        append_named_log(log_path.name, f"ERROR: {exc}")
        record = load_json(STATE_DIR / f"run-{run_id}.json", {})
        record.update({"status": "failed", "error": str(exc), "finished_at": now()})
        write_json(STATE_DIR / f"run-{run_id}.json", record)


def evosci_run_thread(proc: subprocess.Popen, log_path: Path, run_id: str, timeout_seconds: int) -> None:
    timed_out = False
    try:
        code = proc.wait(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        timed_out = True
        proc.kill()
        code = proc.wait()
    record = load_json(STATE_DIR / f"run-{run_id}.json", {})
    update = {"exit_code": code, "finished_at": now()}
    if timed_out:
        update["status"] = "failed"
        update["error"] = f"EvoScientist timed out after {timeout_seconds}s; see {log_path}"
    elif code == 0:
        update["status"] = "done"
    else:
        update["status"] = "failed"
        update["error"] = f"EvoScientist exited with {code}; see {log_path}"
    record.update(update)
    write_json(STATE_DIR / f"run-{run_id}.json", record)


def start_run(payload: dict) -> dict:
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        raise RuntimeError("prompt is required")
    validate_prompt_policy(prompt)
    workspace = Path(str(payload.get("workspace") or WORKSPACE_DIR)).expanduser()
    workspace.mkdir(parents=True, exist_ok=True)
    timeout_seconds = int(payload.get("timeout_seconds") or 1800)
    run_id = uuid.uuid4().hex[:12]
    log_path = RUN_DIR / f"{run_id}.log"

    runtime = active_runtime(payload)
    if runtime == "claude_code":
        record = start_claude_run(prompt, workspace, run_id, log_path, timeout_seconds)
        write_json(STATE_DIR / f"run-{run_id}.json", record)
        return record

    if load_json(BOOTSTRAP_STATE, bootstrap_default()).get("status") != "installed":
        raise RuntimeError("EvoScientist Core is not installed yet")
    if not public_model_config().get("configured"):
        raise RuntimeError("model/API configuration is missing")

    cmd, cwd = resolve_evosci_command()
    full_cmd = cmd + [
        "-p",
        prompt,
        "--ui",
        "cli",
        "--workdir",
        str(workspace),
    ]
    validate_studio_command(full_cmd, context="run")
    with log_path.open("w", encoding="utf-8") as log:
        proc = subprocess.Popen(
            full_cmd,
            cwd=str(cwd) if cwd else None,
            env=run_env(),
            stdout=log,
            stderr=subprocess.STDOUT,
            text=True,
        )
    record = {
        "run_id": run_id,
        "status": "running",
        "runtime": "evoscientist",
        "prompt": prompt,
        "pid": proc.pid,
        "log_path": str(log_path),
        "security_policy": SECURITY_POLICY["mode"],
        "timeout_seconds": timeout_seconds,
        "started_at": now(),
    }
    write_json(STATE_DIR / f"run-{run_id}.json", record)
    thread = threading.Thread(
        target=evosci_run_thread,
        args=(proc, log_path, run_id, timeout_seconds),
        daemon=True,
    )
    thread.start()
    return record


class StudioHandler(BaseHTTPRequestHandler):
    server_version = "EvoScientistStudioAPI/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed.path)
            return
        self.serve_static(parsed.path)

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.send_response(200)
            self.send_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            return
        self.serve_static(parsed.path, head_only=True)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.respond({"error": "not found"}, status=404)
            return
        try:
            length = int(self.headers.get("content-length") or "0")
            payload = json.loads(self.rfile.read(length) or b"{}")
            self.handle_api_post(parsed.path, payload)
        except Exception as exc:
            self.respond({"error": str(exc)}, status=400)

    def handle_api_get(self, path: str) -> None:
        if path == "/api/health":
            self.respond(
                {
                    "ok": True,
                    "studio_home": str(HOME),
                    "core_dir": str(CORE_DIR),
                    "bootstrap": load_json(BOOTSTRAP_STATE, bootstrap_default()),
                    "claude": claude_status(),
                    "ollama": ollama_status(),
                    "runtime": load_json(RUNTIME_STATE, runtime_default()),
                    "model": public_model_config(),
                    "security": SECURITY_POLICY,
                }
            )
        elif path == "/api/bootstrap/status":
            self.respond(load_json(BOOTSTRAP_STATE, bootstrap_default()))
        elif path == "/api/config/model":
            self.respond(public_model_config())
        elif path == "/api/runs":
            self.respond(list_runs())
        elif path == "/api/security/policy":
            self.respond(SECURITY_POLICY)
        elif path == "/api/claude/status":
            self.respond(claude_status())
        elif path == "/api/ollama/status":
            self.respond(ollama_status())
        elif path == "/api/runtime":
            self.respond(load_json(RUNTIME_STATE, runtime_default()))
        elif path == "/api/logs/bootstrap":
            log = LOG_DIR / "bootstrap.log"
            text = log.read_text("utf-8") if log.exists() else ""
            self.respond({"log": text[-20000:]})
        else:
            self.respond({"error": "not found"}, status=404)

    def handle_api_post(self, path: str, payload: dict) -> None:
        if path == "/api/bootstrap/start":
            state = load_json(BOOTSTRAP_STATE, bootstrap_default())
            if state.get("status") == "installing":
                self.respond(state)
                return
            thread = threading.Thread(target=self.bootstrap_thread, args=(payload,), daemon=True)
            thread.start()
            self.respond(update_bootstrap(status="installing", phase="queued"))
        elif path == "/api/claude/install":
            state = load_json(CLAUDE_STATE, claude_default())
            if state.get("status") == "installing":
                self.respond(state)
                return
            thread = threading.Thread(target=self.claude_install_thread, daemon=True)
            thread.start()
            self.respond(update_claude(status="installing", phase="queued"))
        elif path == "/api/ollama/install":
            state = load_json(OLLAMA_STATE, ollama_default())
            if state.get("status") == "installing":
                self.respond(state)
                return
            thread = threading.Thread(target=self.ollama_install_thread, daemon=True)
            thread.start()
            self.respond(update_ollama(status="installing", phase="queued"))
        elif path == "/api/runtime":
            runtime = active_runtime(payload)
            self.respond(update_runtime(active_runtime=runtime))
        elif path == "/api/config/model":
            self.respond(save_model_config(payload))
        elif path == "/api/run":
            self.respond(start_run(payload))
        else:
            self.respond({"error": "not found"}, status=404)

    @staticmethod
    def bootstrap_thread(payload: dict) -> None:
        try:
            strategy = str(payload.get("strategy") or "claude_code_first")
            if strategy == "deterministic":
                bootstrap_core(payload)
            else:
                bootstrap_core_with_claude(payload)
        except Exception as exc:
            append_log(f"ERROR: {exc}")
            update_bootstrap(status="failed", phase="failed", error=str(exc))

    @staticmethod
    def claude_install_thread() -> None:
        try:
            install_claude_code()
        except Exception as exc:
            append_named_log("claude-code.log", f"ERROR: {exc}")
            update_claude(status="failed", phase="failed", error=str(exc))

    @staticmethod
    def ollama_install_thread() -> None:
        try:
            install_ollama()
        except Exception as exc:
            append_named_log("ollama.log", f"ERROR: {exc}")
            update_ollama(status="failed", phase="failed", error=str(exc))

    def serve_static(self, path: str, *, head_only: bool = False) -> None:
        ui_dir: Path = self.server.ui_dir  # type: ignore[attr-defined]
        clean = unquote(path).split("?", 1)[0].lstrip("/")
        target = (ui_dir / clean).resolve() if clean else ui_dir / "index.html"
        if not str(target).startswith(str(ui_dir.resolve())):
            self.respond({"error": "forbidden"}, status=403)
            return
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            target = ui_dir / "index.html"
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def respond(self, data: dict, *, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt: str, *args: object) -> None:
        append_log("http " + (fmt % args))


def find_free_port(preferred: int) -> int:
    for port in [preferred, 0]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
                return int(sock.getsockname()[1])
            except OSError:
                continue
    raise RuntimeError("no free local port found")


def monitor_parent_process(pid: int) -> None:
    while True:
        time.sleep(2)
        try:
            os.kill(pid, 0)
        except OSError:
            os._exit(0)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ui", default="dist/studio-ui", help="Studio UI directory")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--open", action="store_true", help="Open the Studio URL")
    args = parser.parse_args()

    ensure_home()
    parent_pid = os.environ.get("EVOSCIENTIST_STUDIO_NATIVE_PID")
    if parent_pid and parent_pid.isdigit():
        threading.Thread(target=monitor_parent_process, args=(int(parent_pid),), daemon=True).start()
    ui_dir = Path(args.ui).expanduser().resolve()
    if not ui_dir.exists():
        raise SystemExit(f"UI directory not found: {ui_dir}")
    port = find_free_port(args.port)
    server = ThreadingHTTPServer(("127.0.0.1", port), StudioHandler)
    server.ui_dir = ui_dir  # type: ignore[attr-defined]
    url = f"http://127.0.0.1:{port}"
    print(f"EvoScientist Studio API: {url}", flush=True)
    print(f"Studio home: {HOME}", flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
