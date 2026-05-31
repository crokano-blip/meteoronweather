/**
 * Meteoron — Cache
 * sessionStorage weather cache (10-minute TTL) and
 * localStorage persistence for last location and pressure readings.
 */

import { S } from './state.js';
import { owmWindParam } from './units.js';
import { CACHE_TTL, PREFS_VERSION, PREFS_KEY, LAST_LOC_KEY } from './config.js';

// ── Weather cache ────────────────────────────────────────────────────────

function cacheKey(lat, lon) {
  return `met_wx_${lat.toFixed(2)}_${lon.toFixed(2)}_${owmWindParam()}`;
}

/**
 * Retrieve cached weather data for a lat/lon pair.
 * Returns null on miss or expired TTL.
 */
export function cacheGet(lat, lon) {
  try {
    const raw = sessionStorage.getItem(cacheKey(lat, lon));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) {
      sessionStorage.removeItem(cacheKey(lat, lon));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

/**
 * Store weather data in the session cache.
 */
export function cacheSet(lat, lon, weather, marine, context, elevation, isLand) {
  try {
    sessionStorage.setItem(cacheKey(lat, lon), JSON.stringify({
      ts: Date.now(),
      weather,
      marine,
      context,
      elevation,
      isLand,
      profile:    S.ui.profile,
      subProfile: S.ui.subProfile,
    }));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

// ── Last location ────────────────────────────────────────────────────────

/** Persist the last successfully loaded location across page reloads. */
export function saveLastLocation(lat, lon, city) {
  try {
    localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat, lon, city }));
  } catch {}
}

/** Load the last persisted location, or null if none. */
export function loadLastLocation() {
  try {
    return JSON.parse(localStorage.getItem(LAST_LOC_KEY) || 'null');
  } catch {
    return null;
  }
}

// ── Pressure trend ───────────────────────────────────────────────────────

function pressureKey(lat, lon) {
  return `met_pres_${lat.toFixed(1)}_${lon.toFixed(1)}`;
}

/**
 * Save a pressure reading (hPa) for a location.
 * Keeps up to 12 readings within the last 6 hours.
 */
export function savePressureReading(lat, lon, hPa) {
  const key = pressureKey(lat, lon);
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ p: hPa, t: Date.now() });
    const cutoff = Date.now() - 6 * 3600000;
    localStorage.setItem(key, JSON.stringify(
      arr.filter(r => r.t > cutoff).slice(-12)
    ));
  } catch {}
}

/**
 * Calculate pressure trend from stored readings.
 * Returns null if insufficient data or readings are too recent to be meaningful.
 * Returns { dir, label, rate } where dir is '↑' | '↓' | '→'.
 */
export function getPressureTrend(lat, lon, currentHPa) {
  const key = pressureKey(lat, lon);
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if (arr.length < 2) return null;

    // Find reading closest to 90 minutes ago
    const target = Date.now() - 90 * 60000;
    const old = arr.reduce((best, r) =>
      Math.abs(r.t - target) < Math.abs(best.t - target) ? r : best
    );
    const hrs = (Date.now() - old.t) / 3600000;
    if (hrs < 0.4) return null; // Too recent to be meaningful

    const rate = (currentHPa - old.p) / hrs;
    if (rate >  0.5) return { dir: '↑', label: 'Rising',  rate:  rate.toFixed(1) };
    if (rate < -0.5) return { dir: '↓', label: 'Falling', rate: Math.abs(rate).toFixed(1) };
    return { dir: '→', label: 'Steady', rate: '0.0' };
  } catch {
    return null;
  }
}

// ── Preferences ──────────────────────────────────────────────────────────

/** Load user preferences from localStorage into S.user. */
export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (!p._v || p._v < PREFS_VERSION) {
      p.wind = p.wind || 'kn';
    }
    S.user.tempUnit       = p.temp     || 'celsius';
    S.user.windUnit       = p.wind     || 'kn';
    S.user.distUnit       = p.dist     || 'km';
    S.user.theme          = p.theme    || 'light';
    S.user.aviationManual = p.aviation || false;
  } catch {}
}

/** Persist S.user preferences to localStorage. */
export function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      _v:       PREFS_VERSION,
      temp:     S.user.tempUnit,
      wind:     S.user.windUnit,
      dist:     S.user.distUnit,
      theme:    S.user.theme,
      aviation: S.user.aviationManual,
    }));
  } catch {}
}