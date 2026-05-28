/**
 * Duck Desktop Security Module
 * Provides code integrity verification and tamper detection.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// Core files that should be protected
const PROTECTED_FILES = [
  "main.cjs",
  "preload.cjs",
  "hermes-cli.cjs",
  "security.cjs",
  "chat.html",
  "pet.html",
  "float-dialog.html",
  "float-dialog.js",
  "float-dialog.css",
  "wake_listener.py",
  "whisper_model.py",
  "mic_utils.py",
  "chat_mic.py",
  "duck_tts.py"
];

// Checksum storage path (lazy-loaded to avoid app.getPath() crash at module load time)
function getCheckSumDir() {
  return path.join(app.getPath("userData"), "security");
}
function getCheckSumFile() {
  return path.join(getCheckSumDir(), "checksums.json");
}

/**
 * Calculate SHA-256 hash of a file
 */
function calculateFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch (e) {
    return null;
  }
}

/**
 * Get all protected file paths
 */
function getProtectedFilePaths() {
  const electronDir = __dirname;
  return PROTECTED_FILES.map(file => path.join(electronDir, file));
}

/**
 * Calculate checksums for all protected files
 */
function calculateAllChecksums() {
  const checksums = {};
  const filePaths = getProtectedFilePaths();
  
  for (const filePath of filePaths) {
    const relativePath = path.relative(__dirname, filePath);
    const hash = calculateFileHash(filePath);
    if (hash) {
      checksums[relativePath] = {
        hash: hash,
        timestamp: Date.now(),
        size: fs.statSync(filePath).size
      };
    }
  }
  
  return checksums;
}

/**
 * Save checksums to file
 */
function saveChecksums(checksums) {
  try {
    const checkSumDir = getCheckSumDir();
    if (!fs.existsSync(checkSumDir)) {
      fs.mkdirSync(checkSumDir, { recursive: true });
    }
    fs.writeFileSync(getCheckSumFile(), JSON.stringify(checksums, null, 2));
    return true;
  } catch (e) {
    console.error("[security] Failed to save checksums:", e.message);
    return false;
  }
}

/**
 * Load checksums from file
 */
function loadChecksums() {
  try {
    if (fs.existsSync(getCheckSumFile())) {
      return JSON.parse(fs.readFileSync(getCheckSumFile(), "utf-8"));
    }
  } catch (e) {
    console.error("[security] Failed to load checksums:", e.message);
  }
  return null;
}

/**
 * Verify file integrity against saved checksums
 * Returns: { valid: boolean, modified: string[], missing: string[], new: string[] }
 */
function verifyIntegrity() {
  const savedChecksums = loadChecksums();
  if (!savedChecksums) {
    return { valid: false, modified: [], missing: [], new: [], error: "No saved checksums found" };
  }
  
  const currentChecksums = calculateAllChecksums();
  const modified = [];
  const missing = [];
  const newFiles = [];
  
  // Check for modified or missing files
  for (const [file, saved] of Object.entries(savedChecksums)) {
    const current = currentChecksums[file];
    if (!current) {
      missing.push(file);
    } else if (current.hash !== saved.hash) {
      modified.push({
        file: file,
        expectedHash: saved.hash.substring(0, 16) + "...",
        actualHash: current.hash.substring(0, 16) + "...",
        savedTime: new Date(saved.timestamp).toISOString()
      });
    }
  }
  
  // Check for new files
  for (const file of Object.keys(currentChecksums)) {
    if (!savedChecksums[file]) {
      newFiles.push(file);
    }
  }
  
  return {
    valid: modified.length === 0 && missing.length === 0,
    modified: modified,
    missing: missing,
    new: newFiles
  };
}

/**
 * Initialize security system
 * Should be called once when app is first installed or updated
 */
function initializeSecurity() {
  console.log("[security] Initializing security checksums...");
  const checksums = calculateAllChecksums();
  const saved = saveChecksums(checksums);
  if (saved) {
    console.log("[security] Checksums saved for", Object.keys(checksums).length, "files");
  }
  return saved;
}

/**
 * Perform security check
 * Returns: { safe: boolean, message: string, details: object }
 */
function performSecurityCheck() {
  const result = verifyIntegrity();
  
  if (result.error) {
    return {
      safe: false,
      message: "安全检查失败：" + result.error,
      details: result
    };
  }
  
  if (!result.valid) {
    const issues = [];
    if (result.modified.length > 0) {
      issues.push(`${result.modified.length} 个文件被修改`);
    }
    if (result.missing.length > 0) {
      issues.push(`${result.missing.length} 个文件丢失`);
    }
    
    return {
      safe: false,
      message: "检测到文件异常：" + issues.join("，"),
      details: result
    };
  }
  
  return {
    safe: true,
    message: "文件完整性验证通过",
    details: result
  };
}

/**
 * Get security status for display
 */
function getSecurityStatus() {
  const checksums = loadChecksums();
  if (!checksums) {
    return { initialized: false, fileCount: 0, lastCheck: null };
  }
  
  return {
    initialized: true,
    fileCount: Object.keys(checksums).length,
    lastCheck: new Date(Math.max(...Object.values(checksums).map(c => c.timestamp))).toISOString()
  };
}

module.exports = {
  initializeSecurity,
  performSecurityCheck,
  getSecurityStatus,
  calculateAllChecksums,
  verifyIntegrity,
  PROTECTED_FILES
};
