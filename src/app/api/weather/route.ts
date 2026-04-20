import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PeriodData {
  realFeelF: number;
  actualTempF: number;
  windMph: number;
  precipChance: number;
  uvIndex: number;
}

interface WeatherResponse {
  location: string;
  morning: PeriodData;
  afternoon: PeriodData;
  evening: PeriodData;
  tomorrowMorning: PeriodData;
  tomorrowAfternoon: PeriodData;
  tomorrowEvening: PeriodData;
  fetchedAt: string;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map<string, { data: WeatherResponse; ts: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ─── US state abbreviations ───────────────────────────────────────────────────
const US_STATES: Record<string, string> = {
  AL: "Alabama",       AK: "Alaska",        AZ: "Arizona",       AR: "Arkansas",
  CA: "California",    CO: "Colorado",      CT: "Connecticut",   DE: "Delaware",
  FL: "Florida",       GA: "Georgia",       HI: "Hawaii",        ID: "Idaho",
  IL: "Illinois",      IN: "Indiana",       IA: "Iowa",          KS: "Kansas",
  KY: "Kentucky",      LA: "Louisiana",     ME: "Maine",         MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan",      MN: "Minnesota",     MS: "Mississippi",
  MO: "Missouri",      MT: "Montana",       NE: "Nebraska",      NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey",    NM: "New Mexico",    NY: "New York",
  NC: "North Carolina",ND: "North Dakota",  OH: "Ohio",          OK: "Oklahoma",
  OR: "Oregon",        PA: "Pennsylvania",  RI: "Rhode Island",  SC: "South Carolina",
  SD: "South Dakota",  TN: "Tennessee",     TX: "Texas",         UT: "Utah",
  VT: "Vermont",       VA: "Virginia",      WA: "Washington",    WV: "West Virginia",
  WI: "Wisconsin",     WY: "Wyoming",       DC: "District of Columbia",
};

// Aliases where user input won't match the API's English country name.
// Most countries are handled by countryUp === hint (e.g. "Italy", "Spain", "Japan").
// Only add entries here for genuinely non-obvious mappings.
const COUNTRY_ALIASES: Record<string, string> = {
  // UK — admin1 returns the nation name, not "United Kingdom"
  "UK": "GB", "ENGLAND": "GB", "GREAT BRITAIN": "GB", "BRITAIN": "GB",
  "UNITED KINGDOM": "GB", "SCOTLAND": "GB", "WALES": "GB", "NORTHERN IRELAND": "GB",
  // US shortcuts
  "USA": "US", "UNITED STATES": "US", "AMERICA": "US", "UNITED STATES OF AMERICA": "US",
  // Countries whose common name differs from API's official English name
  "HOLLAND": "NL", "THE NETHERLANDS": "NL",
  "UAE": "AE", "EMIRATES": "AE", "UNITED ARAB EMIRATES": "AE",
  "SOUTH KOREA": "KR", "KOREA": "KR",
  "NORTH KOREA": "KP",
  "CZECH REPUBLIC": "CZ", "CZECHIA": "CZ",
  "RUSSIA": "RU", "RUSSIAN FEDERATION": "RU",
  "IRAN": "IR", "PERSIA": "IR",
  "TURKEY": "TR", "TÜRKIYE": "TR",
  "BURMA": "MM", "MYANMAR": "MM",
  "IVORY COAST": "CI", "COTE D'IVOIRE": "CI", "CÔTE D'IVOIRE": "CI",
  "TAIWAN": "TW", "REPUBLIC OF CHINA": "TW",
  "HONG KONG": "HK",
  "MACAU": "MO", "MACAO": "MO",
  "NORTH MACEDONIA": "MK", "MACEDONIA": "MK",
  "MOLDOVA": "MD",
  "DRC": "CD", "DEMOCRATIC REPUBLIC OF CONGO": "CD", "CONGO-KINSHASA": "CD",
  "REPUBLIC OF CONGO": "CG", "CONGO-BRAZZAVILLE": "CG",
  "EAST TIMOR": "TL", "TIMOR-LESTE": "TL",
  "SOUTH SUDAN": "SS",
  "ESWATINI": "SZ", "SWAZILAND": "SZ",
  "CABO VERDE": "CV", "CAPE VERDE": "CV",
  "SAO TOME AND PRINCIPE": "ST", "SÃO TOMÉ AND PRÍNCIPE": "ST",
  "LAOS": "LA",
  "VIETNAM": "VN", "VIET NAM": "VN",
  "SYRIA": "SY",
  "BOLIVIA": "BO", "PLURINATIONAL STATE OF BOLIVIA": "BO",
  "VENEZUELA": "VE",
  "SOUTH AFRICA": "ZA",
  "NEW ZEALAND": "NZ",
  "SAUDI ARABIA": "SA",
};

// ─── Geocoding via Open-Meteo ─────────────────────────────────────────────────
type GeoResult = {
  latitude: number; longitude: number; name: string;
  admin1?: string; admin2?: string; country?: string; country_code: string;
};

function fmtName(r: GeoResult): string {
  return [r.name, r.admin1, r.country_code].filter(Boolean).join(", ");
}

function scoreHint(r: GeoResult, hint: string): number {
  let score = 0;
  const admin1Up  = (r.admin1  ?? "").toUpperCase();
  const admin2Up  = (r.admin2  ?? "").toUpperCase();
  const countryUp = (r.country ?? "").toUpperCase();
  const cc        = r.country_code.toUpperCase();

  // Exact ISO country code (e.g. hint="GB", "IT", "JP")
  if (cc === hint) score += 10;

  // Alias lookup (UK→GB, Holland→NL, etc.)
  const aliasCC = COUNTRY_ALIASES[hint];
  if (aliasCC && cc === aliasCC) score += 10;

  // Full English country name (e.g. "ITALY", "SPAIN", "AUSTRALIA", "GERMANY")
  if (countryUp === hint) score += 9;
  // Partial country name for longer hints ("UNITED KINGDOM" contains "KINGDOM")
  if (hint.length > 4 && countryUp.includes(hint)) score += 6;

  // US state abbreviation → full name match (e.g. hint="NH" → "New Hampshire")
  const stateFullName = US_STATES[hint]?.toUpperCase();
  if (stateFullName && admin1Up === stateFullName) score += 10;

  // Admin1 direct match — covers nations within UK, regions, provinces, states
  // (e.g. "England", "Tuscany", "New South Wales", "Ontario", "Bavaria", "Catalonia")
  if (admin1Up === hint) score += 9;
  if (hint.length > 3 && admin1Up.includes(hint)) score += 6;
  if (hint.length > 3 && hint.includes(admin1Up) && admin1Up.length > 3) score += 5;

  // Admin2 match (county / district level)
  if (admin2Up === hint) score += 7;
  if (hint.length > 3 && admin2Up.includes(hint)) score += 4;

  return score;
}

async function searchCity(cityName: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Geocoding service unavailable");
  const data = await res.json() as { results?: GeoResult[] };
  return data.results ?? [];
}

function pickBest(results: GeoResult[], hint: string): GeoResult | null {
  if (!results.length) return null;
  if (!hint) return results[0];
  const scored = results
    .map(r => ({ r, score: scoreHint(r, hint) }))
    .sort((a, b) => b.score - a.score);
  // Use scored result only if something actually matched; otherwise fall back to most prominent
  return scored[0].score > 0 ? scored[0].r : results[0];
}

async function geocode(query: string): Promise<{ lat: number; lon: number; name: string }> {
  const parts    = query.split(",").map(s => s.trim());
  const cityName = parts[0];
  const hint     = parts.slice(1).join(",").trim().toUpperCase();

  let results = await searchCity(cityName);

  // If the full string returned nothing AND no comma was used, try splitting on spaces.
  // Handles "London KY", "Manchester England", "St Petersburg FL", etc.
  if (!results.length && !hint && cityName.includes(" ")) {
    const words = cityName.split(" ");
    // Try last single word as hint (e.g. "FL", "England")
    const city1  = words.slice(0, -1).join(" ");
    const hint1  = words[words.length - 1].toUpperCase();
    const res1   = await searchCity(city1);
    const match1 = pickBest(res1, hint1);
    if (match1) return { lat: match1.latitude, lon: match1.longitude, name: fmtName(match1) };
    // Try last two words as hint (e.g. "New Hampshire", "New York")
    if (words.length > 2) {
      const city2  = words.slice(0, -2).join(" ");
      const hint2  = words.slice(-2).join(" ").toUpperCase();
      const res2   = await searchCity(city2);
      const match2 = pickBest(res2, hint2);
      if (match2) return { lat: match2.latitude, lon: match2.longitude, name: fmtName(match2) };
    }
  }

  if (!results.length) throw new Error(`Location not found: "${query}"`);

  const best = pickBest(results, hint);
  if (!best) throw new Error(`Location not found: "${query}"`);
  return { lat: best.latitude, lon: best.longitude, name: fmtName(best) };
}

// ─── Open-Meteo forecast ──────────────────────────────────────────────────────
async function fetchForecast(lat: number, lon: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude",         lat.toString());
  url.searchParams.set("longitude",        lon.toString());
  url.searchParams.set("hourly",           "apparent_temperature,temperature_2m,precipitation_probability,windspeed_10m,uv_index");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("windspeed_unit",   "mph");
  url.searchParams.set("timezone",         "auto");
  url.searchParams.set("forecast_days",    "2");
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Weather service unavailable");
  return res.json() as Promise<{
    hourly: {
      time: string[];
      apparent_temperature: number[];
      temperature_2m: number[];
      precipitation_probability: number[];
      windspeed_10m: number[];
      uv_index: number[];
    };
  }>;
}

// ─── Aggregate hourly slots ───────────────────────────────────────────────────
function aggregate(hourly: Awaited<ReturnType<typeof fetchForecast>>["hourly"], indices: number[]): PeriodData {
  const valid = indices.filter(i => i < hourly.apparent_temperature.length);
  if (!valid.length) return { realFeelF: 0, actualTempF: 0, windMph: 0, precipChance: 0, uvIndex: 0 };
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return {
    realFeelF:    Math.round(avg(valid.map(i => hourly.apparent_temperature[i] ?? 0))),
    actualTempF:  Math.round(avg(valid.map(i => hourly.temperature_2m[i] ?? 0))),
    windMph:      Math.round(avg(valid.map(i => hourly.windspeed_10m[i] ?? 0))),
    precipChance: Math.round(Math.max(...valid.map(i => hourly.precipitation_probability[i] ?? 0))),
    uvIndex:      Math.round(Math.max(...valid.map(i => hourly.uv_index[i] ?? 0))),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const location = (req.nextUrl.searchParams.get("location") ?? "Boston").trim();
  const cacheKey = location.toLowerCase();

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json(hit.data);
  }

  try {
    const geo      = await geocode(location);
    const forecast = await fetchForecast(geo.lat, geo.lon);
    const h        = forecast.hourly;

    // Today: hours 0–23. Tomorrow: hours 24–47.
    const morning           = aggregate(h, [6, 7, 8, 9, 10]);
    const afternoon         = aggregate(h, [11, 12, 13, 14, 15, 16]);
    const evening           = aggregate(h, [17, 18, 19, 20, 21]);
    const tomorrowMorning   = aggregate(h, [30, 31, 32, 33, 34]);
    const tomorrowAfternoon = aggregate(h, [35, 36, 37, 38, 39, 40]);
    const tomorrowEvening   = aggregate(h, [41, 42, 43, 44, 45]);

    const result: WeatherResponse = {
      location: geo.name,
      morning,
      afternoon,
      evening,
      tomorrowMorning,
      tomorrowAfternoon,
      tomorrowEvening,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
