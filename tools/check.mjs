import { access, readFile } from "node:fs/promises";

const required = [
  "apps/studio-ui/index.html",
  "apps/studio-ui/src/info-adapter.js",
  "apps/studio-ui/src/main.js",
  "apps/studio-ui/src/styles.css",
  "apps/studio-api/studio_api.py",
  "apps/studio-api/README.md",
  "packages/contracts/studio-api.schema.json",
  "docs/ARCHITECTURE.md",
  "docs/EVOSCIENTIST_COMPATIBILITY.md",
  "docs/FRONTEND_INFO_ADAPTER.md",
  "docs/ONBOARDING_AND_AUTHORIZATION.md",
  "docs/PACKAGING.md",
  "docs/MANAGED_GATEWAY.md",
  "packaging/README.md",
  ".github/workflows/package.yml",
  "tools/build-sidecar.mjs",
  "tools/package.mjs",
];

for (const file of required) {
  await access(file);
}

const html = await readFile("apps/studio-ui/index.html", "utf8");
if (!html.includes("./src/main.js") || !html.includes("./src/styles.css")) {
  throw new Error("index.html must reference main.js and styles.css");
}

const main = await readFile("apps/studio-ui/src/main.js", "utf8");
const adapter = await readFile("apps/studio-ui/src/info-adapter.js", "utf8");
if (!main.includes("./info-adapter.js")) {
  throw new Error("main.js must consume the frontend info adapter");
}
for (const marker of ["PROTECTED_UI_BOUNDARY", "infoEndpoints", "normalizeInfoSnapshot"]) {
  if (!adapter.includes(marker)) {
    throw new Error(`info-adapter.js must define ${marker}`);
  }
}
if (main.includes('apiGet("/api/chat/state")') || main.includes('apiGet("/api/claude/status")')) {
  throw new Error("main.js must read mutable info endpoints through info-adapter.js");
}

const schema = JSON.parse(await readFile("packages/contracts/studio-api.schema.json", "utf8"));
for (const property of ["runEvent", "quota", "permissionGrant", "installerStep", "modelConfig", "analyticsSnapshot"]) {
  if (!schema.properties?.[property]) {
    throw new Error(`studio-api schema must define ${property}`);
  }
}

console.log(`Checked ${required.length} required files`);
