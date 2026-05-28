const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const http = require("http");

const LAD = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
const HERMES_EXE = path.join(LAD, "hermes", "hermes-agent", "venv", "Scripts", "hermes.exe");
const EXE_DIR = __dirname;
const EXE_PATH = path.join(EXE_DIR, "Duck Desktop.exe");
const PORT = 9119;

// Step 1: Start hermes
if (fs.existsSync(HERMES_EXE)) {
  spawn("cmd.exe", [
    "/c", "start", "Hermes", "/MIN",
    "cmd.exe", "/c",
    `set PYTHONUTF8=1 && "${HERMES_EXE}" dashboard --port ${PORT} --no-open`
  ], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  process.stdout.write("[1/2] Hermes started\n");
} else {
  process.stdout.write("[1/2] Hermes not found, skipping\n");
}

// Step 2: Wait for hermes, then launch Duck Desktop
function launchDuck() {
  const duck = spawn(EXE_PATH, [], { detached: true, stdio: "ignore", windowsHide: false, cwd: EXE_DIR });
  duck.unref();
  process.stdout.write("[2/2] Duck Desktop launched\n");
  // Exit launcher immediately
  setTimeout(() => process.exit(0), 500);
}

let attempts = 0;
function waitForHermes() {
  attempts++;
  const req = http.get(`http://127.0.0.1:${PORT}/api/status`, { timeout: 2000 });
  req.on("response", () => { req.destroy(); launchDuck(); });
  req.on("error", () => {
    if (attempts >= 15) {
      process.stdout.write("[2/2] Hermes timeout, launching anyway\n");
      launchDuck();
    } else {
      process.stdout.write(`[2/2] Waiting for Hermes (${attempts}/15)...\n`);
    }
  });
  req.end();
}

setInterval(waitForHermes, 2000);
