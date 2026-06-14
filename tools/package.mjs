import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readText("package.json"));
const version = pkg.version || "0.0.0";
const requested = getArg("--platform") || "all";
const platforms = requested === "all" ? ["macos", "windows", "linux"] : [requested];
const packageRoot = "dist/packages";
const installerRoot = "dist/installers";

await import("./build.mjs");
await mkdir(packageRoot, { recursive: true });
await mkdir(installerRoot, { recursive: true });

for (const platform of platforms) {
  if (platform === "macos") {
    await packageMacos();
  } else if (platform === "windows") {
    await packageWindows();
  } else if (platform === "linux") {
    await packageLinux();
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

console.log(`Prepared ${platforms.join(", ")} packages in ${packageRoot}`);

async function packageMacos() {
  const appName = "EvoScientist Studio.app";
  const appDir = join(packageRoot, "macos", appName);
  const contentsDir = join(appDir, "Contents");
  const macosDir = join(contentsDir, "MacOS");
  const resourcesDir = join(contentsDir, "Resources");
  const pkgRoot = join(packageRoot, "macos-pkgroot");
  const pkgAppDir = join(pkgRoot, "Applications", appName);
  const componentPlist = join(packageRoot, "macos-component.plist");
  await rm(join(packageRoot, "macos"), { recursive: true, force: true });
  await rm(pkgRoot, { recursive: true, force: true });
  await rm(componentPlist, { force: true });
  await mkdir(macosDir, { recursive: true });
  await mkdir(resourcesDir, { recursive: true });
  await copyDir("dist/studio-ui", join(resourcesDir, "studio-ui"));
  await copyDir("apps/studio-api", join(resourcesDir, "studio-api"));
  await copySidecar("macos", join(resourcesDir, "studio-api"));
  await copyBundledUv("macos", join(resourcesDir, "tools"));
  await copyAppIcon(resourcesDir);
  await writeFile(join(contentsDir, "Info.plist"), macInfoPlist(version));
  await writeMacLauncher(macosDir);
  await writeFile(join(resourcesDir, "README_FIRST_RUN.txt"), firstRunText("macOS"));
  await createApplicationsLink(join(packageRoot, "macos", "Applications"));
  stripMacExtendedAttributes(join(packageRoot, "macos"));

  if (process.platform === "darwin") {
    const dmg = join(installerRoot, `EvoScientist-Studio-${version}-macos.dmg`);
    await rm(dmg, { force: true });
    const result = spawnSync("hdiutil", [
      "create",
      "-volname",
      "EvoScientist Studio",
      "-srcfolder",
      join(packageRoot, "macos"),
      "-ov",
      "-format",
      "UDZO",
      dmg,
    ], { cwd: root, stdio: "pipe", encoding: "utf8" });
    if (result.status === 0) {
      console.log(`Created ${dmg}`);
    } else {
      console.warn(`Skipped DMG creation: ${result.stderr || result.stdout}`);
    }
    const pkg = join(installerRoot, `EvoScientist-Studio-${version}-macos.pkg`);
    await rm(pkg, { force: true });
    await copyDir(appDir, pkgAppDir);
    await chmod(join(pkgAppDir, "Contents", "MacOS", "EvoScientist Studio"), 0o755);
    stripMacExtendedAttributes(pkgRoot);
    await writeFile(componentPlist, macComponentPlist(appName, version));
    const pkgResult = spawnSync("pkgbuild", [
      "--root",
      join(root, pkgRoot),
      "--component-plist",
      join(root, componentPlist),
      "--identifier",
      "com.evoscientist.studio",
      "--version",
      version,
      "--install-location",
      "/",
      "--ownership",
      "recommended",
      pkg,
    ], { cwd: root, stdio: "pipe", encoding: "utf8", env: noAppleDoubleEnv() });
    if (pkgResult.status === 0) {
      console.log(`Created ${pkg}`);
    } else {
      console.warn(`Skipped PKG creation: ${pkgResult.stderr || pkgResult.stdout}`);
    }
  } else {
    console.log("Skipped DMG creation because this host is not macOS.");
  }
}

function macComponentPlist(appName, version) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
  <dict>
    <key>BundleHasStrictIdentifier</key><true/>
    <key>BundleIsRelocatable</key><false/>
    <key>BundleIsVersionChecked</key><false/>
    <key>BundleOverwriteAction</key><string>upgrade</string>
    <key>RootRelativeBundlePath</key><string>Applications/${escapeXml(appName)}</string>
    <key>ChildBundles</key><array/>
  </dict>
</array>
</plist>
`;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stripMacExtendedAttributes(path) {
  if (process.platform !== "darwin") {
    return;
  }
  const commands = [
    ["-cr", path],
    ["-dr", "com.apple.provenance", path],
  ];
  for (const args of commands) {
    const result = spawnSync("xattr", args, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    });
    if (result.status !== 0 && !String(result.stderr || result.stdout).includes("No such xattr")) {
      console.warn(`Could not strip extended attributes from ${path}: ${result.stderr || result.stdout}`);
    }
  }
}

async function createApplicationsLink(path) {
  if (process.platform !== "darwin") {
    return;
  }
  try {
    await symlink("/Applications", path, "dir");
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
  }
}

function noAppleDoubleEnv() {
  return { ...process.env, COPYFILE_DISABLE: "1" };
}

async function packageWindows() {
  const outDir = join(packageRoot, "windows", "EvoScientist-Studio");
  await rm(join(packageRoot, "windows"), { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await copyDir("dist/studio-ui", join(outDir, "studio-ui"));
  await copyDir("apps/studio-api", join(outDir, "studio-api"));
  await copySidecar("win32", join(outDir, "studio-api"));
  await copyBundledUv("win32", join(outDir, "tools"));
  await writeFile(join(outDir, "EvoScientist-Studio.cmd"), windowsLauncher());
  await writeFile(join(outDir, "install.ps1"), windowsInstaller(version));
  await writeFile(join(outDir, "EvoScientistStudio.iss"), windowsInnoSetup(version));
  await writeFile(join(outDir, "README_FIRST_RUN.txt"), firstRunText("Windows"));

  const zipPath = join(installerRoot, `EvoScientist-Studio-${version}-windows-portable.zip`);
  await rm(zipPath, { force: true });
  const result = createZip(join(root, packageRoot, "windows"), "EvoScientist-Studio", join(root, zipPath));
  if (result.status === 0) {
    console.log(`Created ${zipPath}`);
  } else {
    console.warn(`Skipped Windows zip creation: ${result.stderr || result.stdout}`);
  }
}

async function packageLinux() {
  const appDir = join(packageRoot, "linux", "EvoScientist-Studio.AppDir");
  const appRoot = join(appDir, "usr", "share", "evoscientist-studio");
  await rm(join(packageRoot, "linux"), { recursive: true, force: true });
  await mkdir(appRoot, { recursive: true });
  await copyDir("dist/studio-ui", join(appRoot, "studio-ui"));
  await copyDir("apps/studio-api", join(appRoot, "studio-api"));
  await copySidecar("linux", join(appRoot, "studio-api"));
  await copyBundledUv("linux", join(appRoot, "tools"));
  await writeFile(join(appDir, "AppRun"), linuxAppRun());
  await chmod(join(appDir, "AppRun"), 0o755);
  await writeFile(join(appDir, "evoscientist-studio.desktop"), linuxDesktopFile());
  await writeFile(join(appDir, "install.sh"), linuxInstaller());
  await chmod(join(appDir, "install.sh"), 0o755);
  await writeFile(join(appRoot, "README_FIRST_RUN.txt"), firstRunText("Linux"));

  const tarPath = join(installerRoot, `EvoScientist-Studio-${version}-linux-appdir.tar.gz`);
  await rm(tarPath, { force: true });
  const result = spawnSync("tar", ["-czf", join(root, tarPath), "EvoScientist-Studio.AppDir"], {
    cwd: join(root, packageRoot, "linux"),
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status === 0) {
    console.log(`Created ${tarPath}`);
  } else {
    console.warn(`Skipped Linux tarball creation: ${result.stderr || result.stdout}`);
  }
}

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(join(root, from));
  for (const entry of entries) {
    const source = join(root, from, entry);
    const target = join(to, entry);
    const info = await stat(source);
    if (info.isDirectory()) {
      await copyDir(join(from, entry), target);
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

async function copySidecar(platform, to) {
  const exe = platform === "win32" ? "studio-api.exe" : "studio-api";
  const source = join(root, "dist", "sidecar", platform, exe);
  if (!existsSync(source)) {
    return;
  }
  await mkdir(to, { recursive: true });
  const target = join(to, exe);
  await copyFile(source, target);
  if (platform !== "win32") {
    await chmod(target, 0o755);
  }
}

async function copyBundledUv(platform, to) {
  if (!hostCanBundle(platform)) {
    return;
  }
  const uv = findCommand(platform === "win32" ? "uv.exe" : "uv");
  if (!uv) {
    return;
  }
  await mkdir(to, { recursive: true });
  const target = join(to, platform === "win32" ? "uv.exe" : "uv");
  await copyFile(uv, target);
  if (platform !== "win32") {
    await chmod(target, 0o755);
  }
}

async function copyAppIcon(to) {
  const icon = join(root, "assets", "app-icon", "EvoScientistStudio.icns");
  if (!existsSync(icon)) {
    console.warn("App icon missing: run npm run make:icons before packaging.");
    return;
  }
  await copyFile(icon, join(to, "EvoScientistStudio.icns"));
}

async function writeMacLauncher(macosDir) {
  const output = join(macosDir, "EvoScientist Studio");
  if (process.platform !== "darwin") {
    await writeFile(output, macLauncher());
    await chmod(output, 0o755);
    return;
  }

  const source = join(packageRoot, "macos-launcher.swift");
  await writeFile(source, macNativeLauncherSwift());
  const result = spawnSync("swiftc", [
    source,
    "-O",
    "-framework",
    "Cocoa",
    "-framework",
    "WebKit",
    "-o",
    output,
  ], { cwd: root, stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Could not build native macOS launcher: ${result.stderr || result.stdout}`);
  }
  await chmod(output, 0o755);
}

