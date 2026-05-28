import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertCircle, Loader2, Terminal, Download, ArrowRight, Cpu, Server } from "lucide-react";

interface EnvironmentStatus {
  hermes: { installed: boolean; version: string | null };
  python: { available: boolean; command: string | null; version: string | null };
  node: { available: boolean; version: string | null };
  hermesHome: string;
  installDir: string;
  platform: string;
  arch: string;
  hostname: string;
  ready: boolean;
}

interface SetupStep {
  step: string;
  message: string;
  status?: EnvironmentStatus;
}

interface Props {
  onComplete: () => void;
}

export default function SetupPage({ onComplete }: Props) {
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hermesWebPort, setHermesWebPort] = useState(9119);
  const [startingWeb, setStartingWeb] = useState(false);

  // 检查环境状态
  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    setLoading(true);
    try {
      // 通过 IPC 检查环境
      const status = await (window as any).electronAPI?.getEnvironmentStatus?.();
      if (status) {
        setEnvStatus(status);
      } else {
        // 浏览器模式下模拟
        setEnvStatus({
          hermes: { installed: false, version: null },
          python: { available: false, command: null, version: null },
          node: { available: false, version: null },
          hermesHome: "~/.hermes",
          installDir: "",
          platform: "win32",
          arch: "x64",
          hostname: "desktop",
          ready: false,
        });
      }
    } catch (err) {
      setError("检测环境失败");
    }
    setLoading(false);
  };

  const startInstall = async () => {
    setInstalling(true);
    setSteps([]);
    setError(null);

    try {
      // 使用现有的runSetup方法，它返回一个Promise
      const result = await (window as any).electronAPI?.runSetup?.("install");
      
      // 添加完成步骤
      setSteps((prev) => [...prev, { step: "complete", message: "安装完成" }]);
      
      // 重新检查环境状态
      await checkEnvironment();
    } catch (err: any) {
      setError(err.message || "安装失败");
      setSteps((prev) => [...prev, { step: "error", message: err.message || "安装失败" }]);
    }
    setInstalling(false);
  };

  const startHermesWeb = async () => {
    setStartingWeb(true);
    try {
      await (window as any).electronAPI?.startHermesWeb?.(hermesWebPort);
      // 等待服务启动
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "启动失败");
    }
    setStartingWeb(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-hermes-bg">
        <div className="text-center">
          <Loader2 size={32} className="text-hermes-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-hermes-muted">正在检测环境...</p>
        </div>
      </div>
    );
  }

  const isReady = envStatus?.ready;
  const needsInstall = envStatus && !envStatus.hermes.installed;
  const hasPython = envStatus?.python.available;

  return (
    <div className="h-full overflow-y-auto p-8 bg-hermes-bg">
      <div className="max-w-2xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-hermes-accent/10 flex items-center justify-center">
            <Server size={32} className="text-hermes-accent" />
          </div>
          <h1 className="text-2xl font-bold text-hermes-text mb-2">Hermes 环境设置</h1>
          <p className="text-sm text-hermes-muted">
            首次运行需要安装 Hermes Agent 运行环境
          </p>
        </div>

        {/* 环境状态卡片 */}
        <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-hermes-text mb-4">环境状态</h2>
          
          <div className="space-y-3">
            {/* Python */}
            <StatusRow
              label="Python"
              installed={hasPython}
              version={envStatus?.python.version || null}
              icon={<Terminal size={16} />}
              description={hasPython ? `${envStatus?.python.command} 可用` : "需要安装 Python 3.11+"}
            />

            {/* Node.js */}
            <StatusRow
              label="Node.js"
              installed={!!envStatus?.node.available}
              version={envStatus?.node.version || null}
              icon={<Cpu size={16} />}
              description={envStatus?.node.available ? "已安装" : "未安装（可选）"}
            />

            {/* Hermes */}
            <StatusRow
              label="Hermes Agent"
              installed={!!envStatus?.hermes.installed}
              version={envStatus?.hermes.version || null}
              icon={<Server size={16} />}
              description={envStatus?.hermes.installed ? `v${envStatus.hermes.version}` : "需要安装"}
              primary
            />
          </div>
        </div>

        {/* 安装步骤 */}
        {(needsInstall || installing) && (
          <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-hermes-text mb-4">安装进度</h2>
            
            {installing ? (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {step.step === "error" ? (
                      <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    ) : step.step === "complete" ? (
                      <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Loader2 size={14} className="text-hermes-accent animate-spin flex-shrink-0" />
                    )}
                    <span className={step.step === "error" ? "text-red-400" : "text-hermes-muted"}>
                      {step.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : !isReady && (
              <button
                onClick={startInstall}
                disabled={!hasPython}
                className="w-full py-3 px-4 rounded-lg bg-hermes-accent text-hermes-bg font-medium
                  hover:bg-hermes-warm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                <Download size={18} />
                一键安装 Hermes
              </button>
            )}
          </div>
        )}

        {/* 启动 Hermes Web */}
        {isReady && (
          <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-hermes-text mb-4">启动 Hermes</h2>
            <p className="text-xs text-hermes-muted mb-4">
              启动 Hermes Web 服务以启用模型切换、Token 追踪等功能
            </p>
            
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs text-hermes-muted">端口:</label>
              <input
                type="number"
                value={hermesWebPort}
                onChange={(e) => setHermesWebPort(Number(e.target.value))}
                className="w-24 px-3 py-1.5 rounded-lg bg-hermes-bg/60 border border-hermes-border/30 
                  text-sm text-hermes-text focus:outline-none focus:border-hermes-accent"
              />
            </div>
            
            <button
              onClick={startHermesWeb}
              disabled={startingWeb}
              className="w-full py-3 px-4 rounded-lg bg-hermes-accent text-hermes-bg font-medium
                hover:bg-hermes-warm transition-colors disabled:opacity-50
                flex items-center justify-center gap-2"
            >
              {startingWeb ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  正在启动...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  启动并进入控制面板
                </>
              )}
            </button>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* 跳过提示 */}
        <div className="text-center">
          <button
            onClick={onComplete}
            className="text-xs text-hermes-muted/40 hover:text-hermes-muted transition-colors"
          >
            跳过，直接进入控制面板 →
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, installed, version, icon, description, primary }: {
  label: string;
  installed: boolean;
  version: string | null;
  icon: React.ReactNode;
  description: string;
  primary?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      primary ? "bg-hermes-bg/40 border border-hermes-border/20" : ""
    }`}>
      <div className={`p-1.5 rounded-lg ${
        installed ? "bg-emerald-500/10" : "bg-red-500/10"
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-hermes-text">{label}</span>
          {version && (
            <span className="text-xs text-hermes-muted font-mono">{version}</span>
          )}
        </div>
        <p className="text-xs text-hermes-muted/60 mt-0.5">{description}</p>
      </div>
      <div>
        {installed ? (
          <CheckCircle size={18} className="text-emerald-400" />
        ) : (
          <AlertCircle size={18} className="text-red-400" />
        )}
      </div>
    </div>
  );
}
