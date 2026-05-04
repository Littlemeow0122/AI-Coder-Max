// 顯示 FPS 與伺服器訊號的小徽章
import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function FpsBadge() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color =
    fps >= 50 ? "text-emerald-500" : fps >= 30 ? "text-amber-500" : "text-destructive";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
      title="畫面更新率"
    >
      <Activity className={cn("h-3 w-3", color)} /> {fps} FPS
    </span>
  );
}

export function ServerSignalBadge() {
  const [ping, setPing] = useState<number | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);
  useEffect(() => {
    let killed = false;
    const measure = async () => {
      if (!navigator.onLine) {
        setPing(null);
        return;
      }
      const start = performance.now();
      try {
        await fetch("https://text.pollinations.ai/openai", {
          method: "OPTIONS",
          mode: "no-cors",
          cache: "no-store",
        });
        if (!killed) setPing(Math.round(performance.now() - start));
      } catch {
        if (!killed) setPing(null);
      }
    };
    measure();
    const i = setInterval(measure, 10000);
    return () => {
      killed = true;
      clearInterval(i);
    };
  }, []);

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-destructive">
        <WifiOff className="h-3 w-3" /> 離線
      </span>
    );
  }
  const bars = ping == null ? 0 : ping < 200 ? 3 : ping < 600 ? 2 : 1;
  const color =
    bars === 3 ? "text-emerald-500" : bars === 2 ? "text-amber-500" : "text-destructive";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
      title={ping == null ? "伺服器訊號" : `延遲 ${ping}ms`}
    >
      <Wifi className={cn("h-3 w-3", color)} />
      {ping == null ? "—" : `${ping}ms`}
    </span>
  );
}