function hostCanBundle(platform) {
  if (platform === "macos") return process.platform === "darwin";
  if (platform === "win32") return process.platform === "win32";
  if (platform === "linux") return process.platform === "linux";
  return false;
}

function findCommand(name) {
  const finder = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(finder, [name], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

async function readText(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(join(root, path), "utf8");
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function createZip(cwd, entry, outputPath) {
  const zipResult = spawnSync("zip", ["-qr", outputPath, entry], {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (zipResult.status === 0 || process.platform !== "win32") {
    return zipResult;
  }
  return spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Compress-Archive -Path '${entry}' -DestinationPath '${outputPath.replaceAll("'", "''")}' -Force`,
  ], {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function macInfoPlist(version) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>zh_CN</string>
  <key>CFBundleDisplayName</key><string>EvoScientist Studio</string>
  <key>CFBundleExecutable</key><string>EvoScientist Studio</string>
  <key>CFBundleIdentifier</key><string>com.evoscientist.studio</string>
  <key>CFBundleIconFile</key><string>EvoScientistStudio</string>
  <key>CFBundleName</key><string>EvoScientist Studio</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key><true/>
  </dict>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`;
}

function macNativeLauncherSwift() {
  return `import Cocoa
import Foundation
import WebKit

final class StudioAppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
  private var window: NSWindow?
  private var webView: WKWebView?
  private var apiProcess: Process?
  private var stdoutPipe: Pipe?
  private var stderrPipe: Pipe?
  private var logHandle: FileHandle?
  private var outputBuffer = ""
  private var loaded = false

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    openLog()
    createWindow()
    startApi()
    DispatchQueue.main.asyncAfter(deadline: .now() + 8.0) {
      if !self.loaded {
        self.writeLog("API URL was not observed; trying default port.\\n")
        self.loadStudio("http://127.0.0.1:6287")
      }
    }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    writeLog("applicationShouldTerminateAfterLastWindowClosed=false\\n")
    return false
  }

  func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
    if !flag {
      window?.makeKeyAndOrderFront(nil)
      NSApp.activate(ignoringOtherApps: true)
    }
    return true
  }

  func windowWillClose(_ notification: Notification) {
    writeLog("main window closed; app remains available from Dock.\\n")
  }

  func applicationWillTerminate(_ notification: Notification) {
    writeLog("applicationWillTerminate\\n")
    stdoutPipe?.fileHandleForReading.readabilityHandler = nil
    stderrPipe?.fileHandleForReading.readabilityHandler = nil
    if let process = apiProcess, process.isRunning {
      process.terminate()
    }
    try? logHandle?.close()
  }

  private func createWindow() {
    let configuration = WKWebViewConfiguration()
    configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.allowsBackForwardNavigationGestures = true

    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered,
      defer: false
    )
    window.title = "EvoScientist Studio"
    window.minSize = NSSize(width: 1040, height: 680)
    window.contentView = webView
    window.isReleasedWhenClosed = false
    window.delegate = self
    window.center()
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)

    self.webView = webView
    self.window = window
  }

  private func startApi() {
    guard let resources = Bundle.main.resourceURL else {
      showError("无法定位应用资源目录。")
      return
    }

    let apiBinary = resources.appendingPathComponent("studio-api/studio-api").path
    let apiPython = resources.appendingPathComponent("studio-api/studio_api.py").path
    let uiDir = resources.appendingPathComponent("studio-ui").path
    let process = Process()
    let environment = launcherEnvironment()

    if FileManager.default.isExecutableFile(atPath: apiBinary) {
      process.executableURL = URL(fileURLWithPath: apiBinary)
      process.arguments = ["--ui", uiDir, "--port", "6287"]
    } else if let python = findExecutable(["python3.13", "python3.12", "python3.11", "python3"], environment: environment) {
      process.executableURL = URL(fileURLWithPath: python)
      process.arguments = [apiPython, "--ui", uiDir, "--port", "6287"]
    } else {
      showError("没有找到内置 sidecar，也没有可用的 Python 3.11-3.13。")
      return
    }

    process.environment = environment
    process.currentDirectoryURL = resources

    let stdout = Pipe()
    let stderr = Pipe()
    process.standardOutput = stdout
    process.standardError = stderr
    stdoutPipe = stdout
    stderrPipe = stderr
    installOutputHandler(stdout, parseUrl: true)
    installOutputHandler(stderr, parseUrl: false)

    process.terminationHandler = { process in
      DispatchQueue.main.async {
        self.writeLog("studio-api exited with status \\(process.terminationStatus).\\n")
        if !self.loaded {
          self.showError("本地后端启动失败，退出码：\\(process.terminationStatus)。日志在 ~/Library/Application Support/EvoScientistStudio/logs/native-window.log")
        }
      }
    }

    do {
      try process.run()
      apiProcess = process
      writeLog("studio-api launched.\\n")
    } catch {
      showError("无法启动本地后端：\\(error.localizedDescription)")
    }
  }

  private func installOutputHandler(_ pipe: Pipe, parseUrl: Bool) {
    pipe.fileHandleForReading.readabilityHandler = { handle in
      let data = handle.availableData
      guard !data.isEmpty else { return }
      let text = String(data: data, encoding: .utf8) ?? ""
      self.writeLog(text)
      if parseUrl {
        self.observeOutput(text)
      }
    }
  }

  private func observeOutput(_ text: String) {
    outputBuffer += text
    if outputBuffer.count > 8000 {
      outputBuffer.removeFirst(outputBuffer.count - 8000)
    }
    guard !loaded else { return }
    if let url = firstMatch(in: outputBuffer, pattern: "EvoScientist Studio API: (http://127\\\\.0\\\\.0\\\\.1:[0-9]+)") {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
        self.loadStudio(url)
      }
    }
  }

  private func loadStudio(_ urlString: String) {
    guard !loaded, let url = URL(string: urlString), let webView else { return }
    loaded = true
    writeLog("Loading Studio UI: \\(urlString)\\n")
    webView.load(URLRequest(url: url))
  }

  private func showError(_ message: String) {
    loaded = true
    let html = """
    <!doctype html>
    <meta charset="utf-8">
    <body style="margin:0;background:#08090f;color:#f4f7fb;font:15px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <main style="padding:28px;max-width:780px;">
        <h1 style="color:#fcee09;">EvoScientist Studio 启动失败</h1>
        <p style="line-height:1.6;color:#c8d3e4;">\\(escapeHtml(message))</p>
      </main>
    </body>
    """
    webView?.loadHTMLString(html, baseURL: nil)
  }

  private func launcherEnvironment() -> [String: String] {
    var env = ProcessInfo.processInfo.environment
    let home = NSHomeDirectory()
    let prefix = [
      "\\(home)/.local/bin",
      "\\(home)/bin",
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin"
    ].joined(separator: ":")
    env["PATH"] = prefix + ":" + (env["PATH"] ?? "")
    env["PYTHONUNBUFFERED"] = "1"
    env["EVOSCIENTIST_STUDIO_NATIVE_PID"] = String(ProcessInfo.processInfo.processIdentifier)
    return env
  }

  private func findExecutable(_ names: [String], environment: [String: String]) -> String? {
    let paths = (environment["PATH"] ?? "").split(separator: ":").map(String.init)
    for name in names {
      for path in paths {
        let candidate = URL(fileURLWithPath: path).appendingPathComponent(name).path
        if FileManager.default.isExecutableFile(atPath: candidate) {
          return candidate
        }
      }
    }
    return nil
  }

  private func firstMatch(in text: String, pattern: String) -> String? {
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    guard let match = regex.firstMatch(in: text, range: range), match.numberOfRanges > 1 else { return nil }
    guard let valueRange = Range(match.range(at: 1), in: text) else { return nil }
    return String(text[valueRange])
  }

  private func openLog() {
    guard let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return }
    let logDir = support.appendingPathComponent("EvoScientistStudio/logs", isDirectory: true)
    try? FileManager.default.createDirectory(at: logDir, withIntermediateDirectories: true)
    let logURL = logDir.appendingPathComponent("native-window.log")
    if !FileManager.default.fileExists(atPath: logURL.path) {
      FileManager.default.createFile(atPath: logURL.path, contents: nil)
    }
    logHandle = try? FileHandle(forWritingTo: logURL)
    logHandle?.seekToEndOfFile()
    writeLog("\\n--- EvoScientist Studio native window launch ---\\n")
  }

  private func writeLog(_ text: String) {
    guard let data = text.data(using: .utf8) else { return }
    logHandle?.write(data)
  }

  private func escapeHtml(_ value: String) -> String {
    value
      .replacingOccurrences(of: "&", with: "&amp;")
      .replacingOccurrences(of: "<", with: "&lt;")
      .replacingOccurrences(of: ">", with: "&gt;")
      .replacingOccurrences(of: "\\\"", with: "&quot;")
      .replacingOccurrences(of: "'", with: "&#039;")
  }
}

