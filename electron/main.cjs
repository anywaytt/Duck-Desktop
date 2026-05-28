var electron = require("electron");
var path = require("path");
var fs = require("fs");
var os = require("os");
var http = require("http");
var { spawn } = require("child_process");
var hermesCli = require("./hermes-cli.cjs");
var security = require("./security.cjs");
var tray = null;

// ═══════════════════════════════════════════════════════════════
// A. 配置
// ═══════════════════════════════════════════════════════════════
var configPath = path.join(os.homedir(), ".duck-desktop", "config.json");
var defaultConfig = { apiPort: 8642, apiKey: "", setupDone: false, port: 8642 };

function loadConfig() {
  try { if (fs.existsSync(configPath)) return Object.assign({}, defaultConfig, JSON.parse(fs.readFileSync(configPath, "utf-8"))); }
  catch(e) {} return Object.assign({}, defaultConfig);
}
function saveConfig(cfg) {
  try { var dir = path.dirname(configPath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2)); } catch(e) {}
}
var _config = loadConfig();

// ═══════════════════════════════════════════════════════════════
// B. 宠物系统（金币/喂食/签到/配饰/Token换算）
// ═══════════════════════════════════════════════════════════════
var petStatePath = path.join(os.homedir(), ".duck-desktop", "pet-state.json");
var _petState = null;
var _petTokenBase = 0;

