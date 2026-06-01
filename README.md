# meteoronweather
Weather Intelligence
# Meteoron — Project Brief

## What this is

Meteoron is a mission planning weather intelligence tool for people operating in serious environments — sailors, hikers, climbers, pilots, paragliders. It is not a consumer weather app. The product is text-first, data-efficient, and scientifically grounded.

Single HTML file, hosted on GitHub Pages. Currently ~3,100 lines. A modular rewrite is planned when the feature set stabilises.

---

## Design system

- **Primary colour:** International Klein Blue (#002FA7)
- **Logotype:** Archivo Black — METEORON / Weather Intelligence
- **UI font:** Inter
- **Data font:** IBM Plex Mono
- **Editorial font:** Source Serif 4
- **UI icons:** Material Symbols Rounded
- **Weather icons:** Erik Flowers weather icon pack — all weather and moon phase icons must come from this pack. Do not use Unicode emoji or other icon sources for weather-related iconography.
- **Token system:** M3-inspired, light and dark themes via `[data-theme]` attribute
- **Layout:** Responsive, mobile-first

---

## Tech stack

- Single HTML file — HTML, CSS, JS, no build step
- MapLibre GL JS with OpenFreeMap tiles (Positron / Dark)
- Weather data: Open-Meteo (forecast + marine + elevation)
- OWM tiles via Cloudflare Worker proxy (key not in source)
- Wind particle animation: canvas-based, U/V components from Open-Meteo
- SessionStorage cache, 10-minute TTL per location
- localStorage for user preferences (versioned) and pressure trend readings
- Units: °C/°F, kt/km/h/m/s/mph (defaults to knots), km/mi

---

## State object

```javascript
const S = {
  tempUnit, windUnit, distUnit, theme,
  lat, lon, city,
  data, marineData,
  elevation, isLand, context,         // context: 'marine'|'alpine'|'fire'|'general' — backward compat
  profile, subProfile, aviationManual, // two-tier profile system (see below)
  map, owmLayer, velocityLayer,
  mapInitialised, activeLayerName,
  mbMarker, mbPopup,
};
```

---

## Profile system (implemented)

Two-tier detection: `S.profile` + `S.subProfile`. `S.context` is derived from these for backward compatibility with bottom sheet, fire card, and marine data logic.

**Detection priority:**
1. `S.aviationManual === true` → Aviation (cannot auto-detect)
2. `!S.isLand` or elevation < 10m at low latitude → Marine
3. Elevation ≥ 2000m → Overland / Alpine
4. Fire conditions met dynamically in `renderWeather` → Overland / Fire
5. Elevation ≥ 500m → Overland / Highland
6. Default → Overland / Lowland

**Sub-profile reference table:**

| Profile | Sub-profile | Trigger |
|---|---|---|
| Marine | Inshore | < 3 nm from coast |
| Marine | Coastal | 3–12 nm (current default — coastal distance TBD) |
| Marine | Offshore | > 12 nm from coast |
| Overland | Lowland | Elevation < 500m |
| Overland | Highland | Elevation 500–2000m |
| Overland | Alpine | Elevation ≥ 2000m |
| Overland | Fire | Temp > 28°C + RH < 30% + wind > 20 km/h |
| Aviation | Surface | Elevation < 500m |
| Aviation | Low Level | 500–3000m (default) |
| Aviation | High Level | > 3000m |

Fire and Alpine can co-exist — fire takes visual priority in the badge.

**Badge display:** `"Marine · Coastal"`, `"Overland · Alpine"`, `"Fire Watch"`, `"Aviation · Low Level"` etc. CSS classes: `marine`, `alpine`, `fire`, `aviation` (IKB-derived purple).

**Profile selector** in settings drawer — hidden until first location load, then revealed. Aviation toggle shows flight level sub-selector.

---

## Current conditions card (implemented)

Stats row — four cells, profile-aware:

| Cell | Content | Notes |
|---|---|---|
| Pressure | Trend: ↑ Rising / ↓ Falling / → Steady + rate in hPa/hr | Degrades to absolute hPa on cold start. localStorage-backed across sessions. |
| Dew Point | Calculated from temp + RH (Magnus formula) | Fire context shows raw Humidity % instead |
| Sun | `wi-sunrise` + local rise time / `wi-sunset` + local set time | Erik Flowers icons, amber/violet hex colours |
| Moon | `wi-moon-*` Erik Flowers icon + phase name | moonWiClass() + moonPhaseDesc() |

Wind: Beaufort SVG (22px) + bolded Bft number + label + speed + direction.

---

## Satellite message feature (implemented)

Three profiles matching the main profile system:
- **Marine** (was "Sailing") — wind-first format
- **Overland** (was "Alpine") — temp-first format
- **Aviation** — format not yet designed; currently shares general logic. Noted in legend.

Two device formats: Garmin inReach (160 char), SPOT X (100 char).
Adaptive 24H/72H window based on condition triggers.
Message Key legend — collapsible, downloadable as .txt.

---

## What is built and working

- City search with autocomplete, coordinate input, GPS locate
- Current conditions card (profile-aware — see above)
- 24-hour hourly scroll with bottom sheet detail by profile
- 7-day outlook with Beaufort symbols
- UV index and max wind detail cards
- McArthur FFDI fire danger index card
- Marine API integration for ocean/coastal locations
- Map: MapLibre, 5 weather layers, wind particles, click-to-query, layer legend
- Satellite message feature
- Settings drawer: units, theme, profile override
- Accessibility: aria-labels, focus trapping, prefers-reduced-motion, prefers-color-scheme
- Session cache, last-location persistence

---

## What is designed but not yet coded

1. **Map test file** — standalone HTML for iterating map UX without rebuilding the full app
2. **Map improvements** — background init (loads silently when forecast loads), two-step expansion (panel → full screen), responsive bottom sheet (mobile) / side panel (tablet/desktop)
3. **Current conditions card** — sunrise/sunset as markers in hourly scroll (Option B, decision pending vs Option A in-card — currently in-card)
4. **Aviation satellite message format** — visibility, cloud base, wind at altitude, CAPE flag
5. **Multi-point route feature** — satellite message for a route, not just a single point
6. **Modular rewrite** — when feature set is stable

---

## Known issues / technical debt

- Single file — manageable now, modular rewrite planned post-stabilisation
- Wind particle animation is single-point, not a regional grid
- Coastal distance detection is approximate (elevation-based proxy) — Marine sub-profile defaults to Coastal
- Aviation cannot be auto-detected — manual only
- Map layer colours may not fully match OWM tile palette at all zoom levels

---

## Monetisation

Freemium. Not yet implemented — user testing first.

- **Free tier:** Core forecast, all three profiles, map
- **Meteoron Field (Pro):** Satellite message, extended 72H window, route planner, aviation profile, future features
- **Pricing target:** ~$5–8/month or $40–50/year

---

## Coding conventions

- All weather and moon icons from Erik Flowers pack (`wi-*` classes). No Unicode emoji for iconography.
- Inline styles use CSS variables from the token system where possible; explicit hex only where variable resolution is unreliable (e.g. inside dynamically generated innerHTML for icon colours).
- `str_replace` edits preferred over full-file rewrites — keeps changes targeted and auditable.
- JS syntax checked with `new Function()` after every edit session before presenting output.
- New features added to this brief at the end of each working session.
