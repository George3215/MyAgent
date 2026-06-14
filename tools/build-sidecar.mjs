import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const platform = process.platform === "darwin" ? "macos" : process.platform;
const python = process.env.PYTHON || process.env.PYTHON3 || "python3";
const outDir = join(root, "dist", "sidecar", platform);

await mkdir(outDir, { recursive: true });

const version = spawnSync(python, ["-c", "import sys; print('.'.join(map(str, sys.version_info[:3])))"], {
  cwd: root,
  encoding: "utf8",
  stdio: "pipe",
});
if (version.status !== 0) {
  throw new Error(`Unable to run ${python}: ${version.stderr || version.stdout}`);
}
const [major, minor] = version.stdout.trim().split(".").map(Number);
if (major !== 3 || minor < 11 || minor >= 14) {
  throw new Error(`EvoScientist sidecar requires Python >=3.11 and <3.14, got ${version.stdout.trim()}`);
}

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
  encoding: "utf8",
  stdio: "inherit",
});

if (result.status !== 0) {
  throw new Error("PyInstaller sidecar build failed");
}

console.log(`Built sidecar into ${outDir}`);

function resolveUvPyinstaller() {
  const uvx = spawnSync("uvx", ["--from", "pyinstaller", "pyinstaller", "--version"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (uvx.status !== 0) {
    throw new Error(
      `PyInstaller is required. Install it with: ${python} -m pip install pyinstaller\n` +
      `uvx fallback also failed: ${uvx.stderr || uvx.stdout}`,
    );
  }
  return { bin: "uvx", prefix: ["--from", "pyinstaller", "pyinstaller"] };
}