function loadPetState() {
  try { if (fs.existsSync(petStatePath)) _petState = JSON.parse(fs.readFileSync(petStatePath, "utf-8")); } catch(e) {}
  if (!_petState) _petState = {coins:0,totalTokens:0,streakDays:0,lastOpenDate:"",foods:{},equipped:{hat:null,glasses:null,clothes:null,hand:null},accessories:[],mood:100,hunger:100};
  var today = new Date().toISOString().slice(0,10);
  if (_petState.lastOpenDate !== today) {
    var yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    _petState.streakDays = (_petState.lastOpenDate === yesterday) ? (_petState.streakDays||0)+1 : 1;
    _petState.lastOpenDate = today;
    checkAccessoryUnlock();
    savePetState();
  }
  _petTokenBase = _petState.totalTokens || 0;
}
function savePetState() {
  try { var dir = path.dirname(petStatePath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(petStatePath, JSON.stringify(_petState, null, 2)); } catch(e) {}
}
function checkAccessoryUnlock() {
  var days = _petState.streakDays || 0;
  var all = ["hat_cap","glass_cool","cloth_scarf","hand_flag","hat_crown","glass_heart","hand_wand","hat_flower","glass_nerd","cloth_suit","cloth_cape","hat_wizard"];
  var days2 = [10,10,10,10,20,20,20,30,30,30,50,50];
  if (!_petState.accessories) _petState.accessories = [];
  for (var i = 0; i < all.length; i++) { if (days >= days2[i] && _petState.accessories.indexOf(all[i]) === -1) _petState.accessories.push(all[i]); }
}
// ── 宠物饱腹/心情衰减（每5分钟执行一次）──
function decayPetStats() {
  if (!_petState) return;
  var changed = false;
  // 饱腹度每5分钟 -1（约8小时从100降到0）
  if ((_petState.hunger || 0) > 0) {
    _petState.hunger = Math.max(0, (_petState.hunger || 0) - 1);
    changed = true;
  }
  // 饥饿时心情下降，饱腹时心情缓慢恢复
  var h = _petState.hunger || 0;
  var m = _petState.mood != null ? _petState.mood : 100;
  if (h < 20 && m > 0) {
    _petState.mood = Math.max(0, m - 2);
    changed = true;
  } else if (h >= 80 && m < 100) {
    _petState.mood = Math.min(100, m + 1);
    changed = true;
  }
  if (changed) savePetState();
}

function syncPetTokens() {
  try {
    var token = hermesCli.getToken();
    if (!token) return;
    var req = http.get("http://127.0.0.1:9119/api/analytics/usage?days=365", {timeout:5000, headers:{"Authorization":"Bearer "+token}}, function(res) {
      var d = ""; res.on("data", function(c){d+=c}); res.on("end", function(){
        try {
          var data = JSON.parse(d);
          var total = ((data.totals||{}).total_input||0) + ((data.totals||{}).total_output||0);
          if (total > _petTokenBase) {
            var coins = Math.floor((total - _petTokenBase) / 10000);
            if (coins > 0) { _petState.totalTokens = total; _petState.coins = (_petState.coins||0) + coins; _petTokenBase = total; savePetState(); }
          }
        } catch(e) {}
      });
    }); req.on("error", function(){});
  } catch(e) {}
}
loadPetState();

// ═══════════════════════════════════════════════════════════════
// C. 系统监控（CPU/内存/磁盘/网络）—— 用PowerShell，不用wmic
// ═══════════════════════════════════════════════════════════════
var _stats = {cpu:0, memoryTotal:0, memoryUsed:0, memoryPercent:0, diskTotal:0, diskUsed:0, diskFree:0, diskPercent:0, networkUp:0, networkDown:0, timestamp:0};
var _prevCpu = null;
var _prevNet = null;

function refreshStats() {
  try {
    var cpus = os.cpus(), idle = 0, tick = 0;
    for (var i = 0; i < cpus.length; i++) { 
      idle += cpus[i].times.idle; 
      tick += cpus[i].times.user + cpus[i].times.nice + cpus[i].times.sys + cpus[i].times.idle + cpus[i].times.irq; 
    }
    if (_prevCpu) { 
      var di = idle - _prevCpu.idle, dt2 = tick - _prevCpu.tick; 
      _stats.cpu = dt2 > 0 ? Math.round((1 - di/dt2) * 100) : 0; 
    }
    _prevCpu = {idle:idle, tick:tick};
    var mt = Math.round(os.totalmem()/1048576), mf = Math.round(os.freemem()/1048576);
    _stats.memoryTotal = mt; 
    _stats.memoryUsed = mt - mf; 
    _stats.memoryPercent = mt > 0 ? Math.round((mt-mf)/mt*100) : 0;
    _stats.timestamp = Date.now();
    
    // 增强信息：CPU核心数和型号
    _stats.cpuCores = cpus.length;
    _stats.cpuModel = cpus.length > 0 ? cpus[0].model : "未知";
    
    // 内存使用率趋势（最近60个数据点）
    if (!_stats.memoryHistory) _stats.memoryHistory = [];
    _stats.memoryHistory.push({time: Date.now(), percent: _stats.memoryPercent});
    if (_stats.memoryHistory.length > 60) _stats.memoryHistory.shift();
    
    // CPU使用率趋势
    if (!_stats.cpuHistory) _stats.cpuHistory = [];
    _stats.cpuHistory.push({time: Date.now(), percent: _stats.cpu});
    if (_stats.cpuHistory.length > 60) _stats.cpuHistory.shift();
  } catch(e) {}
}
function refreshDiskStats() {
  try {
    require("child_process").exec('powershell -NoProfile -NonInteractive -Command "Get-PSDrive C | Select-Object @{N=\'U\';E={[math]::Round($_.Used/1GB,1)}},@{N=\'F\';E={[math]::Round($_.Free/1GB,1)}},@{N=\'T\';E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} | ConvertTo-Json"', {encoding:"utf8",timeout:10000,windowsHide:true}, function(err, r) {
      if (!err && r) {
        try {
          var d = JSON.parse(r.trim());
          _stats.diskTotal = d.T || 0; _stats.diskUsed = d.U || 0; _stats.diskFree = d.F || 0;
          _stats.diskPercent = d.T > 0 ? Math.round(d.U/d.T*100) : 0;
        } catch(e) {}
      }
    });
  } catch(e) {}
}
function refreshNetworkStats() {
  try {
    require("child_process").exec('powershell -NoProfile -NonInteractive -Command "Get-NetAdapterStatistics | Select-Object ReceivedBytes,SentBytes | ConvertTo-Json"', {encoding:"utf8",timeout:10000,windowsHide:true}, function(err, r) {
      if (!err && r) {
        try {
          var arr = JSON.parse(r.trim()); if (!Array.isArray(arr)) arr = [arr];
          var rx = 0, tx = 0; for (var i = 0; i < arr.length; i++) { rx += arr[i].ReceivedBytes || 0; tx += arr[i].SentBytes || 0; }
          if (_prevNet) { var dt3 = (_stats.timestamp - _prevNet.ts) / 1000; if (dt3 > 0) { _stats.networkDown = Math.round((rx - _prevNet.rx) / dt3 / 1024); _stats.networkUp = Math.round((tx - _prevNet.tx) / dt3 / 1024); } }
          _prevNet = {rx:rx, tx:tx, ts:_stats.timestamp || Date.now()};
        } catch(e) {}
      }
    });
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// D. 窗口管理
// ═══════════════════════════════════════════════════════════════
var mainWindow = null, chatWindow = null, petWindow = null, dialogWindow = null, setupWindow = null, wakeProcess = null;

function inject(wc, filename) {
  try { var fp = path.join(__dirname, "inject", filename); if (fs.existsSync(fp)) wc.executeJavaScript(fs.readFileSync(fp, "utf-8")); } catch(e) {}
}

function createPet() {
  if (petWindow) return;
  var s = electron.screen.getPrimaryDisplay().workArea;
  petWindow = new electron.BrowserWindow({
    x: s.x + s.width - 400, y: s.y + s.height - 500,
    width: 400, height: 500, frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false }
  });
  petWindow.setIgnoreMouseEvents(true, {forward: true});
  petWindow.loadFile(path.join(__dirname, "pet.html"));
  petWindow.on("closed", function() { petWindow = null; });
}
function showPet() { if (!petWindow) createPet(); }
function hidePet() { if (petWindow) { petWindow.close(); petWindow = null; } }

var _chatNewSession=false;
function openChat(newSession) {
  _chatNewSession=!!newSession;
  if (chatWindow) { 
    if(newSession)chatWindow.webContents.send("new-chat-session");
    chatWindow.focus(); return;
  }
  chatWindow = new electron.BrowserWindow({
    width: 420, height: 600, minWidth: 360, minHeight: 400,
    frame: false, title: "Duck Chat", titleBarStyle: "hidden",
    backgroundColor: "#1a1408", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, webSecurity: false }
  });
  chatWindow.loadFile(path.join(__dirname, "chat.html"));
  chatWindow.once("ready-to-show", function() { chatWindow.show(); });
  chatWindow.webContents.on("did-finish-load", function() {
    if(_chatNewSession){setTimeout(function(){chatWindow.webContents.send("new-chat-session");},200);_chatNewSession=false;}
  });
  chatWindow.on("closed", function() { chatWindow = null; });
}

function showDialogWindow() {
  if (dialogWindow) { dialogWindow.focus(); return; }
  dialogWindow = new electron.BrowserWindow({
    width: 380, height: 200, frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false }
  });
  dialogWindow.loadFile(path.join(__dirname, "float-dialog.html"));
  dialogWindow.on("closed", function() { dialogWindow = null; });
}

