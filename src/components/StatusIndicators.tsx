// 顯示 FPS 與伺服器訊號的小徽章
import { useEffect, useRef, useState } from "react";
import { Activity, Wifi, WifiOff, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { onServerHealth } from "@/lib/serverHealth";

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
        await fetch("https://text.pollinations.ai/?ping=" + Date.now(), {
          method: "GET",
          mode: "no-cors",
          cache: "no-store",
        });
        if (!killed) setPing(Math.round(performance.now() - start));
      } catch {
        if (!killed) setPing(null);
      }
    };
    measure();
    const i = setInterval(measure, 8000);
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

// 伺服器運作圖：股票折線圖風格，往上=綠 中間=橘 往下=紅
export function ServerHealthChart() {
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 40 }, () => 70 + Math.random() * 10)
  );
  const valueRef = useRef(80);

  useEffect(() => {
    const off = onServerHealth((k) => {
      if (k === "fail") valueRef.current = Math.max(5, valueRef.current - 35);
      else valueRef.current = Math.min(100, valueRef.current + 10);
    });
    return () => { off(); };
  }, []);

  useEffect(() => {
    const tick = setInterval(async () => {
      // 量測 ping 推估健康度
      let healthDelta = 0;
      if (!navigator.onLine) {
        healthDelta = -15;
      } else {
        const t = performance.now();
        try {
          await fetch("https://text.pollinations.ai/?ping=" + Date.now(), {
            method: "GET", mode: "no-cors", cache: "no-store",
          });
          const ms = performance.now() - t;
          healthDelta = ms < 300 ? 4 : ms < 800 ? 1 : -3;
        } catch {
          healthDelta = -10;
        }
      }
      valueRef.current = Math.max(5, Math.min(100, valueRef.current + healthDelta + (Math.random() * 4 - 2)));
      setPoints((p) => [...p.slice(-39), valueRef.current]);
    }, 1500);
    return () => clearInterval(tick);
  }, []);

  const w = 200, h = 44;
  const min = Math.min(...points), max = Math.max(...points);
  const range = Math.max(1, max - min);
  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = points[points.length - 1];
  const prev = points[points.length - 2] ?? last;
  const trend = last - prev;
  const color = last > 65 ? "hsl(142 70% 45%)" : last > 35 ? "hsl(35 90% 55%)" : "hsl(0 75% 55%)";
  const textColor = last > 65 ? "text-emerald-500" : last > 35 ? "text-amber-500" : "text-destructive";

  return (
    <div className="rounded-lg border bg-card px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>伺服器運作</span>
        <span className={cn("inline-flex items-center gap-0.5 font-medium", textColor)}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.round(last)}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
        <defs>
          <linearGradient id="shc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#shc)" />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}
