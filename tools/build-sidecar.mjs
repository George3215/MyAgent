import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const platform = process.platform === "darwin" ? "macos" : process.platform;
const python = resolvePython();
const outDir = join(root, "dist", "sidecar", platform);

await mkdir(outDir, { recursive: true });

const pyinstaller = spawnSync(python, ["-m", "PyInstaller", "--version"], {
  cwd: root,
  encoding: "utf8",
  stdio: "pipe",
});
const pyinstallerCommand =
  pyinstaller.status === 0
    ? { bin: python, prefix: ["-m", "PyInstaller"] }
    : resolveUvPyinstaller();

const result = spawnSync(pyinstallerCommand.bin, [
  ...pyinstallerCommand.prefix,
  "--onefile",
  "--clean",
  "--name",
  "studio-api",
  "--distpath",
  outDir,
  "--workpath",
  join(root, "dist", "pyinstaller-work", platform),
  "--specpath",
  join(root, "dist", "pyinstaller-spec", platform),
  "apps/studio-api/studio_api.py",
], {
  cwd: root,
  env: pyinstallerCommand.env || process.env,
  encoding: "utf8",
  stdio: "inherit",
});

if (result.status !== 0) {
  throw new Error("PyInstaller sidecar build failed");
}

console.log(`Built sidecar into ${outDir}`);

function resolvePython() {
  const candidates = [
    process.env.PYTHON,
    process.env.PYTHON3,
    "python3.13",
    "python3.12",
    "python3.11",
    "python3",
  ].filter(Boolean);
  const errors = [];
  for (const candidate of candidates) {
    const version = spawnSync(candidate, ["-c", "import sys; print('.'.join(map(str, sys.version_info[:3])))"], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
    if (version.status !== 0) {
      errors.push(`${candidate}: ${version.stderr || version.stdout || "not runnable"}`);
      continue;
    }
    const [major, minor] = version.stdout.trim().split(".").map(Number);
    if (major === 3 && minor >= 11 && minor < 14) {
      return candidate;
    }
    errors.push(`${candidate}: Python ${version.stdout.trim()} is outside >=3.11,<3.14`);
  }
  throw new Error(`EvoScientist sidecar requires Python >=3.11 and <3.14.\n${errors.join("\n")}`);
}

function resolveUvPyinstaller() {
  const uvCache = join(root, "dist", "uv-cache");
  const uvTools = join(root, "dist", "uv-tools");
  const uvPython = join(root, "dist", "uv-python");
  mkdirSync(uvCache, { recursive: true });
  mkdirSync(uvTools, { recursive: true });
  mkdirSync(uvPython, { recursive: true });
  const uvx = spawnSync("uvx", ["--from", "pyinstaller", "pyinstaller", "--version"], {
    cwd: root,
    env: {
      ...process.env,
      UV_CACHE_DIR: uvCache,
      UV_TOOL_DIR: uvTools,
      UV_PYTHON_INSTALL_DIR: uvPython,
    },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (uvx.status !== 0) {
    throw new Error(
      `PyInstaller is required. Install it with: ${python} -m pip install pyinstaller\n` +
      `uvx fallback also failed: ${uvx.stderr || uvx.stdout}`,
    );
  }
  return {
    bin: "uvx",
    prefix: ["--from", "pyinstaller", "pyinstaller"],
    env: {
      ...process.env,
      UV_CACHE_DIR: uvCache,
      UV_TOOL_DIR: uvTools,
      UV_PYTHON_INSTALL_DIR: uvPython,
    },
  };
}