function createSetupWindow() {
  setupWindow = new electron.BrowserWindow({
    width: 600, height: 500, frame: false, title: "Duck Desktop Setup",
    backgroundColor: "#1a1408", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false }
  });
  setupWindow.loadFile(path.join(__dirname, "setup.html"));
  setupWindow.once("ready-to-show", function() { setupWindow.show(); });
  setupWindow.on("closed", function() { setupWindow = null; });
}

function openMainWindow() {
  hermesCli.startTokenRefresh();
  mainWindow = new electron.BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600,
    frame: false, title: "Duck Desktop", titleBarStyle: "hidden",
    backgroundColor: "#1a1408", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, webSecurity: false }
  });
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["http://127.0.0.1:9119/api/*"] },
    function(d, cb) { var t = hermesCli.getToken(); if (t) d.requestHeaders["Authorization"] = "Bearer " + t; cb({ requestHeaders: d.requestHeaders }); }
  );
  mainWindow.on("minimize", function() { showPet(); });
  mainWindow.once("ready-to-show", function() { mainWindow.show(); });
  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  mainWindow.webContents.on("did-finish-load", function() {
    inject(mainWindow.webContents, "unified-sidebar.js");
    inject(mainWindow.webContents, "connection-bar.js");
    inject(mainWindow.webContents, "model-switcher.js");
    inject(mainWindow.webContents, "session-history.js");
    inject(mainWindow.webContents, "session-click.js");
    inject(mainWindow.webContents, "settings.js");
    inject(mainWindow.webContents, "wechat.js");
    inject(mainWindow.webContents, "knowledge.js");
    inject(mainWindow.webContents, "skillhub.js");
    inject(mainWindow.webContents, "gpu-monitor.js");
  });
  mainWindow.on("close", function(e) {
    if (!electron.app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", function() { mainWindow = null; });
}

// ═══════════════════════════════════════════════════════════════
// E. 唤醒监听
// ═══════════════════════════════════════════════════════════════
function startWakeListener() {
  try {
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var script = path.join(__dirname, "wake_listener.py");
    if (!fs.existsSync(script)) return;
    wakeProcess = spawn(py, [script], { windowsHide: true });
    var stdoutBuffer = "";
    wakeProcess.stdout.on("data", function(d) {
      stdoutBuffer += d.toString();
      var lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        if (line === "WAKE") {
          showDialogWindow();
          if (petWindow) hidePet();
          // Notify dialog that we're listening
          if (dialogWindow) {
            dialogWindow.webContents.send("dialog-listening");
          }
          // Auto-enter continuous mode for Jarvis-like experience
          try { wakeProcess.stdin.write("set_mode continuous\n"); } catch(e) {}
        } else if (line.startsWith("SPEECH: ")) {
          var text = line.substring(8).trim();
          if (text && dialogWindow) {
            dialogWindow.webContents.send("speech-text", text);
          }
        } else if (line === "SILENCE") {
          if (dialogWindow) {
            dialogWindow.webContents.send("dialog-silence");
          }
        } else if (line === "MODE: continuous") {
          if (dialogWindow) {
            dialogWindow.webContents.send("voice-mode-changed", "continuous");
          }
        } else if (line === "MODE: normal") {
          if (dialogWindow) {
            dialogWindow.webContents.send("voice-mode-changed", "normal");
          }
        }
      }
    });
    wakeProcess.stderr.on("data", function(d) {
      var str = d.toString();
      if (str.startsWith("AUDIO_LEVEL: ")) {
        try {
          var info = JSON.parse(str.substring(13).trim());
          if (dialogWindow) {
            dialogWindow.webContents.send("audio-level", info);
          }
        } catch(e) {}
      }
    });
    wakeProcess.on("close", function() {});
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// F. IPC Handlers（所有API注册在此，按字母排序便于查找）
// ═══════════════════════════════════════════════════════════════

// -- invoke (异步，返回Promise) --
// 全屏截图 + 区域选取
electron.ipcMain.handle("capture-screenshot", function() {
  return new Promise(function(resolve) {
    // 1. 全屏截图
    electron.desktopCapturer.getSources({types:["screen"],thumbnailSize:electron.screen.getPrimaryDisplay().size}).then(function(sources) {
      if(!sources.length){resolve({error:"no screen"});return;}
      var imgData=sources[0].thumbnail.toDataURL();
      
      // 2. 创建全屏透明窗口
      var display=electron.screen.getPrimaryDisplay();
      var snipWin=new electron.BrowserWindow({
        x:0,y:0,width:display.size.width,height:display.size.height,
        frame:false,transparent:true,alwaysOnTop:true,
        skipTaskbar:true,resizable:false,
        webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false}
      });
      snipWin.setFullScreen(true);
      snipWin.loadFile(path.join(__dirname,"snip.html"));
      snipWin.webContents.on("did-finish-load",function(){
        snipWin.webContents.send("snip-data",imgData);
      });
      
      // 3. 接收选取结果
      electron.ipcMain.once("snip-result",function(event,data){
        try{snipWin.close();}catch(e){}
        snipWin=null;
        resolve(data?{data:data}:{error:"cancelled"});
      });
    });
  });
});
electron.ipcMain.handle("close-setup", function() { if (setupWindow) { setupWindow.close(); setupWindow = null; } });
electron.ipcMain.handle("fetch-latest-version", function() { return hermesCli.fetchLatestVersion(); });
electron.ipcMain.handle("gateway-restart", function() { return hermesCli.runHermes(["gateway","restart"], 30000); });
electron.ipcMain.handle("gateway-start", function() { return hermesCli.runHermes(["gateway","start"], 30000); });
electron.ipcMain.handle("gateway-status", function() { return hermesCli.runHermes(["gateway","status"], 15000).then(function(r) { return {running:r.stdout.indexOf("running")!==-1||r.stdout.indexOf("PID")!==-1, output:r.stdout}; }); });
electron.ipcMain.handle("get-api-key", function() { return hermesCli.getApiKey(_config); });
electron.ipcMain.handle("get-api-port", function() { return _config.apiPort || 8642; });
electron.ipcMain.handle("get-gateway-key", function() { return hermesCli.getGatewayKey(); });
electron.ipcMain.handle("get-config", function() { return _config; });
electron.ipcMain.handle("get-cpu-info", function() { var c = os.cpus(); return {model:c[0]?c[0].model:"?", cores:c.length, arch:os.arch()}; });
electron.ipcMain.handle("get-hostname", function() { return os.hostname(); });
electron.ipcMain.handle("get-platform", function() { return process.platform; });
electron.ipcMain.handle("get-session-token", function() { return hermesCli.getToken(); });
electron.ipcMain.handle("update-env-key", function(e, provider, key, baseUrl) { 
  return hermesCli.updateProviderKey(provider, key, baseUrl); 
});
// ═══ GPU 监控（nvidia-smi）═══
var _gpuStats = [];
function refreshGpuStats() {
  try {
    var spawn = require("child_process").spawn;
    var proc = spawn("nvidia-smi", [
      "--query-gpu=index,name,temperature.gpu,memory.used,memory.total,utilization.gpu,fan.speed,power.draw",
      "--format=csv,noheader,nounits"
    ], {windowsHide: true, timeout: 5000});
    var out = "";
    proc.stdout.on("data", function(d) { out += d.toString(); });
    proc.on("close", function() {
      try {
        _gpuStats = out.trim().split("\n").map(function(line) {
          var p = line.split(",").map(function(s) { return s.trim(); });
          return {
            index: parseInt(p[0]) || 0,
            name: p[1] || "Unknown",
            temp: parseInt(p[2]) || 0,
            memUsed: parseInt(p[3]) || 0,
            memTotal: parseInt(p[4]) || 0,
            util: parseInt(p[5]) || 0,
            fan: parseInt(p[6]) || 0,
            power: parseFloat(p[7]) || 0
          };
        });
      } catch(e) { _gpuStats = []; }
    });
    proc.on("error", function() { _gpuStats = []; });
  } catch(e) { _gpuStats = []; }
}

// 定时刷新磁盘和网络（每5秒），避免同步阻塞
// 智能刷新策略：根据系统负载动态调整刷新频率
var _refreshInterval = 5000; // 初始5秒
var _lastRefreshTime = 0;

function smartRefresh() {
  var now = Date.now();
  if (now - _lastRefreshTime >= _refreshInterval) {
    refreshDiskStats();
    refreshNetworkStats();
    refreshGpuStats();
    _lastRefreshTime = now;
    
    // 根据CPU使用率动态调整刷新频率
    if (_stats.cpu > 80) {
      _refreshInterval = 10000; // CPU高负载时降低刷新频率
    } else if (_stats.cpu < 20) {
      _refreshInterval = 3000; // CPU低负载时提高刷新频率
    } else {
      _refreshInterval = 5000; // 默认刷新频率
    }
  }
}

// 启动智能刷新
setInterval(smartRefresh, 1000); // 每秒检查是否需要刷新;
refreshDiskStats(); refreshNetworkStats();

electron.ipcMain.handle("get-gpu-stats", function() { return _gpuStats; });
electron.ipcMain.handle("get-system-stats", function() { refreshStats(); return _stats; });
electron.ipcMain.handle("hermes-update", function() { return hermesCli.forceUpdate(); });
electron.ipcMain.handle("hermes-update-check", function() { return hermesCli.fetchLatestVersion(); });
electron.ipcMain.handle("pet-get-state", function() { return _petState; });
electron.ipcMain.handle("pet-save-state", function(e, state) { _petState = state; savePetState(); return {ok:true}; });
electron.ipcMain.handle("run-hermes-cmd", function(e, args) { return hermesCli.runHermes(args, 30000); });
electron.ipcMain.handle("run-setup", function(e, action) { return hermesCli.runHermes(["setup", action], 60000); });
electron.ipcMain.handle("save-config", function(e, cfg) { _config = Object.assign(_config, cfg); _config.setupDone = true; saveConfig(_config); return {ok:true}; });

// ── 自定义模型管理 ──
var yaml = require("js-yaml");
var hermesConfigPath = path.join(os.homedir(), "AppData", "Local", "hermes", "config.yaml");

// ⚠️ 关键修复：预设的 custom providers（确保所有推荐模型都能正确注册）
// 当前 config.yaml 只预配了 custom:mimo-v2-5-pro，其他 custom:* 都没有
// 这导致 Hermes 不认识这些 provider，切换后 gateway 回退到默认的 xiaomi
var _PRESET_CUSTOM_PROVIDERS = [
  { name: "custom:mimo-v2-5-pro", base_url: "https://token-plan-cn.xiaomimimo.com/v1", model: "MiMo-V2.5-Pro" },
  { name: "custom:deepseek", base_url: "https://api.deepseek.com/v1", model: "deepseek-v4-pro" },
  { name: "custom:qwen", base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-max" },
  { name: "custom:zhipu", base_url: "https://open.bigmodel.cn/api/paas/v4", model: "GLM-5.1" },
  { name: "custom:kimi", base_url: "https://api.moonshot.cn/v1", model: "kimi-k2.6" },
  { name: "custom:Ollama", base_url: "http://localhost:11434/v1", model: "qwen3.6:27b" }
];

// 确保预设的 custom providers 已注册到 config.yaml
function _ensurePresetProviders() {
  try {
    if (!fs.existsSync(hermesConfigPath)) return;
    var cfg = yaml.load(fs.readFileSync(hermesConfigPath, "utf-8")) || {};
    if (!Array.isArray(cfg.custom_providers)) cfg.custom_providers = [];
    var updated = false;
    _PRESET_CUSTOM_PROVIDERS.forEach(function(preset) {
      var exists = cfg.custom_providers.some(function(p) { return p.name === preset.name; });
      if (!exists) { cfg.custom_providers.push(preset); updated = true; }
    });
    if (updated) {
      fs.writeFileSync(hermesConfigPath, yaml.dump(cfg, { lineWidth: -1, noRefs: true }), "utf-8");
      console.log("[config] Added missing preset custom providers");
    }
  } catch(err) { console.error("[config] Failed to ensure preset providers:", err.message); }
}

// 应用启动时自动检查并补充缺失的预设
setTimeout(_ensurePresetProviders, 5000);

electron.ipcMain.handle("add-custom-provider", function(e, provider) {
  try {
    var cfg = {};
    if (fs.existsSync(hermesConfigPath)) {
      cfg = yaml.load(fs.readFileSync(hermesConfigPath, "utf-8")) || {};
    }
    if (!Array.isArray(cfg.custom_providers)) cfg.custom_providers = [];
    // 检查是否已存在同名 provider
    var existing = cfg.custom_providers.findIndex(function(p) { return p.name === provider.name; });
    if (existing >= 0) {
      cfg.custom_providers[existing] = provider;
    } else {
      cfg.custom_providers.push(provider);
    }
    fs.writeFileSync(hermesConfigPath, yaml.dump(cfg, { lineWidth: -1, noRefs: true }), "utf-8");
    return { ok: true };
  } catch(err) {
    return { ok: false, error: err.message };
  }
});

electron.ipcMain.handle("list-custom-providers", function() {
  try {
    if (!fs.existsSync(hermesConfigPath)) return { ok: true, providers: [] };
    var cfg = yaml.load(fs.readFileSync(hermesConfigPath, "utf-8")) || {};
    return { ok: true, providers: Array.isArray(cfg.custom_providers) ? cfg.custom_providers : [] };
  } catch(err) {
    return { ok: false, error: err.message, providers: [] };
  }
});

electron.ipcMain.handle("remove-custom-provider", function(e, name) {
  try {
    if (!fs.existsSync(hermesConfigPath)) return { ok: true };
    var cfg = yaml.load(fs.readFileSync(hermesConfigPath, "utf-8")) || {};
    if (!Array.isArray(cfg.custom_providers)) return { ok: true };
    cfg.custom_providers = cfg.custom_providers.filter(function(p) { return p.name !== name; });
    fs.writeFileSync(hermesConfigPath, yaml.dump(cfg, { lineWidth: -1, noRefs: true }), "utf-8");
    return { ok: true };
  } catch(err) {
    return { ok: false, error: err.message };
  }
});

electron.ipcMain.handle("save-temp-image", function(e, dataUrl) {
  try { var m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/); if (!m) return {error:"invalid"}; var buf = Buffer.from(m[2], "base64"); var dir = path.join(os.tmpdir(), "duck-chat-images"); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); var fp = path.join(dir, "img_"+Date.now()+"."+(m[1]==="jpeg"?"jpg":m[1])); fs.writeFileSync(fp, buf); return {path:fp}; } catch(e2) { return {error:e2.message}; }
});
electron.ipcMain.handle("scan-desktop", function() {
  return new Promise(function(resolve) {
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var s = path.join(__dirname, "duck_scanner.py"); if (!fs.existsSync(py)) py = "python";
    var p = spawn(py, [s, "desktop"], {windowsHide:true, timeout:15000}); var o = "";
    p.stdout.on("data", function(d) { o += d.toString(); });
    p.on("close", function() { try { resolve(JSON.parse(o.trim())); } catch(e) { resolve({shortcuts:[],files:[],detected_apps:[]}); } });
    p.on("error", function() { resolve({shortcuts:[],files:[],detected_apps:[]}); });
  });
});
electron.ipcMain.handle("scan-system", function() {
  return new Promise(function(resolve) {
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var s = path.join(__dirname, "duck_scanner.py"); if (!fs.existsSync(py)) py = "python";
    var p = spawn(py, [s, "system"], {windowsHide:true, timeout:15000}); var o = "";
    p.stdout.on("data", function(d) { o += d.toString(); });
    p.on("close", function() { try { resolve(JSON.parse(o.trim())); } catch(e) { resolve({}); } });
    p.on("error", function() { resolve({}); });
  });
});
electron.ipcMain.handle("start-chat-mic", function() {
  return new Promise(function(resolve) {
    if (_chatMicProc) { resolve({error:"already running"}); return; }
    var out = "", err = "";
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    _chatMicProc = spawn(py, [path.join(__dirname, "chat_mic.py"), "--max-seconds", "30"], {windowsHide:true, timeout:35000});
    _chatMicProc.stdout.on("data", function(d) { out += d.toString(); });
    _chatMicProc.stderr.on("data", function(d) { err += d.toString(); });
    _chatMicProc.on("close", function(code) { _chatMicProc = null; resolve({text:out.trim(), error:err.trim(), code:code}); });
    _chatMicProc.on("error", function(e) { _chatMicProc = null; resolve({error:e.message}); });
  });
});
electron.ipcMain.handle("stop-chat-mic", function() { if (_chatMicProc) { _chatMicProc.kill(); _chatMicProc = null; } return {ok:true}; });
electron.ipcMain.handle("tts-check", function() {
  return new Promise(function(resolve) {
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var s = path.join(__dirname, "duck_tts.py"); if (!fs.existsSync(py)) py = "python";
    var p = spawn(py, [s, "check"], {windowsHide:true, timeout:60000}); var o = "";
    p.stdout.on("data", function(d) { o += d.toString(); });
    p.on("close", function() { try { resolve(JSON.parse(o.trim())); } catch(e) { resolve({ok:false}); } });
    p.on("error", function() { resolve({ok:false}); });
  });
});
electron.ipcMain.handle("tts-speak", function(e, text, voice) {
  return new Promise(function(resolve) {
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var s = path.join(__dirname, "duck_tts.py"); if (!fs.existsSync(py)) py = "python";
    var args = [s, "speak", "--text", text]; if (voice) args.push("--voice", voice);
    var p = spawn(py, args, {windowsHide:true, timeout:30000}); var o = "", err = "";
    p.stdout.on("data", function(d) { o += d.toString(); });
    p.stderr.on("data", function(d) { err += d.toString(); });
    p.on("close", function() { try { resolve(JSON.parse(o.trim())); } catch(e2) { resolve({error:err||"tts failed"}); } });
    p.on("error", function(e2) { resolve({error:e2.message}); });
  });
});
electron.ipcMain.handle("tts-voices", function() {
  return new Promise(function(resolve) {
    var py = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");
    var s = path.join(__dirname, "duck_tts.py"); if (!fs.existsSync(py)) py = "python";
    var p = spawn(py, [s, "voices"], {windowsHide:true, timeout:30000}); var o = "";
    p.stdout.on("data", function(d) { o += d.toString(); });
    p.on("close", function() { try { resolve(JSON.parse(o.trim())); } catch(e) { resolve([]); } });
    p.on("error", function() { resolve([]); });
  });
});
// -- Security --
// 获取各平台最新可用模型列表
// Ollama: 获取本地已安装模型
electron.ipcMain.handle("ollama-list", async function() {
  try {
    var result = await new Promise(function(resolve) {
      var http = require("http");
      var req = http.get("http://localhost:11434/api/tags", {timeout:3000}, function(res) {
        var d=""; res.on("data",function(c){d+=c;}); res.on("end",function(){
          try{var j=JSON.parse(d);resolve(j.models.map(function(m){return m.name;}));}catch(e){resolve([]);}
        });
      });
      req.on("error",function(){resolve([]);});
      req.on("timeout",function(){req.destroy();resolve([]);});
    });
    return result;
  } catch(e) { return []; }
});

// Ollama: 拉取模型（HTTP API，更可靠）
electron.ipcMain.handle("ollama-pull", async function(event, model) {
  return new Promise(function(resolve) {
    try {
      var http = require("http");
      var data = JSON.stringify({name: model, stream: true});
      var req = http.request({
        hostname: "localhost", port: 11434, path: "/api/pull",
        method: "POST", headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(data)},
        timeout: 600000
      }, function(res) {
        var buf = "";
        var lastProgress = null;
        res.on("data", function(chunk) {
          buf += chunk.toString();
          var lines = buf.split("\n");
          buf = lines.pop();
          lines.forEach(function(line) {
            line = line.trim();
            if (!line) return;
            try {
              var j = JSON.parse(line);
              if (j.status) {
                var info = {status: j.status};
                if (j.total && j.completed !== undefined) {
                  info.total = j.total;
                  info.completed = j.completed;
                  info.percent = Math.round(j.completed / j.total * 100);
                }
                lastProgress = info;
                event.sender.send("ollama-pull-progress", info);
              }
            } catch(e) {}
          });
        });
        res.on("end", function() {
          resolve({ok: res.statusCode === 200, progress: lastProgress});
        });
      });
      req.on("error", function(e){ resolve({ok:false, output:"连接Ollama失败: "+e.message}); });
      req.on("timeout", function(){ req.destroy(); resolve({ok:false, output:"下载超时（10分钟）"}); });
      req.write(data);
      req.end();
    } catch(e) { resolve({ok:false, output:e.message}); }
  });
});

