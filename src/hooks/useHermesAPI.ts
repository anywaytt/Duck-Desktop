import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/hermes-api";

export function useHermesStatus(pollInterval = 10000) {
  const [status, setStatus] = useState<api.StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getStatus();
      setStatus(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "连接 Hermes 失败");
    }
  }, []);

  useEffect(() => {
    refresh();
    // 启动后前 30 秒每 2 秒快速轮询（Hermes 可能还在启动中）
    const fastId = setInterval(refresh, 2000);
    const stopFast = setTimeout(() => clearInterval(fastId), 30000);
    // 正常轮询
    const slowId = setInterval(refresh, pollInterval);
    return () => {
      clearInterval(fastId);
      clearInterval(slowId);
      clearTimeout(stopFast);
    };
  }, [refresh, pollInterval]);

  return { status, error, refresh };
}

export function useModelInfo() {
  const [info, setInfo] = useState<api.ModelInfo | null>(null);
  const [options, setOptions] = useState<api.ModelOptionsResponse | null>(null);
  const [aux, setAux] = useState<api.AuxiliaryModelsResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [i, o, a] = await Promise.all([
        api.getModelInfo(),
        api.getModelOptions(),
        api.getAuxiliaryModels(),
      ]);
      setInfo(i);
      setOptions(o);
      setAux(a);
    } catch {
      // Hermes not available
    }
  }, []);

  const switchModel = useCallback(async (provider: string, model: string) => {
    await api.setModelAssignment({ scope: "main", provider, model });
    await refresh();
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  return { info, options, aux, refresh, switchModel };
}

export function useAnalytics(days = 7) {
  const [data, setData] = useState<api.AnalyticsResponse | null>(null);
  const [modelData, setModelData] = useState<api.ModelsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        api.getAnalytics(days),
        api.getModelsAnalytics(days),
      ]);
      setData(a);
      setModelData(m);
    } catch {
      // not available
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, modelData, loading, refresh };
}

export function useSessions(limit = 5) {
  const [sessions, setSessions] = useState<api.SessionInfo[]>([]);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getSessions(limit);
      setSessions(data.sessions);
      setTotal(data.total);
    } catch {
      // not available
    }
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { sessions, total, refresh };
}
