/**
 * Meteoron — Config
 * All application-level constants. Import from here; never hardcode elsewhere.
 */

// ── API endpoints ────────────────────────────────────────────────────────
export const OWM_PROXY =
  'https://rapid-paper-a152meteoron-owm-proxy.crokano.workers.dev';

export const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_ELEVATION = 'https://api.open-meteo.com/v1/elevation';
export const OPEN_METEO_MARINE = 'https://marine-api.open-meteo.com/v1/marine';
export const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
export const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';

// ── Map tile styles (OpenFreeMap) ────────────────────────────────────────
export const OFM_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark:  'https://tiles.openfreemap.org/styles/dark',
};

// ── Preferences ──────────────────────────────────────────────────────────
export const PREFS_VERSION = 1;
export const PREFS_KEY     = 'meteoron_prefs';
export const LAST_LOC_KEY  = 'met_last_loc';

// ── Cache ────────────────────────────────────────────────────────────────
export const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in ms

// ── WMO weather code table ───────────────────────────────────────────────
// [description, satellite abbreviation]
export const WMO = {
  0:  ['Clear sky',              'CLR'],
  1:  ['Mainly clear',           'CLR'],
  2:  ['Partly cloudy',          'PTCLD'],
  3:  ['Overcast',               'OCST'],
  45: ['Fog',                    'FOG'],
  48: ['Rime fog',               'FOG'],
  51: ['Light drizzle',          'DRZL'],
  53: ['Drizzle',                'DRZL'],
  55: ['Heavy drizzle',          'HVDRZL'],
  61: ['Slight rain',            'RN'],
  63: ['Rain',                   'RN'],
  65: ['Heavy rain',             'HVYRN'],
  71: ['Slight snow',            'SN'],
  73: ['Snow',                   'SN'],
  75: ['Heavy snow',             'HVYSN'],
  77: ['Snow grains',            'SN'],
  80: ['Rain showers',           'SHWR'],
  81: ['Rain showers',           'SHWR'],
  82: ['Heavy showers',          'HVSHWR'],
  85: ['Snow showers',           'SNSHWR'],
  86: ['Heavy snow showers',     'HVSNSHWR'],
  95: ['Thunderstorm',           'TSTM'],
  96: ['Thunderstorm + hail',    'TSTM+HAIL'],
  99: ['Severe thunderstorm',    'SVTSTM'],
};

// ── Beaufort ─────────────────────────────────────────────────────────────
export const BFT_LABELS = [
  'Calm', 'Light air', 'Light breeze', 'Gentle breeze', 'Moderate breeze',
  'Fresh breeze', 'Strong breeze', 'Near gale', 'Gale', 'Severe gale',
  'Storm', 'Violent storm', 'Hurricane',
];

export const BFT_MARINE = [
  'Sea like a mirror', 'Ripples, no crests', 'Small wavelets', 'Large wavelets',
  'Small waves', 'Moderate waves', 'Large waves forming', 'Sea heaps up',
  'Moderately high waves', 'High waves', 'Very high waves',
  'Exceptionally high waves', 'Air filled with foam',
];

// ── Map layer legend data ────────────────────────────────────────────────
export const LEGENDS = {
  temp_new: {
    title: 'Temperature',
    gradient: 'linear-gradient(to right,#821692,#3a0af5,#0000ff,#0a74ff,#00d4ff,#00ff80,#a8e600,#ffff00,#ff8000,#ff0000)',
    min: '−40°', mid: '0°', max: '+40°',
  },
  wind_new: {
    title: 'Wind speed',
    gradient: 'linear-gradient(to right,#ffffff,#d4f5d4,#a8e6a8,#78d278,#ffff64,#ffc800,#ff8c00,#ff6400,#e00000,#c80000)',
    min: 'Calm 0', mid: '~50 km/h', max: '200+ km/h',
  },
  precipitation_new: {
    title: 'Precipitation intensity',
    gradient: 'linear-gradient(to right,#a0f0ff,#64c8ff,#0096ff,#0050c8,#8000c8,#c800c8)',
    min: '0 mm/h', mid: 'Moderate', max: '200+ mm/h',
  },
  clouds_new: {
    title: 'Cloud cover',
    gradient: 'linear-gradient(to right,#ffffff,#e0e8f0,#b8cce0,#8aaac8,#5a80a8,#2a5080,#0a2850)',
    min: 'Clear 0%', mid: '50%', max: 'Overcast 100%',
  },
  pressure_new: {
    title: 'Sea level pressure',
    gradient: 'linear-gradient(to right,#ff4040,#ff9900,#ffff40,#80ff40,#40c0ff,#8040ff)',
    min: 'Low 970 hPa', mid: 'Normal', max: 'High 1050 hPa',
  },
};

// ── Fire danger rating thresholds (McArthur) ─────────────────────────────
export const FIRE_RATINGS = [
  { label: 'Low',          color: '#2E7D32', max: 11       },
  { label: 'Moderate',     color: '#F9A825', max: 24       },
  { label: 'High',         color: '#EF6C00', max: 49       },
  { label: 'Very High',    color: '#C62828', max: 74       },
  { label: 'Extreme',      color: '#880E4F', max: 99       },
  { label: 'Catastrophic', color: '#212121', max: Infinity },
];

// ── Sub-profile display labels and CSS classes ───────────────────────────
export const SUB_LABELS = {
  inshore:   'Marine · Inshore',
  coastal:   'Marine · Coastal',
  offshore:  'Marine · Offshore',
  lowland:   'Overland · Lowland',
  highland:  'Overland · Highland',
  alpine:    'Overland · Alpine',
  fire:      'Fire Watch',
  surface:   'Aviation · Surface',
  lowlevel:  'Aviation · Low Level',
  highlevel: 'Aviation · High Level',
};

export const SUB_CLASS = {
  inshore:  'marine',
  coastal:  'marine',
  offshore: 'marine',
  lowland:  '',
  highland: '',
  alpine:   'alpine',
  fire:     'fire',
  surface:  'aviation',
  lowlevel: 'aviation',
  highlevel:'aviation',
};