// ═══════════════════════════════════════════
// 知识库 (Knowledge Base)
// ═══════════════════════════════════════════
var kbScript = path.join(__dirname, "kb.py");
var kbPython = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "venv", "Scripts", "python.exe");

function runKb(args, timeout) {
  return new Promise(function(resolve) {
    try {
      var p = spawn(kbPython, [kbScript].concat(args || []), {windowsHide: true, timeout: timeout || 30000});
      var out = "", err = "";
      p.stdout.on("data", function(d) { out += d.toString(); });
      p.stderr.on("data", function(d) { err += d.toString(); });
      p.on("close", function() {
        try { resolve(JSON.parse(out)); } catch(e) { resolve({ok: false, error: out || err}); }
      });
      p.on("error", function(e) { resolve({ok: false, error: e.message}); });
    } catch(e) { resolve({ok: false, error: e.message}); }
  });
}

electron.ipcMain.handle("kb-add", function(e, filepath) { return runKb(["add", filepath], 60000); });
electron.ipcMain.handle("kb-remove", function(e, docId) { return runKb(["remove", docId]); });
electron.ipcMain.handle("kb-list", function() { return runKb(["list"]); });
electron.ipcMain.handle("kb-search", function(e, query, topK) { return runKb(["search", query, String(topK || 5)]); });
electron.ipcMain.handle("kb-stats", function() { return runKb(["stats"]); });

