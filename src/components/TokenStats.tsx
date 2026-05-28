import React, { useState, useCallback, memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Zap, DollarSign, TrendingUp } from "lucide-react";
import type { AnalyticsResponse, ModelsAnalyticsResponse } from "@/lib/hermes-api";

interface Props {
  analytics: AnalyticsResponse | null;
  modelAnalytics: ModelsAnalyticsResponse | null;
  loading: boolean;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

const COLORS = ["#f5a623", "#e8920d", "#ffd98e", "#d97757", "#a78bfa", "#6a9bcc"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-hermes-card/95 backdrop-blur border border-hermes-border/30 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-hermes-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatTokens(p.value)}
        </p>
      ))}
    </div>
  );
}

export default memo(function TokenStats({ analytics, modelAnalytics, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-white/5 rounded mb-4" />
        <div className="h-40 bg-white/5 rounded" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-5">
        <p className="text-hermes-muted text-sm">暂无 Token 数据</p>
      </div>
    );
  }

  const { totals, daily, by_model } = analytics;
  const totalTokens = totals.total_input + totals.total_output;
  const dailyData = daily.map(d => ({
    day: d.day.slice(5),
    input: d.input_tokens,
    output: d.output_tokens,
    total: d.input_tokens + d.output_tokens,
  }));

  const topModels = modelAnalytics?.models?.slice(0, 6) || [];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="总 Token"
          value={formatTokens(totalTokens)}
          icon={<Zap size={16} className="text-hermes-accent" />}
          color="#f5a623"
        />
        <SummaryCard
          label="输入 Token"
          value={formatTokens(totals.total_input)}
          icon={<ArrowDownRight size={16} className="text-hermes-light" />}
          color="#ffd98e"
        />
        <SummaryCard
          label="输出 Token"
          value={formatTokens(totals.total_output)}
          icon={<ArrowUpRight size={16} className="text-hermes-warm" />}
          color="#e8920d"
        />
        <SummaryCard
          label="预估费用"
          value={formatCost(totals.total_estimated_cost)}
          icon={<DollarSign size={16} className="text-rose-400" />}
          color="#d97757"
        />
      </div>

      {/* Daily Token Usage Chart */}
      <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-hermes-text flex items-center gap-2">
            <TrendingUp size={14} className="text-hermes-accent" />
            每日 Token 用量
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyData} barGap={2}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8a8580" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#8a8580" }} axisLine={false} tickLine={false} tickFormatter={formatTokens} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="input" name="输入" stackId="a" fill="#ffd98e" />
            <Bar dataKey="output" name="输出" stackId="a" fill="#f5a623" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Models */}
      {topModels.length > 0 && (
        <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
          <h3 className="text-sm font-medium text-hermes-text mb-3">热门模型</h3>
          <div className="space-y-2">
            {topModels.map((m, i) => {
              const total = m.input_tokens + m.output_tokens;
              const maxTotal = topModels[0] ? topModels[0].input_tokens + topModels[0].output_tokens : 1;
              return (
                <div key={m.model} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-hermes-text truncate flex-shrink-0 w-32" title={m.model}>
                    {m.model.split("/").pop() || m.model}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(total / maxTotal) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="text-[10px] text-hermes-muted tabular-nums w-16 text-right">{formatTokens(total)}</span>
                  <span className="text-[10px] text-hermes-muted/60 w-14 text-right">{formatCost(m.estimated_cost)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-3 hover:border-hermes-border/40 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded" style={{ backgroundColor: `${color}15` }}>{icon}</div>
        <span className="text-[10px] text-hermes-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
