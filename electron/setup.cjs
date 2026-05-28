/**
 * Duck Desktop — 首次运行环境安装引导
 * 检查并安装 Hermes Agent 运行环境
 */

const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const HERMES_HOME = path.join(os.homedir(), ".hermes");
const LOCAL_APPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
const HERMES_INSTALL_DIR = path.join(LOCAL_APPDATA, "hermes");
const HERMES_VENV = path.join(HERMES_INSTALL_DIR, "hermes-agent", "venv");

// ── Find Hermes executable ─────────────────────────────────────────────────
const HERMES_EXE_CANDIDATES = [
  path.join(LOCAL_APPDATA, "hermes", "hermes-agent", "venv", "Scripts", "hermes.exe"),
  path.join(LOCAL_APPDATA, "hermes", "bin", "hermes.exe"),
];

function findHermesExe() {
  for (const p of HERMES_EXE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getHermesEnv() {
  const env = { ...process.env, PYTHONUTF8: "1" };
  const hermesExe = findHermesExe();
  if (hermesExe) {
    const hermesDir = path.dirname(hermesExe);
    env.PATH = hermesDir + path.delimiter + (env.PATH || "");
  }
  return env;
}

/**
 * 检查 Hermes 是否已安装
 */
function checkHermesInstalled() {
  return new Promise((resolve) => {
    const hermesExe = findHermesExe();
    const cmd = hermesExe ? `"${hermesExe}" --version` : "hermes --version";
    exec(cmd, { timeout: 10000, env: getHermesEnv() }, (err, stdout) => {
      if (err) {
        resolve({ installed: false, version: null });
      } else {
        const version = stdout.trim().replace(/^v?/, "").split("\n")[0];
        resolve({ installed: true, version });
      }
    });
  });
}

/**
 * 检查 Python 是否可用
 */
function checkPython() {
  return new Promise((resolve) => {
    const commands = ["python", "python3", "py"];
    let tried = 0;

    for (const cmd of commands) {
      exec(`${cmd} --version`, { timeout: 5000 }, (err, stdout) => {
        tried++;
        if (!err && stdout.includes("Python")) {
          const version = stdout.trim().replace("Python ", "");
          resolve({ available: true, command: cmd, version });
          return;
        }
        if (tried >= commands.length) {
          resolve({ available: false, command: null, version: null });
        }
      });
    }
  });
}

/**
 * 检查 Node.js 是否可用
 */
function checkNode() {
  return new Promise((resolve) => {
    exec("node --version", { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve({ available: false, version: null });
      } else {
        resolve({ available: true, version: stdout.trim() });
      }
    });
  });
}

/**
 * 通过官方脚本安装 Hermes（Windows PowerShell）
 */
function installHermes() {
  return new Promise((resolve, reject) => {
    const installCmd = `powershell -ExecutionPolicy Bypass -Command "irm https://res1.hermesagent.org.cn/install.ps1 | iex"`;
    exec(installCmd, { timeout: 600000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`安装失败: ${stderr || err.message}`));
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
}

/**
 * 获取环境状态
 */
async function getEnvironmentStatus() {
  const [hermes, python, node] = await Promise.all([
    checkHermesInstalled(),
    checkPython(),
    checkNode(),
  ]);

  return {
    hermes,
    python,
    node,
    hermesHome: HERMES_HOME,
    installDir: HERMES_INSTALL_DIR,
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    ready: hermes.installed && (python.available || node.available),
  };
}

/**
 * 执行完整安装流程（带进度回调）
 */
async function runFullSetup(onProgress) {
  const status = await getEnvironmentStatus();

  if (status.ready) {
    onProgress({ step: "complete", message: "环境已就绪", status });
    return status;
  }

  // Step 1: 检查 Python
  if (!status.python.available) {
    onProgress({ step: "error", message: "未检测到 Python，请先安装 Python 3.11+" });
    throw new Error("Python not found");
  }
  onProgress({ step: "python", message: `Python ${status.python.version} ✓` });

  // Step 2: 安装 Hermes
  if (!status.hermes.installed) {
    onProgress({ step: "installing", message: "正在安装 Hermes Agent..." });
    try {
      await installHermes();
      onProgress({ step: "installed", message: "Hermes 安装完成 ✓" });
    } catch (err) {
      onProgress({ step: "error", message: `安装失败: ${err.message}` });
      throw err;
    }
  } else {
    onProgress({ step: "hermes", message: `Hermes ${status.hermes.version} ✓` });
  }

  // Step 3: 验证安装
  const finalStatus = await getEnvironmentStatus();
  onProgress({ step: "complete", message: "环境就绪", status: finalStatus });

  return finalStatus;
}

module.exports = {
  checkHermesInstalled,
  checkPython,
  checkNode,
  getEnvironmentStatus,
  runFullSetup,
  installHermes,
  findHermesExe,
  getHermesEnv,
  HERMES_HOME,
  HERMES_INSTALL_DIR,
};
