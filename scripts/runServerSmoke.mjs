/**
 * Spawns the compiled server with an in-memory MongoDB and checks GET /health and GET /ready.
 * Run: node scripts/runServerSmoke.mjs  (from repo root, after `npm run build`)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { MongoMemoryServer } from "mongodb-memory-server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distServer = path.join(root, "dist", "server.js");

const mongod = await MongoMemoryServer.create();
const MONGODB_URI = mongod.getUri();
const PORT = 4010;
const env = {
  ...process.env,
  MONGODB_URI,
  JWT_SECRET: "dev-test-jwt-secret-min-32-chars-ok!",
  NODE_ENV: "test",
  PORT: String(PORT),
};

const child = spawn("node", [distServer], { env, stdio: ["ignore", "pipe", "pipe"] });
let out = "";
child.stderr.on("data", (d) => (out += d));
child.stdout.on("data", (d) => (out += d));

const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 30; i++) {
  try {
    const h = await fetch(`${base}/health`);
    if (h.ok) break;
  } catch {
    /* not up yet */
  }
  await delay(200);
}

const health = await fetch(`${base}/health`);
const ready = await fetch(`${base}/ready`);
if (!health.ok) {
  console.error("GET /health failed", health.status, out);
  child.kill("SIGTERM");
  await mongod.stop();
  process.exit(1);
}
if (!ready.ok) {
  console.error("GET /ready failed", ready.status, out);
  child.kill("SIGTERM");
  await mongod.stop();
  process.exit(1);
}
console.log("OK: server process responds on /health and /ready");
child.kill("SIGTERM");
await new Promise((r) => child.on("close", r));
await mongod.stop();
process.exit(0);
