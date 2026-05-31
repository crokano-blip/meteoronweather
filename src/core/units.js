/**
 * Meteoron — Units
 * All unit conversion and display-formatting functions.
 * Reads S.user.* for current unit preferences.
 */

import { S } from './state.js';

// ── Temperature ──────────────────────────────────────────────────────────

/** Convert Celsius to the user's preferred temperature unit. */
export function convertTemp(c) {
  return S.user.tempUnit === 'fahrenheit'
    ? Math.round(c * 9 / 5 + 32)
    : Math.round(c);
}

/** Display string for the current temperature unit (e.g. "°C"). */
export function tempUnit() {
  return S.user.tempUnit === 'fahrenheit' ? '°F' : '°C';
}

// ── Wind ────────────────────────────────────────────────────────────────

/**
 * Convert a wind speed in km/h to the user's preferred unit.
 * Returns a string with appropriate decimal places.
 */
export function convertWind(kmh) {
  switch (S.user.windUnit) {
    case 'kn':  return (kmh * 0.539957).toFixed(1);
    case 'ms':  return (kmh / 3.6).toFixed(1);
    case 'mph': return (kmh * 0.621371).toFixed(1);
    default:    return String(Math.round(kmh));
  }
}

/** Display label for the current wind unit (e.g. "kt"). */
export function windLabel() {
  switch (S.user.windUnit) {
    case 'kn':  return 'kt';
    case 'ms':  return 'm/s';
    case 'mph': return 'mph';
    default:    return 'km/h';
  }
}

/**
 * The Open-Meteo `wind_speed_unit` parameter value for the current unit.
 * Used when constructing API request URLs.
 */
export function owmWindParam() {
  switch (S.user.windUnit) {
    case 'kn':  return 'kn';
    case 'ms':  return 'ms';
    case 'mph': return 'mph';
    default:    return 'kmh';
  }
}

/**
 * Convert FROM the user's current unit back to km/h.
 * Needed when comparing against thresholds stored in km/h.
 */
export function toKmh(v) {
  switch (S.user.windUnit) {
    case 'kn':  return v / 0.539957;
    case 'ms':  return v * 3.6;
    case 'mph': return v / 0.621371;
    default:    return v;
  }
}

// ── Distance ─────────────────────────────────────────────────────────────

/** Convert km to the user's preferred distance unit. */
export function convertDist(km) {
  return S.user.distUnit === 'mi'
    ? (km * 0.621371).toFixed(1)
    : km.toFixed(1);
}

/** Display label for the current distance unit (e.g. "km"). */
export function distLabel() {
  return S.user.distUnit === 'mi' ? 'mi' : 'km';
}

// ── Direction ────────────────────────────────────────────────────────────

/** Convert a bearing in degrees to a 16-point compass abbreviation. */
export function degToCompass(d) {
  const pts = [
    'N','NNE','NE','ENE','E','ESE','SE','SSE',
    'S','SSW','SW','WSW','W','WNW','NW','NNW',
  ];
  return pts[Math.round(d / 22.5) % 16];
}

// ── Time ─────────────────────────────────────────────────────────────────

/**
 * Format a Date as HH:MM in the given IANA timezone.
 * Falls back to the browser's local timezone if timezone is invalid.
 */
export function formatHour(date, timezone) {
  try {
    return date.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: timezone,
    });
  } catch {
    return date.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }
}

// ── UV category ──────────────────────────────────────────────────────────

/** Human-readable UV index risk category. */
export function uvCategory(uv) {
  if (uv <= 2)  return 'Low';
  if (uv <= 5)  return 'Moderate';
  if (uv <= 7)  return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}