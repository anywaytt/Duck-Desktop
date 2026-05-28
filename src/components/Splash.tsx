import React, { useState, useEffect } from "react";

interface Props {
  onReady: () => void;
  onNeedsSetup: () => void;
}

export default function Splash({ onReady, onNeedsSetup }: Props) {
  const [status, setStatus] = useState("正在启动...");
  const [dots, setDots] = useState("");

  useEffect(() => {
    // 动态省略号
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    // 监听主进程状态消息
    const api = (window as any).electronAPI;
    let cleanupListener: (() => void) | undefined;
    
    if (api?.onStartupStatus) {
      const handler = (msg: string) => {
        if (msg === "hermes-web-ready") {
          setStatus("Hermes 已就绪，正在加载控制面板...");
          setTimeout(() => onReady(), 800);
        } else if (msg === "hermes-not-installed") {
          setStatus("未检测到 Hermes，正在打开环境设置...");
          setTimeout(() => onNeedsSetup(), 800);
        } else {
          setStatus(msg);
        }
      };
      api.onStartupStatus(handler);
      // 保存清理函数（如果API支持的话）
      cleanupListener = () => {
        // Electron IPC监听器通常通过removeListener清理
        if (api.removeStartupStatusListener) {
          api.removeStartupStatusListener(handler);
        }
      };
    }

    // 超时保护：30秒后如果主进程没发消息，直接进 Dashboard
    const timeout = setTimeout(() => {
      onReady();
    }, 30000);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(timeout);
      if (cleanupListener) cleanupListener();
    };
  }, [onReady, onNeedsSetup]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-hermes-bg">
      {/* 小黄鸭 Logo */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-hermes-accent/10 flex items-center justify-center animate-pulse-glow">
          <svg width="64" height="64" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="128" cy="170" rx="85" ry="65" fill="#FFD700"/>
            <circle cx="180" cy="82" r="48" fill="#FFD700"/>
            <circle cx="196" cy="70" r="7" fill="#1a1408"/>
            <circle cx="198" cy="68" r="3" fill="white"/>
            <ellipse cx="222" cy="88" rx="28" ry="10" fill="#FFA500"/>
            <path d="M200 88 Q222 93 248 88" stroke="#FF8C00" strokeWidth="1.5" fill="none"/>
            <ellipse cx="95" cy="150" rx="35" ry="22" fill="#FFC800"/>
            <path d="M40 220 Q60 210 80 220 Q100 230 120 220 Q140 210 160 220 Q180 230 200 220 Q220 210 240 220" stroke="#4FC3F7" strokeWidth="3" fill="none" opacity="0.6"/>
          </svg>
        </div>
      </div>

      {/* 应用名 */}
      <h1 className="text-2xl font-bold text-hermes-text mb-2">Duck Desktop</h1>
      <p className="text-sm text-hermes-muted mb-8">Hermes Agent 智能助手</p>

      {/* 加载动画 */}
      <div className="flex gap-1.5 mb-4">
        <div className="w-2 h-2 rounded-full bg-hermes-accent animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 rounded-full bg-hermes-accent animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 rounded-full bg-hermes-accent animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>

      {/* 状态文字 */}
      <p className="text-xs text-hermes-muted/60 tabular-nums">{status}{status.endsWith("...") ? "" : dots}</p>
    </div>
  );
}
