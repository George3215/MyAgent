import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const src = "apps/studio-ui";
const out = "dist/studio-ui";
const copied = [];

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from);
  for (const entry of entries) {
    const source = join(from, entry);
    const target = join(to, entry);
    const info = await stat(source);
    if (info.isDirectory()) {
      await copyDir(source, target);
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    copied.push(relative(out, target));
  }
}

await rm(out, { recursive: true, force: true });
await copyDir(src, out);
await writeFile(
  join(out, "build-manifest.json"),
  JSON.stringify(
    {
      name: "EvoScientist Studio",
      built_at: new Date().toISOString(),
      files: copied.sort(),
    },
    null,
    2,
  ),
);

console.log(`Built ${copied.length} files into ${out}`);

