/**
 * Meteoron — Icons
 * All weather iconography via Erik Flowers weather-icons pack (wi-* classes).
 * No Unicode emoji. No other icon sources for weather.
 */

// ── WMO code → Erik Flowers day/night class maps ─────────────────────────

const WI_DAY = {
  0:  'wi-day-sunny',
  1:  'wi-day-sunny-overcast',
  2:  'wi-day-cloudy',
  3:  'wi-cloudy',
  45: 'wi-fog',
  48: 'wi-fog',
  51: 'wi-sprinkle',
  53: 'wi-sprinkle',
  55: 'wi-rain-mix',
  61: 'wi-rain',
  63: 'wi-rain',
  65: 'wi-rain',
  71: 'wi-snow',
  73: 'wi-snow',
  75: 'wi-snow-wind',
  77: 'wi-snow',
  80: 'wi-showers',
  81: 'wi-showers',
  82: 'wi-storm-showers',
  85: 'wi-snow',
  86: 'wi-snow-wind',
  95: 'wi-thunderstorm',
  96: 'wi-thunderstorm',
  99: 'wi-thunderstorm',
};

const WI_NIGHT = {
  0:  'wi-night-clear',
  1:  'wi-night-partly-cloudy',
  2:  'wi-night-alt-cloudy',
  3:  'wi-cloudy',
  45: 'wi-night-fog',
  48: 'wi-night-fog',
  51: 'wi-night-alt-sprinkle',
  53: 'wi-night-alt-sprinkle',
  55: 'wi-night-alt-rain-mix',
  61: 'wi-night-alt-rain',
  63: 'wi-night-alt-rain',
  65: 'wi-night-alt-rain',
  71: 'wi-night-alt-snow',
  73: 'wi-night-alt-snow',
  75: 'wi-night-alt-snow-wind',
  77: 'wi-night-alt-snow',
  80: 'wi-night-alt-showers',
  81: 'wi-night-alt-showers',
  82: 'wi-night-alt-storm-showers',
  85: 'wi-night-alt-snow',
  86: 'wi-night-alt-snow-wind',
  95: 'wi-night-alt-thunderstorm',
  96: 'wi-night-alt-thunderstorm',
  99: 'wi-night-alt-thunderstorm',
};

// ── Sun position ─────────────────────────────────────────────────────────

/**
 * Calculate approximate solar noon, sunrise, and sunset for a date and location.
 * Returns { sunrise, sunset } in decimal solar hours, or { polarDay } / { polarNight }.
 */
export function getSunTimes(date, lat, lon) {
  const rad = Math.PI / 180;
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const B   = (360 / 365) * (doy - 81) * rad;
  const decl = Math.asin(Math.sin(23.45 * rad) * Math.sin(B));
  const eot  = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const noon = 12 - (lon / 15) - (eot / 60);
  const cosH = (
    Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)
  ) / (Math.cos(lat * rad) * Math.cos(decl));

  if (cosH >  1) return { polarNight: true };
  if (cosH < -1) return { polarDay: true };

  const H = Math.acos(cosH) / rad;
  return {
    sunrise: noon - H / 15 + lon / 15,
    sunset:  noon + H / 15 + lon / 15,
  };
}

/**
 * Returns true if the location is experiencing night at the given UTC date.
 */
export function isNightAt(date, lat, lon) {
  const s = getSunTimes(date, lat, lon);
  if (s.polarDay)   return false;
  if (s.polarNight) return true;
  const h = ((date.getUTCHours() + date.getUTCMinutes() / 60 + lon / 15) % 24 + 24) % 24;
  return h < s.sunrise || h > s.sunset;
}

/**
 * Convert solar-time decimal hours to a displayable HH:MM string
 * in the location's local timezone.
 */
export function sunTimeToDisplay(decimalSolarHours, lon, timezone) {
  const utcMinutes = Math.round(
    ((decimalSolarHours - lon / 15) % 24 + 24) % 24 * 60
  );
  const now = new Date();
  const d = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    0, utcMinutes
  ));
  try {
    return d.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: timezone,
    });
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}

// ── Moon phase ────────────────────────────────────────────────────────────

/**
 * Returns moon phase as a fraction 0–1 (0 = new, 0.5 = full).
 */
export function getMoonPhase(date) {
  const ref = new Date('2000-01-06T18:14:00Z');
  return (((date - ref) / 86400000 % 29.53058867) + 29.53058867) % 29.53058867 / 29.53058867;
}

/**
 * Returns the Erik Flowers wi-moon-* class for a phase fraction 0–1.
 */
