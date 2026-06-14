import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i].startsWith("--")) {
    args.set(process.argv[i], process.argv[i + 1]);
    i += 1;
  }
}

const root = resolve(args.get("--root") || "apps/studio-ui");
const startPort = Number(args.get("--port") || 5173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const target = normalize(join(root, clean || "index.html"));
  if (!target.startsWith(root)) return join(root, "index.html");
  return target;
}

async function requestHandler(req, res) {
  let filePath = safePath(req.url || "/");
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(root, "index.html");
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const type = mime[extname(filePath)] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(res);
}

function listen(port) {
  const server = createServer(requestHandler);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }
    throw err;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`EvoScientist Studio preview: http://127.0.0.1:${port}`);
    console.log(`Serving: ${root}`);
  });
}

listen(startPort);