// 选取文件对话框
electron.ipcMain.handle("kb-pick-file", async function() {
  var result = await electron.dialog.showOpenDialog({
    title: "选择知识库文档",
    filters: [
      {name: "文档", extensions: ["txt","md","pdf","docx","csv","json","yaml","yml","html","log"]},
      {name: "所有文件", extensions: ["*"]}
    ],
    properties: ["openFile", "multiSelections"]
  });
  return result.canceled ? [] : result.filePaths;
});

electron.ipcMain.handle("fetch-models", async function() {
  var http = require("http");
  var https = require("https");
  var result = {};
  
  function fetchJSON(url, headers, timeout) {
    return new Promise(function(resolve) {
      try {
        var mod = url.startsWith("https") ? https : http;
        var req = mod.get(url, {headers: headers||{}, timeout: timeout||5000}, function(res) {
          var d = ""; res.on("data", function(c){d+=c;}); res.on("end", function(){
            try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
          });
        });
        req.on("error", function(){resolve(null);});
        req.on("timeout", function(){req.destroy();resolve(null);});
      } catch(e) {resolve(null);}
    });
  }
  
  // Ollama 本地
  try {
    var ollama = await fetchJSON("http://localhost:11434/api/tags", {}, 3000);
    if (ollama && ollama.models) {
      result.ollama = ollama.models.map(function(m){return m.name;});
    }
  } catch(e) {}
  
  // DeepSeek
  var dsKey = "";
  try {
    var authList = await hermesCli.runHermes(["auth","list"], 5000);
    // Key is in auth pool, try fetching models via gateway proxy
    // Use config key if available
  } catch(e) {}
  
  // 从各 provider 的 /v1/models 获取（通过 auth pool 的 key）
  var providers = [
    {name:"deepseek", url:"https://api.deepseek.com/v1/models", slug:"custom:deepseek"},
    {name:"qwen", url:"https://dashscope.aliyuncs.com/compatible-mode/v1/models", slug:"custom:qwen"},
    {name:"zhipu", url:"https://open.bigmodel.cn/api/paas/v4/models", slug:"custom:zhipu"},
    {name:"kimi", url:"https://api.moonshot.cn/v1/models", slug:"custom:kimi"}
  ];
  
  for (var i = 0; i < providers.length; i++) {
    var p = providers[i];
    try {
      // Get key from auth pool
      var keyResult = await hermesCli.runHermes(["auth","status",p.slug], 5000);
      // Try fetching models (key might be in env or config)
      var models = await fetchJSON(p.url, {}, 5000);
      if (models && models.data) {
        result[p.name] = models.data.map(function(m){return m.id;}).filter(function(id){return id && !id.startsWith("ft:");});
      }
    } catch(e) {}
  }
  
  return result;
});

