"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { MapPin, Wind, Umbrella, Layers, CloudRain, ArrowLeft, Sun, Search, Loader2, AlertTriangle } from "lucide-react";

const DolphinLogo = () => (
  <span className="inline-block grayscale opacity-80 select-none text-2xl" style={{ lineHeight: 1 }}>🐋</span>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface PeriodData {
  realFeelF: number; actualTempF: number;
  windMph: number; precipChance: number; uvIndex: number;
}
interface WeatherData {
  location: string;
  morning: PeriodData; afternoon: PeriodData; evening: PeriodData;
  tomorrowMorning: PeriodData; tomorrowAfternoon: PeriodData; tomorrowEvening: PeriodData;
  fetchedAt?: string;
}

// ─── Boston fallback (shown before first fetch) ───────────────────────────────
const FALLBACK: WeatherData = {
  location: "Boston, MA",
  morning:           { realFeelF: 32, actualTempF: 40, windMph: 15, precipChance: 20, uvIndex: 2 },
  afternoon:         { realFeelF: 38, actualTempF: 45, windMph: 20, precipChance: 45, uvIndex: 4 },
  evening:           { realFeelF: 28, actualTempF: 36, windMph: 25, precipChance: 60, uvIndex: 0 },
  tomorrowMorning:   { realFeelF: 30, actualTempF: 38, windMph: 12, precipChance: 25, uvIndex: 1 },
  tomorrowAfternoon: { realFeelF: 35, actualTempF: 43, windMph: 16, precipChance: 35, uvIndex: 3 },
  tomorrowEvening:   { realFeelF: 28, actualTempF: 35, windMph: 14, precipChance: 20, uvIndex: 0 },
};

// ─── Color gradient: -40°C black → 0°C deep blue → 20°C green → 40°C red ─────
const COLOR_STOPS: Array<[number, [number, number, number]]> = [
  [-40, [15,  23,  42]],
  [-20, [30,  27,  75]],
  [  0, [29,  78, 216]],
  [ 10, [8,  145, 178]],
  [ 20, [22, 163,  74]],
  [ 30, [202, 138,   4]],
  [ 40, [220,  38,  38]],
];
function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }
function tempColor(f: number): string {
  const c = (f - 32) * 5 / 9;
  if (c <= COLOR_STOPS[0][0]) { const [r,g,b] = COLOR_STOPS[0][1]; return `rgb(${r},${g},${b})`; }
  if (c >= COLOR_STOPS[COLOR_STOPS.length-1][0]) { const [r,g,b] = COLOR_STOPS[COLOR_STOPS.length-1][1]; return `rgb(${r},${g},${b})`; }
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [c1, rgb1] = COLOR_STOPS[i], [c2, rgb2] = COLOR_STOPS[i + 1];
    if (c >= c1 && c <= c2) {
      const t = (c - c1) / (c2 - c1);
      return `rgb(${lerp(rgb1[0],rgb2[0],t)},${lerp(rgb1[1],rgb2[1],t)},${lerp(rgb1[2],rgb2[2],t)})`;
    }
  }
  return "#64748b";
}
function tempLabel(f: number): string {
  const c = (f - 32) * 5 / 9;
  if (c < -20) return "Extreme Cold";
  if (c <   0) return "Biting Cold";
  if (c <  10) return "Cold";
  if (c <  20) return "Mild";
  if (c <  30) return "Warm";
  return "Hot";
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const toC = (f: number) => Math.round((f - 32) * 5 / 9);
function fmt(f: number, celsius: boolean) { return celsius ? `${toC(f)}°` : `${f}°`; }

// ─── Gear icons ───────────────────────────────────────────────────────────────
type GearItem = { icon: React.ReactNode; label: string };
function getGear(realFeelF: number, windMph: number, precipChance: number, uvIndex: number): GearItem[] {
  const g: GearItem[] = [];
  if (realFeelF < 35)          g.push({ icon: <Layers    className="w-3 h-3" />, label: "Heavy coat"  });
  else if (realFeelF < 55)     g.push({ icon: <Layers    className="w-3 h-3" />, label: "Jacket"      });
  if (windMph > 15)            g.push({ icon: <Wind      className="w-3 h-3" />, label: "Wind shell"  });
  if (precipChance >= 40)      g.push({ icon: <Umbrella  className="w-3 h-3" />, label: "Umbrella"    });
  else if (precipChance >= 20) g.push({ icon: <CloudRain className="w-3 h-3" />, label: "Watch rain"  });
  if (uvIndex >= 6)            g.push({ icon: <Sun       className="w-3 h-3" />, label: "Sunscreen"   });
  return g;
}

// ─── Shared weather grid (Today = 3 cols, Tomorrow = 2 cols) ─────────────────
function WeatherGrid({ periods, labels, isCelsius }: {
  periods: PeriodData[];
  labels: string[];
  isCelsius: boolean;
}) {
  const unit = isCelsius ? "°C" : "°F";
  const gridCols = periods.length === 3
    ? "grid-cols-[64px_1fr_1fr_1fr]"
    : "grid-cols-[64px_1fr_1fr]";

  return (
    <div className={`grid ${gridCols} px-2 pb-4`}>

      {/* Header row */}
      <div />
      {labels.map(l => (
        <div key={l} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-4 pb-2">{l}</div>
      ))}

      {/* Feels like row */}
      <div className="flex items-start pt-3 pl-4">
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 leading-snug">
          Feels<br />like<br /><span className="text-slate-300">{unit}</span>
        </span>
      </div>
      {periods.map((p, i) => (
        <div key={i} className="flex flex-col items-center pt-2 pb-1">
          <div className="text-3xl font-extrabold leading-none" style={{ color: tempColor(p.realFeelF) }}>
            {fmt(p.realFeelF, isCelsius)}
          </div>
          <div className="text-[9px] font-bold mt-1 uppercase tracking-wide" style={{ color: tempColor(p.realFeelF) }}>
            {tempLabel(p.realFeelF)}
          </div>
        </div>
      ))}

      {/* Actual row */}
      <div className="flex items-start pt-3 pl-4">
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 leading-snug">
          Actual<br /><span className="text-slate-300">{unit}</span>
        </span>
      </div>
      {periods.map((p, i) => (
        <div key={i} className="flex items-center justify-center pt-3 pb-1">
          <div className="text-base font-semibold text-slate-400">{fmt(p.actualTempF, isCelsius)}</div>
        </div>
      ))}

      {/* Divider */}
      <div style={{ gridColumn: "1 / -1" }} className="border-t border-slate-100 mx-3 my-2" />

      {/* Gear row */}
      <div />
      {periods.map((p, i) => {
        const gear = getGear(p.realFeelF, p.windMph, p.precipChance, p.uvIndex);
        return (
          <div key={i} className="flex flex-col gap-1 items-center pb-2">
            {gear.map((item, j) => (
              <div key={j} className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-semibold">
                <span style={{ color: tempColor(p.realFeelF) }}>{item.icon}</span>{item.label}
              </div>
            ))}
            {gear.length === 0 && <div className="text-[10px] text-slate-300 italic">Clear</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TrueSensationPage() {
  const [isCelsius, setIsCelsius] = useState(false);
  const [query,     setQuery]     = useState("Boston, MA");
  const [data,      setData]      = useState<WeatherData>(FALLBACK);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchWeather = useCallback(async (location: string) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
      const json = await res.json() as WeatherData & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to fetch weather");
      setData(json);
      setQuery(json.location);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWeather("Boston, MA"); }, [fetchWeather]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) void fetchWeather(query.trim());
  };

  const tomorrowAlert =
    data.tomorrowAfternoon.precipChance > 30 || data.tomorrowAfternoon.windMph > 15 ||
    data.tomorrowEvening.precipChance > 30   || data.tomorrowEvening.windMph > 15;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
              <DolphinLogo /> Tonina.me
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/concept-explorer" className="text-pink-600 font-bold transition-colors">Concept Explorer</Link>
              <Link href="/wealth" className="hover:text-slate-900 transition-colors">Tonina Wealth</Link>
              <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-xl mx-auto w-full px-6 py-10 space-y-4">

        {/* Header + search */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <Link href="/concept-explorer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-pink-600 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Concept Explorer
            </Link>
            <form onSubmit={handleSearch} className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pink-600 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="City, country..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-pink-400 placeholder:text-slate-300 placeholder:font-normal"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-8 h-8 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </form>
            {error && <p className="text-[11px] text-rose-500 font-medium mt-1 pl-2">{error}</p>}
          </div>
          <button
            onClick={() => setIsCelsius(v => !v)}
            className="text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-1.5 rounded-full transition-colors shadow-sm shrink-0 mt-5"
          >
            {isCelsius ? "°F" : "°C"}
          </button>
        </div>

        {/* Today box */}
        <div className={`bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
          <div className="pt-5 px-5 pb-0 flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Today</div>
            {data.fetchedAt && (
              <div className="text-[9px] text-slate-300">
                updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          <WeatherGrid
            periods={[data.morning, data.afternoon, data.evening]}
            labels={["Morning", "Afternoon", "Evening"]}
            isCelsius={isCelsius}
          />
        </div>

        {/* Tomorrow box */}
        <div className={`bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
          <div className="pt-5 px-5 pb-0 flex items-center gap-2">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Tomorrow</div>
            {tomorrowAlert && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 uppercase tracking-wide">
                <AlertTriangle className="w-2.5 h-2.5" /> Heads up
              </div>
            )}
          </div>
          <WeatherGrid
            periods={[data.tomorrowMorning, data.tomorrowAfternoon, data.tomorrowEvening]}
            labels={["Morning", "Afternoon", "Evening"]}
            isCelsius={isCelsius}
          />
        </div>

      </div>

      <footer className="border-t border-slate-100 bg-white py-8 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-medium text-slate-500">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Tonina.me</p>
        </div>
      </footer>
    </main>
  );
}
