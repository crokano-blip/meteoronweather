/**
 * Meteoron — main.js
 * Boot sequence. Loads preferences, wires pub/sub events,
 * restores last location or shows welcome state.
 *
 * Import order matters: state → core → ui → weather → map
 */

import { S }                from './src/core/state.js';
import { on, emit }         from './src/core/state.js';
import { loadPrefs }        from './src/core/cache.js';
import { loadLastLocation } from './src/core/cache.js';
import { applyPrefsToUI }   from './src/ui/settings.js';
import { detectContext }    from './src/weather/forecast.js';
import { fetchWeatherData } from './src/weather/forecast.js';
import { renderWeather, showLoadingSkeletons } from './src/ui/cards.js';

// Side-effect imports — these modules self-register their DOM listeners on load
import './src/ui/search.js';
import './src/ui/settings.js';
import './src/ui/sheets.js';
import './src/weather/satellite.js';
import './src/map/map.js';

// ── Load preferences ──────────────────────────────────────────────────────
loadPrefs();
applyPrefsToUI();

// ── Event wiring ──────────────────────────────────────────────────────────

on('weather:loading', () => {
  showLoadingSkeletons();
});

on('weather:ready', ({ weather, lat, lon }) => {
  renderWeather(weather, lat, lon);
});

on('weather:error', e => {
  showError(e);
});

on('prefs:changed', () => {
  if (S.data.weather) {
    renderWeather(S.data.weather, S.runtime.lat, S.runtime.lon);
  }
});

on('prefs:aviation-changed', () => {
  if (S.runtime.lat !== null) {
    detectContext(S.runtime.lat, S.runtime.lon).then(() => {
      if (S.data.weather) {
        renderWeather(S.data.weather, S.runtime.lat, S.runtime.lon);
      }
    });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────

const lastLoc = loadLastLocation();
if (lastLoc) {
  showMsg('<span class="spinner"></span>', `Restoring ${lastLoc.city}…`, '');
  fetchWeatherData(lastLoc.lat, lastLoc.lon, lastLoc.city);
} else {
  showMsg('◎', 'Welcome to Meteoron',
    'Search for a city, enter coordinates, or click the map to load the atmospheric state.');
}

// ── Message helpers ───────────────────────────────────────────────────────

function showMsg(icon, title, sub) {
  document.getElementById('weather').classList.remove('visible');
  const msg = document.getElementById('message');
  msg.style.display = 'block';
  msg.innerHTML = title
    ? `<span class="msg-icon">${icon}</span>
       <div class="msg-title">${title}</div>
       <div class="msg-sub">${sub ?? ''}</div>`
    : `<div style="padding:40px 0;color:var(--on-surface-dim)">${icon}</div>`;
}

function showError(e) {
  if (!navigator.onLine) {
    showMsg('📡', 'You appear to be offline', 'Check your connection and try again.');
  } else if (e?.name === 'AbortError') {
    showMsg('⏱', 'Request timed out', 'The forecast server took too long. Try again in a moment.');
  } else if (e?.message?.includes('429')) {
    showMsg('⚠', 'Too many requests', 'Please wait a moment before searching again.');
  } else if (e?.message?.includes('404')) {
    showMsg('🔍', 'Location not found', 'No forecast data is available for this location.');
  } else {
    showMsg('⚠', 'Could not load forecast', 'The weather service may be temporarily unavailable.');
  }
}