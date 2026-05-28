import React, { memo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { SystemStats } from "@/hooks/useSystemStats";

interface Props {
  label: string;
  value: number;
  unit?: string;
  max?: number;
  color: string;
  icon: React.ReactNode;
  history: SystemStats[];
  dataKey: keyof SystemStats;
  subtitle?: string;
}

function MiniChart({ history, dataKey, color }: { history: SystemStats[]; dataKey: string; color: string }) {
  const data = history.map((s, i) => ({
    i,
    v: (s as any)[dataKey] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          isAnimationActive={false}
        />
        <XAxis hide />
        <YAxis hide domain={[0, "auto"]} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default memo(function StatCard({ label, value, unit = "%", max = 100, color, icon, history, dataKey, subtitle }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="bg-hermes-surface/60 backdrop-blur-sm border border-hermes-border/20 rounded-xl p-3.5 flex flex-col gap-2 hover:border-hermes-border/40 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            {icon}
          </div>
          <span className="text-xs font-medium text-hermes-muted uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-lg font-semibold tabular-nums" style={{ color }}>
          {typeof value === "number" ? (unit === "%" ? `${Math.round(value)}%` : `${value}${unit}`) : value}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Mini chart */}
      <div className="-mx-1">
        <MiniChart history={history} dataKey={dataKey as string} color={color} />
      </div>

      {/* Subtitle */}
      {subtitle && <span className="text-[10px] text-hermes-muted/60">{subtitle}</span>}
    </div>
  );
});
