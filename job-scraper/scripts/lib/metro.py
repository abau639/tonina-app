"""Turn a center city + radius into the list of nearby cities to search.

`--locations` on the scraper is a fuzzy list of place strings. The user thinks
in "within 50 miles of Miami"; the scrapers think in "Miami FL, Hialeah FL,
Fort Lauderdale FL, ...". This module bridges the two with a haversine distance
over an embedded coordinate table (works fully offline), and optionally the free
Open-Meteo geocoder to resolve a center city the table doesn't know.

The embedded table is dense for South Florida (the primary target) and carries a
handful of other US metros so the tool is reusable. Coordinates are approximate
city centroids — plenty accurate for a 50-mile radius filter.
"""

from __future__ import annotations

import math
import os
from typing import Iterable

# City centroid table: "City, ST" -> (lat, lon). Approximate, degrees.
CITY_COORDS: dict[str, tuple[float, float]] = {
    # --- South Florida (dense) ---
    "Miami, FL": (25.7617, -80.1918),
    "Miami Beach, FL": (25.7907, -80.1300),
    "Coral Gables, FL": (25.7215, -80.2684),
    "Hialeah, FL": (25.8576, -80.2781),
    "Doral, FL": (25.8195, -80.3553),
    "Kendall, FL": (25.6793, -80.3173),
    "Homestead, FL": (25.4687, -80.4776),
    "Aventura, FL": (25.9565, -80.1426),
    "North Miami, FL": (25.8901, -80.1867),
    "North Miami Beach, FL": (25.9331, -80.1625),
    "Miami Gardens, FL": (25.9420, -80.2456),
    "Cutler Bay, FL": (25.5808, -80.3468),
    "Pinecrest, FL": (25.6690, -80.3084),
    "Key Biscayne, FL": (25.6937, -80.1626),
    "Hollywood, FL": (26.0112, -80.1495),
    "Fort Lauderdale, FL": (26.1224, -80.1373),
    "Sunrise, FL": (26.1669, -80.2564),
    "Plantation, FL": (26.1276, -80.2331),
    "Pembroke Pines, FL": (26.0078, -80.2963),
    "Miramar, FL": (25.9860, -80.3035),
    "Davie, FL": (26.0765, -80.2521),
    "Weston, FL": (26.1004, -80.3998),
    "Pompano Beach, FL": (26.2379, -80.1248),
    "Coral Springs, FL": (26.2712, -80.2706),
    "Deerfield Beach, FL": (26.3184, -80.0998),
    "Coconut Creek, FL": (26.2517, -80.1789),
    "Boca Raton, FL": (26.3683, -80.1289),
    "Delray Beach, FL": (26.4615, -80.0728),
    "Boynton Beach, FL": (26.5253, -80.0664),
    "West Palm Beach, FL": (26.7153, -80.0534),
    # --- Other US metros (sparse; for reuse of the tool) ---
    "New York, NY": (40.7128, -74.0060),
    "Jersey City, NJ": (40.7178, -74.0431),
    "Newark, NJ": (40.7357, -74.1724),
    "Stamford, CT": (41.0534, -73.5387),
    "San Francisco, CA": (37.7749, -122.4194),
    "Oakland, CA": (37.8044, -122.2712),
    "Palo Alto, CA": (37.4419, -122.1430),
    "San Jose, CA": (37.3382, -121.8863),
    "Boston, MA": (42.3601, -71.0589),
    "Cambridge, MA": (42.3736, -71.1097),
    "Providence, RI": (41.8240, -71.4128),
    "Hanover, NH": (43.7022, -72.2896),
    "Lebanon, NH": (43.6423, -72.2518),
}

EARTH_RADIUS_MILES = 3958.7613


def haversine_miles(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(h))


def _norm(s: str) -> str:
    return " ".join(s.lower().replace(",", " ").split())


