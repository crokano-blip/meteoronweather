/**
 * Meteoron — Marine
 * Fetches Open-Meteo Marine API data.
 * Only called when S.ui.context === 'marine'.
 */

import { S }               from '../core/state.js';
import { OPEN_METEO_MARINE } from '../core/config.js';
import { fetchWT }           from '../core/utils.js';

/**
 * Fetch marine forecast data for the current location and store it in S.data.marine.
 * No-ops silently if the context is not marine.
 *
 * @param {number} lat
 * @param {number} lon
 */
export async function fetchMarineData(lat, lon) {
  if (S.ui.context !== 'marine') {
    S.data.marine = null;
    return;
  }

  try {
    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      hourly: [
        'wave_height',
        'wave_direction',
        'wave_period',
        'wind_wave_height',
        'swell_wave_height',
        'swell_wave_direction',
        'swell_wave_period',
        'ocean_current_velocity',
        'ocean_current_direction',
      ].join(','),
      daily: 'wave_height_max,wave_period_max',
      timezone: 'auto',
      forecast_days: 3,
    });

    S.data.marine = await fetchWT(`${OPEN_METEO_MARINE}?${params}`, 8000);
  } catch {
    S.data.marine = null;
  }
}