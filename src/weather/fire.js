/**
 * Meteoron — Fire
 * McArthur Forest Fire Danger Index (FFDI) calculation.
 * Pure functions — no side effects, no DOM access.
 */

import { FIRE_RATINGS } from '../core/config.js';

/**
 * Simplified drought factor from recent precipitation (mm).
 * This is an approximation; a full DF requires soil moisture modelling.
 *
 * @param {number} recentRainMm  Rainfall sum over recent days
 * @returns {number}  Drought Factor 0–10
 */
export function droughtFactor(recentRainMm) {
  if (recentRainMm > 80) return 0;
  if (recentRainMm > 40) return 2;
  if (recentRainMm > 20) return 4;
  if (recentRainMm > 10) return 6;
  if (recentRainMm > 5)  return 7;
  if (recentRainMm > 0)  return 8;
  return 10;
}

/**
 * Calculate the McArthur FFDI.
 *
 * @param {number} tempC     Air temperature (°C)
 * @param {number} rhPct     Relative humidity (%)
 * @param {number} windKmh   Wind speed (km/h)
 * @param {number} df        Drought Factor (0–10)
 * @returns {number}  FFDI value (≥ 0)
 */
export function calcFFDI(tempC, rhPct, windKmh, df) {
  if (df <= 0) return 0;
  return 2 * Math.exp(
    -0.45
    + 0.987 * Math.log(df)
    - 0.0345 * rhPct
    + 0.0338 * tempC
    + 0.0234 * windKmh
  );
}

/**
 * Return the fire danger rating object for a given FFDI value.
 *
 * @param {number} ffdi
 * @returns {{ label: string, color: string, max: number }}
 */
export function fireRating(ffdi) {
  return FIRE_RATINGS.find(r => ffdi <= r.max) ?? FIRE_RATINGS[FIRE_RATINGS.length - 1];
}

/**
 * Returns true when live conditions meet the Fire sub-profile threshold.
 *
 * @param {number} tempC
 * @param {number} rhPct
 * @param {number} windKmh
 * @returns {boolean}
 */
export function isFireProne(tempC, rhPct, windKmh) {
  return tempC > 28 && rhPct < 30 && windKmh > 20;
}