def resolve_center(city: str) -> tuple[float, float] | None:
    """Look up a center city's coordinates: embedded table first, then geocoder."""
    target = _norm(city)
    for name, coord in CITY_COORDS.items():
        if _norm(name) == target:
            return coord
    # Loose match: "miami" matches "Miami, FL".
    for name, coord in CITY_COORDS.items():
        if _norm(name).startswith(target) or target in _norm(name):
            return coord
    return _geocode_open_meteo(city)


def _geocode_open_meteo(city: str) -> tuple[float, float] | None:
    """Free, no-key geocoder. Only reachable when the environment allows egress
    to open-meteo.com — in a locked-down sandbox this returns None and callers
    fall back to the embedded table."""
    try:
        import httpx
    except Exception:
        return None
    try:
        params = {"name": city, "count": 1, "language": "en", "format": "json"}
        r = httpx.get("https://geocoding-api.open-meteo.com/v1/search", params=params, timeout=15)
        if r.status_code != 200:
            return None
        results = (r.json() or {}).get("results") or []
        if not results:
            return None
        return float(results[0]["latitude"]), float(results[0]["longitude"])
    except Exception:
        return None


def cities_within_radius(
    center_city: str, radius_miles: float = 50.0
) -> list[tuple[str, float]]:
    """Return [(‘City, ST’, distance_miles), ...] within radius, nearest first.

    Only cities present in CITY_COORDS are considered as *candidates* (that's the
    metro we can enumerate offline). The center itself is always included first.
    """
    center = resolve_center(center_city)
    if center is None:
        raise ValueError(
            f"Could not resolve center city {center_city!r}. Add it to CITY_COORDS "
            f"in scripts/lib/metro.py, or run where the Open-Meteo geocoder is reachable."
        )
    out: list[tuple[str, float]] = []
    for name, coord in CITY_COORDS.items():
        d = haversine_miles(center, coord)
        if d <= radius_miles:
            out.append((name, round(d, 1)))
    out.sort(key=lambda t: t[1])
    return out


def location_filters(center_city: str, radius_miles: float = 50.0, include_remote: bool = True) -> list[str]:
    """The `--locations` list to pass to the scraper for this radius."""
    locs = [name for name, _ in cities_within_radius(center_city, radius_miles)]
    if include_remote:
        locs.append("Remote")
    return locs


def nearest_known_city(location_text: str) -> tuple[str, float] | None:
    """Best-effort: map a scraped free-text location to the nearest table city and
    its distance. Used to annotate jobs with distance_miles. Returns None if the
    location can't be matched to any known city token."""
    if not location_text:
        return None
    norm = _norm(location_text)
    tokens = set(norm.split())
    best: tuple[str, float] | None = None
    for name in CITY_COORDS:
        city_tokens = set(_norm(name.split(",")[0]).split())
        if city_tokens & tokens:
            # exact-ish city name hit; distance from center is 0 to itself, but we
            # only need which city it is — distance to center handled by caller.
            return name, 0.0
    return best


if __name__ == "__main__":
    import argparse
    import json

    ap = argparse.ArgumentParser(description="Expand a center city + radius into a location list.")
    ap.add_argument("--center", required=True, help='Center city, e.g. "Miami, FL"')
    ap.add_argument("--radius", type=float, default=50.0, help="Radius in miles (default 50)")
    ap.add_argument("--no-remote", action="store_true", help="Do not append 'Remote' to the list")
    ap.add_argument("--json", action="store_true", help="Emit JSON with distances")
    args = ap.parse_args()

    pairs = cities_within_radius(args.center, args.radius)
    if args.json:
        print(json.dumps(
            {"center": args.center, "radius_miles": args.radius,
             "cities": [{"city": c, "distance_miles": d} for c, d in pairs],
             "locations": location_filters(args.center, args.radius, not args.no_remote)},
            indent=2,
        ))
    else:
        print(f"{len(pairs)} cities within {args.radius:g} mi of {args.center}:")
        for c, d in pairs:
            print(f"  {d:5.1f} mi  {c}")
        locs = location_filters(args.center, args.radius, not args.no_remote)
        print("\n--locations value:")
        print("  " + ",".join(locs))