export function moonWiClass(phase) {
  const phases = [
    'wi-moon-new',
    'wi-moon-waxing-crescent-1',
    'wi-moon-first-quarter',
    'wi-moon-waxing-gibbous-4',
    'wi-moon-full',
    'wi-moon-waning-gibbous-4',
    'wi-moon-third-quarter',
    'wi-moon-waning-crescent-5',
  ];
  return phases[Math.round(phase * 8) % 8];
}

/**
 * Returns a human-readable moon phase description.
 */
export function moonPhaseDesc(phase) {
  if (phase < 0.0625 || phase >= 0.9375) return 'New Moon';
  if (phase < 0.1875) return 'Waxing Crescent';
  if (phase < 0.3125) return 'First Quarter';
  if (phase < 0.4375) return 'Waxing Gibbous';
  if (phase < 0.5625) return 'Full Moon';
  if (phase < 0.6875) return 'Waning Gibbous';
  if (phase < 0.8125) return 'Third Quarter';
  return 'Waning Crescent';
}

// ── WMO entry ─────────────────────────────────────────────────────────────

/**
 * Resolve a WMO code to [label, wi-class] for a given time and location.
 * Automatically selects day/night variant; clear night uses moon phase icon.
 *
 * @param {number} code   WMO weather code
 * @param {Date|null} date
 * @param {number|null} lat
 * @param {number|null} lon
 * @returns {[string, string]}  [description, wi-class]
 */
export function wmoEntry(code, date, lat, lon) {
  const { WMO } = await import('../core/config.js').catch(() => ({ WMO: {} }));
  // Resolve description from WMO table (imported synchronously via static import in consumers)
  const label = _WMO_LABELS[code] ?? 'Unknown';

  if (!date || lat == null) {
    return [label, WI_DAY[code] ?? 'wi-na'];
  }

  if (isNightAt(date, lat, lon)) {
    if (code === 0 || code === 1) {
      return [label, moonWiClass(getMoonPhase(date))];
    }
    return [label, WI_NIGHT[code] ?? WI_DAY[code] ?? 'wi-na'];
  }

  return [label, WI_DAY[code] ?? 'wi-na'];
}

// ── WMO label-only map (avoids circular import with config.js) ───────────
// Kept in sync manually with config.js WMO table.
const _WMO_LABELS = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Fog', 48:'Rime fog',
  51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Slight rain', 63:'Rain', 65:'Heavy rain',
  71:'Slight snow', 73:'Snow', 75:'Heavy snow', 77:'Snow grains',
  80:'Rain showers', 81:'Rain showers', 82:'Heavy showers',
  85:'Snow showers', 86:'Heavy snow showers',
  95:'Thunderstorm', 96:'Thunderstorm + hail', 99:'Severe thunderstorm',
};

/**
 * wmoEntry without dynamic import — usable everywhere via static import of config.
 * Pass the WMO table from config explicitly.
 *
 * @param {number} code
 * @param {Date|null} date
 * @param {number|null} lat
 * @param {number|null} lon
 * @returns {[string, string]}
 */
export function wmoEntryWith(code, date, lat, lon) {
  const label = _WMO_LABELS[code] ?? 'Unknown';

  if (!date || lat == null) {
    return [label, WI_DAY[code] ?? 'wi-na'];
  }

  if (isNightAt(date, lat, lon)) {
    if (code === 0 || code === 1) {
      return [label, moonWiClass(getMoonPhase(date))];
    }
    return [label, WI_NIGHT[code] ?? WI_DAY[code] ?? 'wi-na'];
  }

  return [label, WI_DAY[code] ?? 'wi-na'];
}

// ── Beaufort ──────────────────────────────────────────────────────────────

/**
 * Convert a wind speed in km/h to a Beaufort scale number (0–12).
 */
export function beaufortLevel(kmh) {
  if (kmh < 1)   return 0;
  if (kmh < 6)   return 1;
  if (kmh < 12)  return 2;
  if (kmh < 20)  return 3;
  if (kmh < 29)  return 4;
  if (kmh < 39)  return 5;
  if (kmh < 50)  return 6;
  if (kmh < 62)  return 7;
  if (kmh < 75)  return 8;
  if (kmh < 89)  return 9;
  if (kmh < 103) return 10;
  if (kmh < 117) return 11;
  return 12;
}

/**
 * Returns an HTML string with an Erik Flowers Beaufort icon.
 * Uses wi-wind-beaufort-{0-12} classes.
 *
 * @param {number} level  Beaufort number 0–12
 * @param {number} [size=22]  Approximate px size (controls font-size)
 * @returns {string}
 */
export function beaufortSVG(level, size = 22) {
  const fontSize = size <= 18 ? '1.1rem' : size >= 28 ? '1.75rem' : '1.375rem';
  return `<i class="wi wi-wind-beaufort-${level}" style="font-size:${fontSize};vertical-align:middle"></i>`;
}