private var retainedDelegate: StudioAppDelegate? = StudioAppDelegate()
let app = NSApplication.shared
app.delegate = retainedDelegate
app.run()
`;
}

function macLauncher() {
  return `#!/bin/zsh
APP_CONTENTS="$(cd "$(dirname "$0")/.." && pwd)"
API_BIN="$APP_CONTENTS/Resources/studio-api/studio-api"
API_PY="$APP_CONTENTS/Resources/studio-api/studio_api.py"
UI="$APP_CONTENTS/Resources/studio-ui"
if [ -x "$API_BIN" ]; then
  exec "$API_BIN" --ui "$UI" --port 6287 --open
fi
if [ -n "\${PYTHON_BIN:-}" ] && command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  exec "$PYTHON_BIN" "$API_PY" --ui "$UI" --port 6287 --open
fi
for PY in python3.13 python3.12 python3.11 python3; do
  if command -v "$PY" >/dev/null 2>&1; then
    exec "$PY" "$API_PY" --ui "$UI" --port 6287 --open
  fi
done
exit 1
`;
}

function windowsLauncher() {
  return `@echo off
setlocal
set APP_DIR=%~dp0
if exist "%APP_DIR%studio-api\\studio-api.exe" (
  "%APP_DIR%studio-api\\studio-api.exe" --ui "%APP_DIR%studio-ui" --port 6287 --open
  goto :eof
)
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3.13 "%APP_DIR%studio-api\\studio_api.py" --ui "%APP_DIR%studio-ui" --port 6287 --open
  if %ERRORLEVEL% EQU 0 goto :eof
  py -3.12 "%APP_DIR%studio-api\\studio_api.py" --ui "%APP_DIR%studio-ui" --port 6287 --open
  if %ERRORLEVEL% EQU 0 goto :eof
  py -3.11 "%APP_DIR%studio-api\\studio_api.py" --ui "%APP_DIR%studio-ui" --port 6287 --open
  if %ERRORLEVEL% EQU 0 goto :eof
  py -3 "%APP_DIR%studio-api\\studio_api.py" --ui "%APP_DIR%studio-ui" --port 6287 --open
  goto :eof
)
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  python "%APP_DIR%studio-api\\studio_api.py" --ui "%APP_DIR%studio-ui" --port 6287 --open
  goto :eof
)
echo Python 3.11-3.13 is required to run EvoScientist Studio.
pause
endlocal
`;
}

function linuxAppRun() {
  return `#!/usr/bin/env sh
APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
API="$APP_DIR/usr/share/evoscientist-studio/studio-api/studio_api.py"
API_BIN="$APP_DIR/usr/share/evoscientist-studio/studio-api/studio-api"
UI="$APP_DIR/usr/share/evoscientist-studio/studio-ui"
if [ -x "$API_BIN" ]; then
  exec "$API_BIN" --ui "$UI" --port 6287 --open
fi
for PY in python3.13 python3.12 python3.11 python3; do
  if command -v "$PY" >/dev/null 2>&1; then
    exec "$PY" "$API" --ui "$UI" --port 6287 --open
  fi
done
printf '%s\\n' "Python 3.11-3.13 is required to run EvoScientist Studio."
exit 1
`;
}

function linuxDesktopFile() {
  return `[Desktop Entry]
Type=Application
Name=EvoScientist Studio
Comment=Cross-platform EvoScientist research automation Studio
Exec=AppRun
Terminal=false
Categories=Science;Development;Education;
`;
}

function windowsInstaller(version) {
  return `param(
  [string]$InstallDir = "$env:LOCALAPPDATA\\Programs\\EvoScientistStudio"
)

$ErrorActionPreference = "Stop"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path "$Source\\*" -Destination $InstallDir -Recurse -Force

$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "EvoScientist Studio.lnk"
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $InstallDir "EvoScientist-Studio.cmd"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "EvoScientist Studio ${version}"
$Shortcut.Save()

