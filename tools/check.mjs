import { access, readFile } from "node:fs/promises";

const required = [
  "apps/studio-ui/index.html",
  "apps/studio-ui/src/main.js",
  "apps/studio-ui/src/styles.css",
  "apps/studio-api/studio_api.py",
  "apps/studio-api/README.md",
  "packages/contracts/studio-api.schema.json",
  "docs/ARCHITECTURE.md",
  "docs/EVOSCIENTIST_COMPATIBILITY.md",
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

const schema = JSON.parse(await readFile("packages/contracts/studio-api.schema.json", "utf8"));
for (const property of ["runEvent", "quota", "permissionGrant", "installerStep", "modelConfig", "analyticsSnapshot"]) {
  if (!schema.properties?.[property]) {
    throw new Error(`studio-api schema must define ${property}`);
  }
}

console.log(`Checked ${required.length} required files`);
