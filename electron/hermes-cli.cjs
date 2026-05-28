/**
 * Hermes CLI runner and token management module for Duck Desktop.
 * Handles hermes.exe execution, token fetching, and TTS.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");
const https = require("https");
const { spawn } = require("child_process");

// ── Paths ────────────────────────────────────────────────────────
var hermesExe = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "hermes.exe");
var _token = null;
var _gatewayKey = null;

// ── Token (async, non-blocking) ──────────────────────────────────
function fetchToken() {
  try {
    var envPath = path.join(process.env.LOCALAPPDATA, "hermes", ".env");
    var envContent = fs.readFileSync(envPath, "utf-8");
    var lines = envContent.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith("API_SERVER_KEY=")) {
        _gatewayKey = line.substring(15).trim();
        break;
      }
    }
  } catch(e) {}
  try {
    var req = http.get("http://127.0.0.1:9119/", { timeout: 3000 }, function(res) {
      var d = ""; res.on("data", function(c) { d += c; }); res.on("end", function() {
        var m = d.match(/__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
        if (m) _token = m[1];
      });
    });
    req.on("error", function() {});
  } catch(e) {}
}

// ── Token (async, with Promise) ──────────────────────────────────
function fetchTokenAsync() {
  return new Promise(function(resolve) {
    // Read .env file synchronously (fast)
    try {
      var envPath = path.join(process.env.LOCALAPPDATA, "hermes", ".env");
      var envContent = fs.readFileSync(envPath, "utf-8");
      var lines = envContent.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith("API_SERVER_KEY=")) {
          _gatewayKey = line.substring(15).trim();
          break;
        }
      }
    } catch(e) {}
    
    // Try to fetch session token from Dashboard
    try {
      var req = http.get("http://127.0.0.1:9119/", { timeout: 5000 }, function(res) {
        var d = ""; res.on("data", function(c) { d += c; }); res.on("end", function() {
          var m = d.match(/__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
          if (m) {
            _token = m[1];
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
      req.on("error", function() { resolve(false); });
      req.on("timeout", function() { req.destroy(); resolve(false); });
    } catch(e) { resolve(false); }
  });
}

// ── CLI Runner ───────────────────────────────────────────────────
function runHermes(args, timeout) {
  return new Promise(function(resolve) {
    var out = "", err = "", p = spawn(hermesExe, args || [], { windowsHide: true, timeout: timeout || 120000 });
    p.stdout.on("data", function(d) { out += d.toString(); });
    p.stderr.on("data", function(d) { err += d.toString(); });
    p.on("close", function(c) { resolve({ ok: c === 0, stdout: out, stderr: err, exitCode: c }); });
    p.on("error", function(e) { resolve({ ok: false, stdout: out, stderr: err + "\n" + e.message, exitCode: -1 }); });
  });
}

// ── TTS ──────────────────────────────────────────────────────────
function speakTTS(text) {
  if (!text) return;
  try {
    var ttsExe = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var ttsScript = path.join(__dirname, "tts_speak.py");
    spawn(ttsExe, [ttsScript, text], { windowsHide: true, timeout: 10000 });
  } catch(e) {}
}

// ── Provider → .env 变量名映射表 ─────────────────────────────────
// 完整覆盖所有主流 provider，确保模型切换后密钥正确同步到 .env
var _PROVIDER_ENV_MAP = {
  // ── 标准 provider（slug 与 .env 变量名一一对应）──
  "xiaomi":      { key: "XIAOMI_API_KEY",      url: "XIAOMI_BASE_URL" },
  "openrouter":  { key: "OPENROUTER_API_KEY",  url: "OPENROUTER_BASE_URL" },
  "anthropic":   { key: "ANTHROPIC_API_KEY",   url: "ANTHROPIC_BASE_URL" },
  "openai":      { key: "OPENAI_API_KEY",      url: "OPENAI_BASE_URL" },
  "google":      { key: "GOOGLE_API_KEY",      url: "GOOGLE_BASE_URL" },
  "gemini":      { key: "GEMINI_API_KEY",      url: "GEMINI_BASE_URL" },
  "deepseek":    { key: "DEEPSEEK_API_KEY",    url: "DEEPSEEK_BASE_URL" },
  "qwen":        { key: "QWEN_API_KEY",        url: "QWEN_BASE_URL" },
  "zhipu":       { key: "GLM_API_KEY",         url: "GLM_BASE_URL" },
  "kimi":        { key: "KIMI_API_KEY",        url: "KIMI_BASE_URL" },
  "minimax":     { key: "MINIMAX_API_KEY",     url: "MINIMAX_BASE_URL" },
  "arcee":       { key: "ARCEEAI_API_KEY",     url: "ARCEE_BASE_URL" },
  "ollama":      { key: null,                   url: null },  // 本地运行，无需密钥
  // ── 自定义 provider 前缀映射 ──
  "_custom_prefix": {
    "mimo-":     { key: "XIAOMI_API_KEY",      url: "XIAOMI_BASE_URL" },
    "deepseek":  { key: "DEEPSEEK_API_KEY",    url: "DEEPSEEK_BASE_URL" },
    "qwen":      { key: "QWEN_API_KEY",        url: "QWEN_BASE_URL" },
    "zhipu":     { key: "GLM_API_KEY",         url: "GLM_BASE_URL" },
    "kimi":      { key: "KIMI_API_KEY",        url: "KIMI_BASE_URL" },
    "Ollama":    { key: null,                   url: null },  // Ollama 本地
    "ollama":    { key: null,                   url: null }
  }
};

// ── 解析 provider slug 到 .env 变量名 ──────────────────────────
function _resolveProviderEnv(provider) {
  var clean = provider;
  if (clean.startsWith("custom:")) clean = clean.substring(7);

  // 1) 完全匹配标准 provider
  if (_PROVIDER_ENV_MAP[clean]) return _PROVIDER_ENV_MAP[clean];

  // 2) 自定义 provider 前缀匹配
  var prefixes = _PROVIDER_ENV_MAP["_custom_prefix"];
  for (var prefix in prefixes) {
    if (clean.startsWith(prefix)) return prefixes[prefix];
  }

  // 3) 通用格式兜底 (CUSTOM_NAME → CUSTOM_NAME_API_KEY)
  var envKey = clean.toUpperCase().replace(/-/g, "_") + "_API_KEY";
  var envUrl = clean.toUpperCase().replace(/-/g, "_") + "_BASE_URL";
  return { key: envKey, url: envUrl };
}

// ── Update provider key in .env file ─────────────────────────────
function updateProviderKey(provider, key, baseUrl) {
  try {
    var mapping = _resolveProviderEnv(provider);
    var envVarName = mapping.key;
    var baseUrlVarName = mapping.url;

    // Ollama 等本地 provider：无需密钥，直接返回
    if (!envVarName) return { ok: true, skipped: "local provider" };

    var envPath = path.join(process.env.LOCALAPPDATA, "hermes", ".env");
    var envContent = fs.readFileSync(envPath, "utf-8");
    var lines = envContent.split("\n");
    var updated = false;

    // 更新 API 密钥
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith(envVarName + "=")) {
        lines[i] = envVarName + "=" + key;
        updated = true;
        break;
      }
    }

    // 如果没找到，在文件末尾添加
    if (!updated) {
      lines.push(envVarName + "=" + key);
    }

    // 更新 BASE_URL（如果提供了）
    if (baseUrl) {
      updated = false;
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith(baseUrlVarName + "=")) {
          lines[i] = baseUrlVarName + "=" + baseUrl;
          updated = true;
          break;
        }
      }
      if (!updated) {
        lines.push(baseUrlVarName + "=" + baseUrl);
      }
    }

    // 写入文件
    fs.writeFileSync(envPath, lines.join("\n"), "utf-8");

    // 刷新内存中的 _gatewayKey 缓存
    if (envVarName === "API_SERVER_KEY") {
      _gatewayKey = key;
    }

    return { ok: true, envVar: envVarName };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Auto-start Hermes ────────────────────────────────────────────
async function autoStartHermes(statusCallback) {
  var net = require("net");
  function checkPort(port) {
    return new Promise(function(resolve) {
      var s = new net.Socket();
      s.setTimeout(2000);
      s.on("connect", function() { s.destroy(); resolve(true); });
      s.on("error", function() { s.destroy(); resolve(false); });
      s.on("timeout", function() { s.destroy(); resolve(false); });
      s.connect(port, "127.0.0.1");
    });
  }

  if (statusCallback) statusCallback("正在检查 Hermes 状态...");

  // 1. Start Dashboard if needed
  var dashboardRunning = await checkPort(9119);
  if (!dashboardRunning) {
    if (statusCallback) statusCallback("正在启动 Hermes Dashboard...");
    console.log("[auto] Starting Hermes dashboard...");
    var proc = spawn(hermesExe, ["dashboard", "--no-open", "--skip-build"], { windowsHide: true, detached: true, stdio: "ignore" });
    proc.unref();
    for (var i = 0; i < 20; i++) {
      await new Promise(function(r) { setTimeout(r, 1000); });
      if (await checkPort(9119)) {
        console.log("[auto] Dashboard port ready");
        if (statusCallback) statusCallback("Dashboard 端口已就绪");
        break;
      }
      if (statusCallback) statusCallback("等待 Dashboard 启动... (" + (i+1) + "/20)");
    }
  } else {
    console.log("[auto] Dashboard already running");
    if (statusCallback) statusCallback("Dashboard 已在运行");
  }

  // 2. Wait for Dashboard to be fully ready (session token available)
  if (statusCallback) statusCallback("正在等待 Dashboard 完全就绪...");
  var tokenReady = false;
  for (var t = 0; t < 10; t++) {
    await new Promise(function(r) { setTimeout(r, 1000); });
    var success = await fetchTokenAsync();
    if (success) {
      tokenReady = true;
      console.log("[auto] Session token acquired");
      if (statusCallback) statusCallback("Dashboard 已完全就绪（Token 已获取）");
      break;
    }
    if (statusCallback) statusCallback("等待 Dashboard 完全就绪... (" + (t+1) + "/10)");
  }
  if (!tokenReady) {
    console.log("[auto] Warning: Could not get session token, proceeding with gateway key");
    if (statusCallback) statusCallback("警告：未能获取 session token，将使用 gateway key");
  }

  // 3. Start Gateway if needed
  if (statusCallback) statusCallback("正在检查 Gateway 状态...");
  var gwResult = await runHermes(["gateway", "status"], 10000);
  if (gwResult.stdout.indexOf("running") === -1 && gwResult.stdout.indexOf("PID") === -1) {
    if (statusCallback) statusCallback("正在启动 Gateway...");
    console.log("[auto] Starting gateway...");
    await runHermes(["gateway", "start"], 15000);
    if (statusCallback) statusCallback("Gateway 已启动");
  } else {
    console.log("[auto] Gateway already running");
    if (statusCallback) statusCallback("Gateway 已在运行");
  }
  
  // 4. Final status
  if (statusCallback) statusCallback("Hermes 启动完成！");
}

// ── Force update (clean, discard local changes) ────────────────
function forceUpdate() {
  return new Promise(function(resolve) {
    var hermesAgentDir = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent");
    var git = "git";
    var out = "", err = "";
    
    function runGit(args) {
      return new Promise(function(res) {
        var p = spawn(git, args, { cwd: hermesAgentDir, windowsHide: true, timeout: 60000 });
        var o = "", e = "";
        p.stdout.on("data", function(d) { o += d.toString(); });
        p.stderr.on("data", function(d) { e += d.toString(); });
        p.on("close", function(c) { res({ ok: c === 0, stdout: o, stderr: e }); });
        p.on("error", function(err2) { res({ ok: false, stdout: o, stderr: e + "\n" + err2.message }); });
      });
    }
    
    async function doUpdate() {
      try {
        // Step 1: Fetch latest from origin
        out += "→ Fetching updates...\n";
        var fetchResult = await runGit(["fetch", "origin"]);
        if (!fetchResult.ok) {
          resolve({ ok: false, stdout: out + "✗ Fetch failed: " + fetchResult.stderr });
          return;
        }
        out += "✓ Fetched latest changes\n";
        
        // Step 2: Reset to match remote (discard local changes)
        out += "→ Resetting to match remote (local changes will be discarded)...\n";
        var resetResult = await runGit(["reset", "--hard", "origin/main"]);
        if (!resetResult.ok) {
          resolve({ ok: false, stdout: out + "✗ Reset failed: " + resetResult.stderr });
          return;
        }
        out += "✓ Reset to latest version\n";
        
        // Step 3: Clean untracked files
        out += "→ Cleaning untracked files...\n";
        var cleanResult = await runGit(["clean", "-fd"]);
        out += "✓ Cleaned\n";
        
        // Step 4: Drop any existing stash from previous failed updates
        var stashResult = await runGit(["stash", "list"]);
        if (stashResult.stdout && stashResult.stdout.trim()) {
          out += "→ Dropping old stashes...\n";
          await runGit(["stash", "drop"]);
        }
        
        out += "\n✓ Update completed successfully! Local changes were discarded to ensure a clean update.\n";
        resolve({ ok: true, stdout: out });
      } catch(e) {
        resolve({ ok: false, stdout: out + "\n✗ Error: " + e.message });
      }
    }
    
    doUpdate();
  });
}

// ── Fetch latest version ─────────────────────────────────────────
function fetchLatestVersion() {
  return new Promise(function(resolve) {
    var req = https.get("https://api.github.com/repos/NousResearch/hermes-agent/releases/latest", { headers: { "User-Agent": "Duck-Desktop", "Accept": "application/vnd.github.v3+json" } }, function(res) {
      var d = ""; res.on("data", function(c) { d += c; }); res.on("end", function() {
        try {
          var j = JSON.parse(d);
          resolve({ ok: true, version: (j.tag_name || "").replace(/^v/, ""), url: j.html_url, notes: j.body });
        } catch(e) { resolve({ ok: false }); }
      });
    });
    req.on("error", function() { resolve({ ok: false }); });
    req.setTimeout(15000, function() { req.destroy(); resolve({ ok: false }); });
  });
}

module.exports = {
  getHermesExe: function() { return hermesExe; },
  getToken: function() { return _token || _gatewayKey; },
  getGatewayKey: function() { return _gatewayKey; },
  getApiKey: function(config) { return (config && config.apiKey) || _gatewayKey || _token; },
  fetchToken: fetchToken,
  fetchTokenAsync: fetchTokenAsync,
  runHermes: runHermes,
  speakTTS: speakTTS,
  autoStartHermes: autoStartHermes,
  fetchLatestVersion: fetchLatestVersion,
  forceUpdate: forceUpdate,
  updateProviderKey: updateProviderKey,
  startTokenRefresh: function() {
    fetchToken();
    setInterval(fetchToken, 10000);
  }
};
