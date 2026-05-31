/**
 * Meteoron — Forecast
 * Context detection and main weather data fetch.
 * Orchestrates marine, aviation, and fire sub-modules.
 */

import { S }                    from '../core/state.js';
import { emit }                 from '../core/state.js';
import {
  OPEN_METEO_FORECAST,
  OPEN_METEO_ELEVATION,
}                               from '../core/config.js';
import {
  cacheGet,
  cacheSet,
  savePressureReading,
  saveLastLocation,
}                               from '../core/cache.js';
import { fetchWT }              from '../core/utils.js';
import { owmWindParam, toKmh }  from '../core/units.js';
import { fetchMarineData }      from './marine.js';

// ── Context detection ─────────────────────────────────────────────────────

/**
 * Detect the operational profile for the given coordinates.
 * Sets S.ui.profile, S.ui.subProfile, S.ui.context,
 * S.runtime.elevation, S.runtime.isLand.
 *
 * Detection priority:
 * 1. Aviation manual override
 * 2. Marine (is_land = 0 or sea-level proxy)
 * 3. Alpine (elevation ≥ 2000m)
 * 4. Highland (elevation 500–2000m)
 * 5. Lowland (default)
 *
 * Fire sub-profile is evaluated dynamically in cards.js against live conditions.
 *
 * @param {number} lat
 * @param {number} lon
 */
export async function detectContext(lat, lon) {
  try {
    const d = await fetchWT(
      `${OPEN_METEO_ELEVATION}?latitude=${lat}&longitude=${lon}`,
      5000
    );
    S.runtime.elevation = d.elevation?.[0] ?? 0;
    S.runtime.isLand = S.runtime.elevation > -50;
  } catch {
    S.runtime.elevation = 0;
    S.runtime.isLand = true;
  }

  // 1. Aviation — manual override takes priority
  if (S.user.aviationManual) {
    S.ui.profile = 'aviation';
    if (!['surface', 'lowlevel', 'highlevel'].includes(S.ui.subProfile)) {
      S.ui.subProfile = 'lowlevel';
    }
    S.ui.context = 'general';
    return;
  }

  // 2. Marine — over water or sea-level proxy at low latitude
  if (!S.runtime.isLand || (Math.abs(lat) < 60 && S.runtime.elevation < 10)) {
    S.ui.profile    = 'marine';
    S.ui.subProfile = 'coastal'; // Coastal distance TBD; elevation proxy insufficient
    S.ui.context    = 'marine';
    return;
  }

  // 3. Alpine
  if (S.runtime.elevation >= 2000) {
    S.ui.profile    = 'overland';
    S.ui.subProfile = 'alpine';
    S.ui.context    = 'alpine';
    return;
  }

  // 4 & 5. Highland / Lowland (Fire checked dynamically)
  S.ui.profile    = 'overland';
  S.ui.subProfile = S.runtime.elevation >= 500 ? 'highland' : 'lowland';
  S.ui.context    = 'general';
}

// ── Main weather fetch ────────────────────────────────────────────────────

/**
 * Fetch weather data for a location. Checks cache first.
 * On success emits 'weather:ready' with the data payload.
 * On failure emits 'weather:error' with an error descriptor.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} city
 */
export async function fetchWeatherData(lat, lon, city) {
  emit('weather:loading', { lat, lon, city });

  // ── Cache hit ──────────────────────────────────────────────────────────
  const cached = cacheGet(lat, lon);
  if (cached) {
    S.data.weather    = cached.weather;
    S.data.marine     = cached.marine;
    S.runtime.lat     = lat;
    S.runtime.lon     = lon;
    S.runtime.city    = city;
    S.ui.context      = cached.context;
    S.runtime.elevation = cached.elevation;
    S.runtime.isLand  = cached.isLand;
    if (!S.user.aviationManual) {
      if (cached.profile)    S.ui.profile    = cached.profile;
      if (cached.subProfile) S.ui.subProfile = cached.subProfile;
    }
    emit('weather:ready', { weather: cached.weather, city, lat, lon });
    return;
  }

  // ── Fresh fetch ────────────────────────────────────────────────────────
  try {
    await detectContext(lat, lon);

    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'surface_pressure',
        'visibility',
      ].join(','),
      hourly: [
        'temperature_2m',
        'weather_code',
        'precipitation_probability',
        'wind_speed_10m',
        'wind_direction_10m',
        'relative_humidity_2m',
        'surface_pressure',
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'uv_index_max',
        'wind_speed_10m_max',
        'wind_direction_10m_dominant',
        'precipitation_sum',
      ].join(','),
      wind_speed_unit: owmWindParam(),
      timezone: 'auto',
      forecast_days: 7,
    });

    const [weatherData] = await Promise.all([
      fetchWT(`${OPEN_METEO_FORECAST}?${params}`, 10000),
      fetchMarineData(lat, lon),
    ]);

    // Persist
    cacheSet(
      lat, lon,
      weatherData, S.data.marine,
      S.ui.context, S.runtime.elevation, S.runtime.isLand
    );
    saveLastLocation(lat, lon, city);
    savePressureReading(lat, lon, weatherData.current.surface_pressure);

    S.data.weather  = weatherData;
    S.runtime.lat   = lat;
    S.runtime.lon   = lon;
    S.runtime.city  = city;

    emit('weather:ready', { weather: weatherData, city, lat, lon });

  } catch (e) {
    console.error('Forecast fetch error:', e);
    emit('weather:error', e);
  }
}