electron.ipcMain.handle("get-security-status", function() { return security.getSecurityStatus(); });
electron.ipcMain.handle("perform-security-check", function() { return security.performSecurityCheck(); });
electron.ipcMain.handle("initialize-security", function() { return security.initializeSecurity(); });

// -- on (同步事件) --
var _chatMicProc = null;
electron.ipcMain.on("close-chat", function() { 
  if (chatWindow) { 
    try { chatWindow.close(); } catch(e) { 
      try { chatWindow.destroy(); } catch(e2) {} 
    } 
    chatWindow = null; 
  } 
});
electron.ipcMain.on("dialog-auto-hide", function() { if (dialogWindow) setTimeout(function(){ if(dialogWindow){dialogWindow.close();dialogWindow=null;} }, 5000); });
electron.ipcMain.on("dialog-close", function() { if (dialogWindow) { dialogWindow.close(); dialogWindow = null; } showPet(); });
electron.ipcMain.on("set-voice-mode", function(e, mode) { if (wakeProcess && wakeProcess.stdin) { try { wakeProcess.stdin.write("set_mode " + mode + "\n"); } catch(e2) {} } });
electron.ipcMain.on("model-switched", function() { if (chatWindow) chatWindow.webContents.send("model-changed"); });
electron.ipcMain.on("open-chat", function(e, newSession) { openChat(newSession); });
electron.ipcMain.on("quit-app", function() { electron.app.isQuitting = true; hidePet(); if (chatWindow) chatWindow.close(); if (mainWindow) mainWindow.close(); electron.app.quit(); });
electron.ipcMain.on("show-main-window", function() { if (mainWindow) { mainWindow.show(); mainWindow.restore(); } });
electron.ipcMain.on("wake-word-detected", function() { showDialogWindow(); if (petWindow) hidePet(); });
electron.ipcMain.on("pet-mouse-enter", function() { if (petWindow) petWindow.setIgnoreMouseEvents(false); });
electron.ipcMain.on("pet-mouse-leave", function() { if (petWindow) petWindow.setIgnoreMouseEvents(true, {forward: true}); });
electron.ipcMain.on("window-close", function() { if (mainWindow) mainWindow.close(); });
electron.ipcMain.on("window-maximize", function() { if (mainWindow) { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); } });
electron.ipcMain.on("window-minimize", function() { if (mainWindow) mainWindow.minimize(); });