Write-Host "Installed EvoScientist Studio to $InstallDir"
Write-Host "Desktop shortcut: $ShortcutPath"
`;
}

function windowsInnoSetup(version) {
  return `#define MyAppName "EvoScientist Studio"
#define MyAppVersion "${version}"
#define MyAppPublisher "EvoScientist Studio"
#define MyAppExeName "EvoScientist-Studio.cmd"

[Setup]
AppId={{7E5C1B43-D1F2-4D4F-A312-62B5537C994A}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\\EvoScientist Studio
DefaultGroupName=EvoScientist Studio
OutputDir=..\\..\\..\\installers
OutputBaseFilename=EvoScientist-Studio-${version}-windows-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\\EvoScientist Studio"; Filename: "{app}\\{#MyAppExeName}"
Name: "{autodesktop}\\EvoScientist Studio"; Filename: "{app}\\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "Launch EvoScientist Studio"; Flags: nowait postinstall skipifsilent
`;
}

function linuxInstaller() {
  return `#!/usr/bin/env sh
set -eu
APP_NAME="evoscientist-studio"
PREFIX="\${XDG_DATA_HOME:-$HOME/.local/share}/$APP_NAME"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="\${XDG_DATA_HOME:-$HOME/.local/share}/applications"
APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

mkdir -p "$PREFIX" "$BIN_DIR" "$DESKTOP_DIR"
cp -R "$APP_DIR/." "$PREFIX/"
cat > "$BIN_DIR/evoscientist-studio" <<'LAUNCHER'
#!/usr/bin/env sh
APP_DIR="\${XDG_DATA_HOME:-$HOME/.local/share}/evoscientist-studio"
exec "$APP_DIR/AppRun"
LAUNCHER
chmod +x "$BIN_DIR/evoscientist-studio"

cat > "$DESKTOP_DIR/evoscientist-studio.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=EvoScientist Studio
Comment=Cross-platform EvoScientist research automation Studio
Exec=evoscientist-studio
Terminal=false
Categories=Science;Development;Education;
DESKTOP

printf '%s\\n' "Installed EvoScientist Studio to $PREFIX"
printf '%s\\n' "Launcher: $BIN_DIR/evoscientist-studio"
`;
}

function firstRunText(platform) {
  return `EvoScientist Studio ${version} (${platform})

This package contains the Studio UI and the local studio-api sidecar.

First-run flow:
1. Ask for automation permissions.
2. Clone EvoScientist Core into the app data directory.
3. Create the Python environment and install dependencies.
4. Collect model/API configuration.
5. Store secrets in the platform keychain when available.
6. Start the local Studio API adapter.

The current sidecar is dependency-free Python and exposes /api/bootstrap/start,
/api/config/model, and /api/run. A production build can replace it with a
signed FastAPI/PyInstaller sidecar while keeping the same endpoint contract.
`;
}
