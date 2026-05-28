import React, { memo } from "react";
import { MessageSquare, Wrench, Clock, Zap } from "lucide-react";
import type { SessionInfo } from "@/lib/hermes-api";

interface Props {
  sessions: SessionInfo[];
  total: number;
}

function formatTime(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default memo(function SessionOverview({ sessions, total }: Props) {
  if (!sessions.length) {
    return (
      <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-5">
        <h3 className="text-sm font-medium text-hermes-text mb-3">最近会话</h3>
        <p className="text-xs text-hermes-muted text-center py-6">暂无会话记录</p>
      </div>
    );
  }

  return (
    <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-hermes-text">最近会话</h3>
        <span className="text-[10px] text-hermes-muted">共 {total} 个</span>
      </div>
      <div className="space-y-2">
        {sessions.map(s => (
          <div
            key={s.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-hermes-bg/30 border border-hermes-border/10 hover:border-hermes-border/30 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? "bg-hermes-accent animate-pulse-glow" : "bg-hermes-muted/30"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-hermes-text truncate">
                {s.title || s.preview || "未命名会话"}
              </p>
              <p className="text-[10px] text-hermes-muted mt-0.5">
                {s.model || "未知"} · {s.source || "cli"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-hermes-muted" title="消息数">
                <MessageSquare size={10} /><span>{s.message_count}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-hermes-muted" title="工具调用">
                <Wrench size={10} /><span>{s.tool_call_count}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-hermes-muted" title="Token">
                <Zap size={10} /><span>{formatTokens(s.input_tokens + s.output_tokens)}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-hermes-muted/60" title="最后活跃">
                <Clock size={10} /><span>{formatTime(s.last_active)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