// ═══════════════════════════════════════════════════════════════
// H. 健康监控（定期检查 Dashboard 和 Gateway，自动重启）
// ═══════════════════════════════════════════════════════════════
var healthMonitorInterval = null;
var healthCheckInProgress = false;

function checkPort(port) {
  return new Promise(function(resolve) {
    var net = require("net");
    var s = new net.Socket();
    s.setTimeout(2000);
    s.on("connect", function() { s.destroy(); resolve(true); });
    s.on("error", function() { s.destroy(); resolve(false); });
    s.on("timeout", function() { s.destroy(); resolve(false); });
    s.connect(port, "127.0.0.1");
  });
}

async function healthCheck() {
  if (healthCheckInProgress) return;
  healthCheckInProgress = true;
  
  try {
    var dashboardOk = await checkPort(9119);
    var gatewayOk = await checkPort(8642);
    
    // 如果 Dashboard 挂了，重启它
    if (!dashboardOk) {
      console.log("[health] Dashboard down, restarting...");
      var proc = spawn(hermesCli.getHermesExe(), ["dashboard", "--no-open", "--skip-build"], { windowsHide: true, detached: true, stdio: "ignore" });
      proc.unref();
      // 等待 Dashboard 启动
      for (var i = 0; i < 15; i++) {
        await new Promise(function(r) { setTimeout(r, 1000); });
        if (await checkPort(9119)) {
          console.log("[health] Dashboard restarted successfully");
          // 重新抓取 token
          await hermesCli.fetchTokenAsync();
          break;
        }
      }
    }
    
    // 如果 Gateway 挂了，重启它
    if (!gatewayOk) {
      console.log("[health] Gateway down, restarting...");
      await hermesCli.runHermes(["gateway", "start"], 15000);
      // 等待 Gateway 启动
      for (var j = 0; j < 10; j++) {
        await new Promise(function(r) { setTimeout(r, 1000); });
        if (await checkPort(8642)) {
          console.log("[health] Gateway restarted successfully");
          break;
        }
      }
    }
    
    // 如果两个都正常，刷新 token
    if (dashboardOk && gatewayOk) {
      await hermesCli.fetchTokenAsync();
    }
  } catch(e) {
    console.log("[health] Error:", e.message);
  }
  
  healthCheckInProgress = false;
}

