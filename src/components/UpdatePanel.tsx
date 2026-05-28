import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight, ExternalLink, Package } from "lucide-react";
import type { StatusResponse } from "@/lib/hermes-api";

interface Props {
  status: StatusResponse | null;
  onRestartGateway: () => Promise<void>;
}

interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  releaseUrl: string | null;
  releaseNotes: string | null;
  lastChecked: number;
}

export default memo(function UpdatePanel({ status, onRestartGateway }: Props) {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateOutput, setUpdateOutput] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCheck, setAutoCheck] = useState(true);
  const checkingRef = useRef(false);

  const currentVersion = status?.version || "未知";
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;
  const hasUpdate = updateResult?.hasUpdate;

  // 自动检测更新（每小时一次）
  useEffect(() => {
    if (!autoCheck || !status?.version) return;
    // 防止React StrictMode下的重复调用
    if (!checkingRef.current) {
      checkForUpdates();
    }
    const interval = setInterval(() => {
      if (!checkingRef.current) {
        checkForUpdates();
      }
    }, 3600000);
    return () => clearInterval(interval);
  }, [autoCheck, status?.version]);

  const checkForUpdates = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError(null);
    try {
      // 优先使用 Electron IPC（绕过 CORS）
      if (isElectron && (window as any).electronAPI?.fetchLatestVersion) {
        const result = await (window as any).electronAPI.fetchLatestVersion();
        if (result.ok) {
          const hasUpdate = result.version && result.version !== currentVersion;
          setUpdateResult({
            currentVersion,
            latestVersion: result.version,
            hasUpdate,
            releaseUrl: result.url,
            releaseNotes: result.notes,
            lastChecked: Date.now(),
          });
        } else {
          setError("无法连接到更新服务器");
        }
      } else {
        // Web fallback
        const response = await fetch("https://api.github.com/repos/NousResearch/hermes-agent/releases/latest", {
          headers: { "Accept": "application/vnd.github.v3+json" },
        });
        if (response.ok) {
          const data = await response.json();
          const latestVersion = data.tag_name?.replace(/^v/, '');
          const hasUpdate = latestVersion && latestVersion !== currentVersion;
          setUpdateResult({
            currentVersion,
            latestVersion,
            hasUpdate,
            releaseUrl: data.html_url,
            releaseNotes: data.body,
            lastChecked: Date.now(),
          });
        } else {
          setError("无法连接到更新服务器");
        }
      }
    } catch (err: any) {
      setError(err.message || "检查更新失败");
    }
    checkingRef.current = false;
    setChecking(false);
  }, [currentVersion, isElectron]);

  const performUpdate = useCallback(async () => {
    setUpdating(true);
    setUpdateOutput("");
    setError(null);

    // 优先使用 Electron IPC 直接调 hermes CLI
    if (isElectron && (window as any).electronAPI?.runHermesCmd) {
      try {
        setUpdateOutput("正在执行 hermes update ...\n");
        const result = await (window as any).electronAPI.runHermesCmd(["update"]);
        if (result.ok) {
          setUpdateOutput(prev => prev + result.stdout + "\n\n✅ 更新完成！");
          // 重启网关
          setTimeout(async () => {
            try { await onRestartGateway(); } catch {}
            setUpdateOutput(prev => prev + "\n网关已重启。");
            checkForUpdates();
          }, 2000);
        } else {
          setError(`更新失败: ${result.stderr || result.stdout || "未知错误"}`);
        }
      } catch (err: any) {
        setError(err.message || "更新失败");
      }
      setUpdating(false);
      return;
    }

    // Fallback: 通过网关 API
    try {
      const response = await fetch("/api/hermes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        setUpdateOutput(data.output || "更新已启动...");
        if (data.name) pollUpdateStatus(data.name);
      } else {
        setError("网关未运行，无法通过 API 更新");
        setUpdating(false);
      }
    } catch (err: any) {
      setError("网关未运行，请在终端执行 hermes update");
      setUpdating(false);
    }
  }, [isElectron, onRestartGateway, checkForUpdates]);

  const pollUpdateStatus = useCallback(async (actionName: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) { setError("更新超时"); setUpdating(false); return; }
      try {
        const response = await fetch(`/api/actions/${actionName}/status?lines=100`);
        if (response.ok) {
          const data = await response.json();
          setUpdateOutput(data.lines?.join("\n") || "");
          if (!data.running) {
            if (data.exit_code === 0) {
              setUpdateOutput(prev => prev + "\n\n✅ 更新完成！");
              setTimeout(async () => { await onRestartGateway(); checkForUpdates(); }, 3000);
            } else {
              setError(`更新失败 (退出码: ${data.exit_code})`);
            }
            setUpdating(false);
            return;
          }
        }
      } catch {}
      setTimeout(poll, 5000);
    };
    poll();
  }, [onRestartGateway, checkForUpdates]);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "从未";
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return d.toLocaleString("zh-CN");
  };

  // 折叠态：一行摘要
  if (!expanded) {
    return (
      <div
        className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl px-4 py-3 cursor-pointer hover:border-hermes-border/40 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-hermes-accent" />
            <span className="text-xs text-hermes-muted">v{currentVersion}</span>
            {hasUpdate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-hermes-accent/15 text-hermes-accent font-medium">
                {updateResult?.latestVersion} 可用
              </span>
            )}
            {!hasUpdate && updateResult && !error && (
              <span className="text-[10px] text-emerald-400/80">✓ 最新</span>
            )}
            {error && (
              <span className="text-[10px] text-red-400/80">检查失败</span>
            )}
          </div>
          <ChevronRight size={14} className="text-hermes-muted/40" />
        </div>
      </div>
    );
  }

  // 展开态
  return (
    <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-medium text-hermes-text flex items-center gap-2 cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <Download size={14} className="text-hermes-accent" />
          版本更新
          <ChevronDown size={12} className="text-hermes-muted/40 rotate-90" />
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-hermes-muted">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => setAutoCheck(e.target.checked)}
              className="rounded border-hermes-border/30"
            />
            自动检查
          </label>
          <button
            onClick={(e) => { e.stopPropagation(); checkForUpdates(); }}
            disabled={checking}
            className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
            title="手动检查更新"
          >
            <RefreshCw size={12} className={`text-hermes-muted ${checking ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 当前版本 + 检查时间 一行 */}
      <div className="flex items-center justify-between text-xs mb-3 px-1">
        <span className="text-hermes-muted">当前: <span className="font-mono text-hermes-text">{currentVersion}</span></span>
        <span className="text-hermes-muted/50">
          {updateResult ? formatTime(updateResult.lastChecked) : "从未检查"}
        </span>
      </div>

      {/* 更新状态 */}
      {updateResult?.hasUpdate && (
        <div className="mb-3 p-2.5 rounded-lg bg-hermes-accent/10 border border-hermes-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Download size={14} className="text-hermes-accent" />
            <span className="text-xs font-medium text-hermes-accent">
              新版本: {updateResult.latestVersion}
            </span>
          </div>

          {updateResult.releaseNotes && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-hermes-muted hover:text-hermes-text mb-2"
            >
              <ChevronDown size={10} className={`transition-transform ${showDetails ? "rotate-180" : ""}`} />
              {showDetails ? "收起" : "更新日志"}
            </button>
          )}

          {showDetails && updateResult.releaseNotes && (
            <div className="bg-hermes-bg/50 rounded p-2 mb-2 max-h-24 overflow-y-auto">
              <pre className="text-[10px] text-hermes-muted whitespace-pre-wrap">
                {updateResult.releaseNotes.slice(0, 300)}
              </pre>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); performUpdate(); }}
            disabled={updating}
            className="w-full py-1.5 px-3 rounded-lg bg-hermes-accent/20 hover:bg-hermes-accent/30 
              text-hermes-accent text-xs font-medium transition-colors disabled:opacity-50
              flex items-center justify-center gap-1.5"
          >
            {updating ? (
              <><Loader2 size={12} className="animate-spin" /> 更新中...</>
            ) : (
              <><Download size={12} /> 一键更新</>
            )}
          </button>

          {updateResult.releaseUrl && (
            <a
              href={updateResult.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-hermes-muted/50 hover:text-hermes-accent mt-1.5"
            >
              <ExternalLink size={9} />
              GitHub 详情
            </a>
          )}
        </div>
      )}

      {updateResult && !updateResult.hasUpdate && !error && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">已是最新版本</span>
        </div>
      )}

      {/* 更新输出 */}
      {updateOutput && (
        <div className="mb-3">
          <pre className="bg-hermes-bg/50 rounded p-2 text-[10px] text-hermes-muted/80 max-h-28 overflow-y-auto font-mono">
            {updateOutput}
          </pre>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-[10px] text-red-400">{error}</span>
          </div>
        </div>
      )}

      {!status?.gateway_running && (
        <div className="text-[10px] text-hermes-muted/40 text-center">
          网关未运行，部分功能可能不可用
        </div>
      )}
    </div>
  );
});
