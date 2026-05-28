const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // System monitoring
  getSystemStats: () => ipcRenderer.invoke("get-system-stats"),
  getGpuStats: () => ipcRenderer.invoke("get-gpu-stats"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getHostname: () => ipcRenderer.invoke("get-hostname"),
  getCpuInfo: () => ipcRenderer.invoke("get-cpu-info"),

  // Session token for API auth
  getSessionToken: () => ipcRenderer.invoke("get-session-token"),
  getApiKey: () => ipcRenderer.invoke("get-api-key"),
  getApiPort: () => ipcRenderer.invoke("get-api-port"),
  getGatewayKey: () => ipcRenderer.invoke("get-gateway-key"),

  // Hermes CLI operations
  hermesUpdate: () => ipcRenderer.invoke("hermes-update"),
  hermesUpdateCheck: () => ipcRenderer.invoke("hermes-update-check"),
  gatewayStatus: () => ipcRenderer.invoke("gateway-status"),
  gatewayStart: () => ipcRenderer.invoke("gateway-start"),
  gatewayRestart: () => ipcRenderer.invoke("gateway-restart"),
  runHermesCmd: (args) => ipcRenderer.invoke("run-hermes-cmd", args),
  updateEnvKey: (provider, key, baseUrl) => ipcRenderer.invoke("update-env-key", provider, key, baseUrl),
  fetchLatestVersion: () => ipcRenderer.invoke("fetch-latest-version"),

  // Startup status (for splash screen)
  onStartupStatus: (callback) => ipcRenderer.on("startup-status", (event, msg) => callback(msg)),

  // Screenshot & image
  captureScreenshot: () => ipcRenderer.invoke("capture-screenshot"),
  onSnipData: (callback) => ipcRenderer.on("snip-data", (event, data) => callback(data)),
  snipResult: (data) => ipcRenderer.send("snip-result", data),
  saveTempImage: (dataUrl) => ipcRenderer.invoke("save-temp-image", dataUrl),

  // ── Float dialog ──
  // Speech text received from voice engine
  onSpeechText: (callback) => ipcRenderer.on("speech-text", (event, text) => callback(text)),
  // Dialog show/hide events
  onDialogShow: (callback) => ipcRenderer.on("dialog-show", () => callback()),
  onDialogHide: (callback) => ipcRenderer.on("dialog-hide", () => callback()),
  // Silence detected (start auto-hide timer)
  onDialogSilence: (callback) => ipcRenderer.on("dialog-silence", () => callback()),
  // Listening state
  onDialogListening: (callback) => ipcRenderer.on("dialog-listening", () => callback()),
  // Audio level for voice visualization
  onAudioLevel: (callback) => ipcRenderer.on("audio-level", (event, info) => callback(info)),
  // Voice mode changed (continuous/normal)
  onVoiceModeChanged: (callback) => ipcRenderer.on("voice-mode-changed", (event, mode) => callback(mode)),
  // TTS request (voice param is optional)
  // Chat mic: Vosk-based speech recognition
  startChatMic: () => ipcRenderer.invoke("start-chat-mic"),
  stopChatMic: () => ipcRenderer.invoke("stop-chat-mic"),
  // Dialog window controls
  dialogClose: () => ipcRenderer.send("dialog-close"),
  dialogAutoHide: () => ipcRenderer.send("dialog-auto-hide"),

  // ── Setup ──
  runSetup: (action) => ipcRenderer.invoke("run-setup", action),
  saveConfig: (cfg) => ipcRenderer.invoke("save-config", cfg),
  addCustomProvider: (provider) => ipcRenderer.invoke("add-custom-provider", provider),
  listCustomProviders: () => ipcRenderer.invoke("list-custom-providers"),
  removeCustomProvider: (name) => ipcRenderer.invoke("remove-custom-provider", name),
  closeSetup: () => ipcRenderer.invoke("close-setup"),
  getConfig: () => ipcRenderer.invoke("get-config"),

  // ── Window controls ──
  openChat: (newSession) => ipcRenderer.send("open-chat", newSession),
  onModelChanged: (callback) => ipcRenderer.on("model-changed", () => callback()),
  notifyModelSwitched: () => ipcRenderer.send("model-switched"),
  minimize: () => ipcRenderer.send("window-minimize"),
  showMain: () => ipcRenderer.send("show-main-window"),
  quitApp: () => ipcRenderer.send("quit-app"),
  petGetState: () => ipcRenderer.invoke("pet-get-state"),
  petSaveState: (state) => ipcRenderer.invoke("pet-save-state", state),
  ttsSpeak: (text, voice) => ipcRenderer.invoke("tts-speak", text, voice),
  ttsCheck: () => ipcRenderer.invoke("tts-check"),
  ttsVoices: () => ipcRenderer.invoke("tts-voices"),
  scanDesktop: () => ipcRenderer.invoke("scan-desktop"),
  scanSystem: () => ipcRenderer.invoke("scan-system"),
  petMouseEnter: () => ipcRenderer.send("pet-mouse-enter"),
  petMouseLeave: () => ipcRenderer.send("pet-mouse-leave"),
  setVoiceMode: (mode) => ipcRenderer.send("set-voice-mode", mode),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  closeChat: () => ipcRenderer.send("close-chat"),
  onNewSession: (callback) => ipcRenderer.on("new-chat-session", () => callback()),
  notifyWakeWord: () => ipcRenderer.send("wake-word-detected"),

  // ── Security ──
  fetchModels: () => ipcRenderer.invoke("fetch-models"),
  ollamaList: () => ipcRenderer.invoke("ollama-list"),
  ollamaPull: (model) => ipcRenderer.invoke("ollama-pull", model),
    onOllamaPullProgress: (cb) => ipcRenderer.on("ollama-pull-progress", (e, info) => cb(info)),
  kbAdd: (filepath) => ipcRenderer.invoke("kb-add", filepath),
  kbRemove: (docId) => ipcRenderer.invoke("kb-remove", docId),
  kbList: () => ipcRenderer.invoke("kb-list"),
  kbSearch: (query, topK) => ipcRenderer.invoke("kb-search", query, topK),
  kbStats: () => ipcRenderer.invoke("kb-stats"),
  kbPickFile: () => ipcRenderer.invoke("kb-pick-file"),
  getSecurityStatus: () => ipcRenderer.invoke("get-security-status"),
  performSecurityCheck: () => ipcRenderer.invoke("perform-security-check"),
  initializeSecurity: () => ipcRenderer.invoke("initialize-security"),
});
