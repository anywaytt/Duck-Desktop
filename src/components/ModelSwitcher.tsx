import React, { useState, useRef, useEffect, memo } from "react";
import { ChevronDown, Check, Cpu, Eye, Wrench, RefreshCw } from "lucide-react";
import type { ModelInfo, ModelOptionsResponse, AuxiliaryModelsResponse } from "@/lib/hermes-api";

interface Props {
  modelInfo: ModelInfo | null;
  modelOptions: ModelOptionsResponse | null;
  auxModels: AuxiliaryModelsResponse | null;
  onSwitch: (provider: string, model: string) => Promise<void>;
  onRefresh: () => void;
}

export default memo(function ModelSwitcher({ modelInfo, modelOptions, auxModels, onSwitch, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = async (provider: string, model: string) => {
    setSwitching(true);
    try { await onSwitch(provider, model); } catch (e) { console.error("切换失败:", e); }
    setSwitching(false);
    setOpen(false);
  };

  const providers = modelOptions?.providers || [];
  const currentModel = modelInfo?.model || "未知";
  const currentProvider = modelInfo?.provider || "";
  const caps = modelInfo?.capabilities;

  return (
    <div className="space-y-3">
      {/* 当前模型卡片 */}
      <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-hermes-text">当前模型</h3>
          <button onClick={onRefresh} className="p-1 rounded hover:bg-white/5 transition-colors" title="刷新">
            <RefreshCw size={14} className="text-hermes-muted" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-hermes-accent/10 flex items-center justify-center">
            <Cpu size={20} className="text-hermes-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-hermes-text truncate">{currentModel}</p>
            <p className="text-xs text-hermes-muted">{currentProvider}</p>
          </div>
        </div>

        {caps && (
          <div className="flex flex-wrap gap-1.5">
            {caps.supports_tools && <Badge icon={<Wrench size={10} />} label="工具" color="amber" />}
            {caps.supports_vision && <Badge icon={<Eye size={10} />} label="视觉" color="blue" />}
            {caps.supports_reasoning && <Badge label="推理" color="purple" />}
            {caps.context_window && <Badge label={`${(caps.context_window / 1000).toFixed(0)}K 上下文`} color="cyan" />}
            {caps.max_output_tokens && <Badge label={`${(caps.max_output_tokens / 1000).toFixed(0)}K 输出`} color="emerald" />}
          </div>
        )}
      </div>

      {/* 模型选择器 */}
      <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
        <h3 className="text-sm font-medium text-hermes-text mb-3">切换模型</h3>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-hermes-bg/60 border border-hermes-border/30 rounded-lg text-sm text-hermes-text hover:border-hermes-border/60 transition-colors"
          >
            <span className="truncate">{switching ? "切换中..." : currentModel}</span>
            <ChevronDown size={14} className={`text-hermes-muted transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute z-50 w-full mt-1 bg-hermes-card border border-hermes-border/40 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
              {providers.map(p => (
                <div key={p.slug}>
                  <div className="px-3 py-1.5 text-[10px] text-hermes-muted uppercase tracking-wider bg-hermes-bg/40 sticky top-0">{p.name}</div>
                  {(p.models || []).map(m => {
                    const isSelected = p.slug === currentProvider && m === currentModel;
                    return (
                      <button
                        key={`${p.slug}/${m}`}
                        onClick={() => handleSelect(p.slug, m)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                      >
                        <span className={`truncate ${isSelected ? "text-hermes-accent" : "text-hermes-text"}`}>{m}</span>
                        {isSelected && <Check size={12} className="text-hermes-accent flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {providers.length === 0 && <p className="px-3 py-4 text-xs text-hermes-muted text-center">暂无可用模型</p>}
            </div>
          )}
        </div>
      </div>

      {/* 辅助任务模型 */}
      {auxModels?.tasks && auxModels.tasks.length > 0 && (
        <div className="bg-hermes-surface/60 border border-hermes-border/20 rounded-xl p-4">
          <h3 className="text-sm font-medium text-hermes-text mb-3">辅助任务模型</h3>
          <div className="space-y-2">
            {auxModels.tasks.map(t => {
              const taskNames: Record<string, string> = {
                vision: "图像识别", web_extract: "网页摘要", compression: "上下文压缩",
                session_search: "会话搜索", skills_hub: "技能搜索", approval: "自动审批",
                mcp: "MCP 路由", title_generation: "标题生成", curator: "技能审查",
              };
              return (
                <div key={t.task} className="flex items-center justify-between text-xs">
                  <span className="text-hermes-muted">{taskNames[t.task] || t.task}</span>
                  <span className="text-hermes-text font-mono text-[10px] truncate ml-2 max-w-[180px]" title={t.model}>
                    {t.model.split("/").pop() || t.model}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

function Badge({ icon, label, color }: { icon?: React.ReactNode; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${colorMap[color] || colorMap.amber}`}>
      {icon}{label}
    </span>
  );
}
