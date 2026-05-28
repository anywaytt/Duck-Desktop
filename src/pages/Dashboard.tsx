import React from "react";
import { Cpu, MemoryStick, HardDrive, Activity, ExternalLink } from "lucide-react";
import { useSystemStats, useSystemInfo } from "@/hooks/useSystemStats";
import { useHermesStatus, useModelInfo, useAnalytics, useSessions } from "@/hooks/useHermesAPI";
import * as api from "@/lib/hermes-api";
import StatCard from "@/components/SystemMonitor";
import TokenStats from "@/components/TokenStats";
import ModelSwitcher from "@/components/ModelSwitcher";
import SessionOverview from "@/components/SessionOverview";
import UpdatePanel from "@/components/UpdatePanel";

export default function Dashboard() {
  const { stats, history } = useSystemStats(2000);
  const sysInfo = useSystemInfo();
  const { status, error: statusError, refresh: refreshStatus } = useHermesStatus(10000);
  const { info: modelInfo, options, aux, refresh: refreshModel, switchModel } = useModelInfo();
  const { data: analytics, modelData, loading: analyticsLoading } = useAnalytics(7);
  const { sessions, total } = useSessions(6);

  const hermesOnline = !!status && !statusError;
  const restartGateway = async () => {
    await api.restartGateway();
    await refreshStatus();
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-hermes-text">控制面板</h1>
          <p className="text-xs text-hermes-muted mt-0.5">
            {hermesOnline
              ? `Hermes v${status?.version || "?"} · 网关${status?.gateway_running ? "运行中" : "已停止"} · ${status?.active_sessions || 0} 个活跃会话`
              : "Hermes 离线 — 请运行 `hermes web` 启动"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
            hermesOnline
              ? "bg-hermes-accent/10 text-hermes-accent border border-hermes-accent/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${hermesOnline ? "bg-hermes-accent" : "bg-red-400"}`} />
            {hermesOnline ? "在线" : "离线"}
          </div>
          {sysInfo.hostname && (
            <span className="text-[10px] text-hermes-muted/60 px-2">
              {sysInfo.hostname} · {sysInfo.cpuModel ? `${sysInfo.cpuModel.split(" ").slice(0, 3).join(" ")} (${sysInfo.cores}核)` : sysInfo.platform}
            </span>
          )}
        </div>
      </div>

      {/* 设备性能监控 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="处理器"
          value={stats.cpu}
          color="#f5a623"
          icon={<Cpu size={16} className="text-hermes-accent" />}
          history={history}
          dataKey="cpu"
          subtitle={sysInfo.cpuModel ? `${sysInfo.cores} 核 · ${sysInfo.arch}` : undefined}
        />
        <StatCard
          label="内存"
          value={stats.memoryPercent}
          color="#ffd98e"
          icon={<MemoryStick size={16} className="text-hermes-light" />}
          history={history}
          dataKey="memoryPercent"
          subtitle={stats.memoryTotal > 0 ? `${stats.memoryUsed} / ${stats.memoryTotal} MB` : undefined}
        />
        <StatCard
          label="磁盘"
          value={stats.diskPercent || 0}
          color="#a78bfa"
          icon={<HardDrive size={16} className="text-purple-400" />}
          history={history}
          dataKey="diskPercent"
          subtitle={stats.diskTotal > 0 ? `共 ${stats.diskTotal} GB` : undefined}
        />
        <StatCard
          label="网络"
          value={stats.networkDown}
          unit=" KB/s"
          max={10240}
          color="#e8920d"
          icon={<Activity size={16} className="text-hermes-warm" />}
          history={history}
          dataKey="networkDown"
          subtitle={stats.networkUp > 0 ? `↑ ${stats.networkUp} KB/s` : undefined}
        />
      </div>

      {/* 主内容区：两栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TokenStats analytics={analytics} modelAnalytics={modelData} loading={analyticsLoading} />
        </div>
        <div>
          <ModelSwitcher
            modelInfo={modelInfo}
            modelOptions={options}
            auxModels={aux}
            onSwitch={switchModel}
            onRefresh={refreshModel}
          />
        </div>
      </div>

      {/* 自动更新 + 最近会话 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SessionOverview sessions={sessions} total={total} />
        </div>
        <div>
          <UpdatePanel status={status} onRestartGateway={restartGateway} />
        </div>
      </div>

      {/* 页脚 */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-[10px] text-hermes-muted/40">Duck Desktop v1.0.0</span>
        {hermesOnline && (
          <a
            href="http://127.0.0.1:9119"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-hermes-muted/40 hover:text-hermes-accent transition-colors"
          >
            <ExternalLink size={10} />
            打开 Hermes 网页版
          </a>
        )}
      </div>
    </div>
  );
}