function startHealthMonitor() {
  if (healthMonitorInterval) return;
  console.log("[health] Starting health monitor (every 30 seconds)");
  // 立即执行一次
  healthCheck();
  // 每 30 秒检查一次
  healthMonitorInterval = setInterval(healthCheck, 30000);
}

function stopHealthMonitor() {
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
    healthMonitorInterval = null;
    console.log("[health] Health monitor stopped");
  }
}

// ═══════════════════════════════════════════════════════════════
// G. 启动
// ═══════════════════════════════════════════════════════════════
// Windows透明窗口兼容
electron.app.commandLine.appendSwitch("disable-gpu-compositing");
// 创建系统托盘
function createTray() {
  var iconPath = path.join(__dirname, "..", "public", "favicon.ico");
  tray = new electron.Tray(iconPath);
  tray.setToolTip("Duck Desktop");
  
  var contextMenu = electron.Menu.buildFromTemplate([
    { label: "显示主窗口", click: function() { if (mainWindow) { mainWindow.show(); } } },
    { type: "separator" },
    { label: "退出", click: function() { electron.app.isQuitting = true; if (petWindow) petWindow.close(); if (chatWindow) chatWindow.close(); if (mainWindow) mainWindow.close(); electron.app.quit(); } }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on("double-click", function() { if (mainWindow) { mainWindow.show(); } });
}

electron.app.whenReady().then(async function() {
  createTray();
  if (!_config.setupDone) { createSetupWindow(); return; }
  // ── 安全初始化：首次运行生成校验和，后续运行验证完整性 ──
  var secStatus = security.getSecurityStatus();
  if (!secStatus.initialized) {
    security.initializeSecurity();
    console.log("[security] First run — checksums initialized for", secStatus.fileCount || 14, "files");
  } else {
    var secCheck = security.performSecurityCheck();
    if (!secCheck.safe) {
      console.warn("[security] ⚠ " + secCheck.message + " — auto-reinitializing");
      security.initializeSecurity();
    } else {
      console.log("[security] Integrity check passed");
    }
  }
  // 先创建主窗口（隐藏状态）用于发送启动状态消息
  var _splashReady = false;
  function sendStartupMsg(msg) {
    if (mainWindow && mainWindow.webContents && !_splashReady) {
      mainWindow.webContents.send("startup-status", msg);
    }
  }
  openMainWindow();
  await hermesCli.autoStartHermes(sendStartupMsg);
  _splashReady = true;
  sendStartupMsg("hermes-web-ready");
  showPet();
  setInterval(syncPetTokens, 300000);
  setTimeout(syncPetTokens, 10000);
  setInterval(decayPetStats, 300000);
  // 启动健康监控
  startHealthMonitor();
  // 启动唤醒监听
  startWakeListener();
});
electron.app.on("window-all-closed", function() { /* 不退出，保持托盘运行 */ });
