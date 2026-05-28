import { useState, useEffect, useCallback } from "react";

export interface SystemStats {
  cpu: number;
  memoryTotal: number; // MB
  memoryUsed: number;
  memoryPercent: number;
  diskTotal: number; // GB
  diskUsed: number;
  diskFree: number;
  diskPercent: number;
  networkUp: number; // KB/s
  networkDown: number;
  timestamp: number;
}

interface ElectronAPI {
  getSystemStats: () => Promise<SystemStats>;
  getPlatform: () => Promise<string>;
  getHostname: () => Promise<string>;
  getCpuInfo: () => Promise<{ model: string; cores: number; arch: string }>;
  runHermesCmd?: (args: string[]) => Promise<{ ok: boolean; exitCode: number; stdout: string; stderr: string }>;
  fetchLatestVersion?: () => Promise<{ ok: boolean; version?: string; url?: string; notes?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const EMPTY_STATS: SystemStats = {
  cpu: 0, memoryTotal: 0, memoryUsed: 0, memoryPercent: 0,
  diskTotal: 0, diskUsed: 0, diskFree: 0, diskPercent: 0,
  networkUp: 0, networkDown: 0, timestamp: 0,
};

// Browser-based system stats (fallback when not in Electron)
async function getBrowserStats(): Promise<SystemStats> {
  // Use performance API for memory (Chrome only)
  const perf = performance as any;
  const mem = perf?.memory;
  return {
    cpu: 0,
    memoryTotal: mem ? Math.round(mem.jsHeapSizeLimit / (1024 * 1024)) : 0,
    memoryUsed: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : 0,
    memoryPercent: mem ? Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) : 0,
    diskTotal: 0, diskUsed: 0, diskFree: 0, diskPercent: 0,
    networkUp: 0, networkDown: 0,
    timestamp: Date.now(),
  };
}

export function useSystemStats(interval = 2000) {
  const [stats, setStats] = useState<SystemStats>(EMPTY_STATS);
  const [history, setHistory] = useState<SystemStats[]>([]);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  const fetchStats = useCallback(async () => {
    try {
      const data = isElectron
        ? await window.electronAPI!.getSystemStats()
        : await getBrowserStats();
      setStats(data);
      setHistory((prev) => {
        const next = [...prev, data];
        return next.length > 60 ? next.slice(-60) : next; // keep last 60 data points
      });
    } catch {
      // ignore errors
    }
  }, [isElectron]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, interval);
    return () => clearInterval(id);
  }, [fetchStats, interval]);

  return { stats, history, isElectron };
}

export function useSystemInfo() {
  const [info, setInfo] = useState({ platform: "", hostname: "", cpuModel: "", cores: 0, arch: "" });
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;
    (async () => {
      const [platform, hostname, cpuInfo] = await Promise.all([
        window.electronAPI!.getPlatform(),
        window.electronAPI!.getHostname(),
        window.electronAPI!.getCpuInfo(),
      ]);
      setInfo({ platform, hostname, ...cpuInfo });
    })();
  }, [isElectron]);

  return info;
}
