// ════════════════════════════════════════════════════════════════
// METEORON — Improved JavaScript Implementation
// ════════════════════════════════════════════════════════════════

// ─── CONFIGURATION ─────────────────────────────────────────────
const CONFIG = {
  WMO_CODES: {
    0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤'], 2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'], 45: ['Foggy', '🌫'], 48: ['Rime fog', '🌫'],
    51: ['Light drizzle', '🌦'], 53: ['Drizzle', '🌦'], 55: ['Heavy drizzle', '🌧'],
    61: ['Slight rain', '🌧'], 63: ['Rain', '🌧'], 65: ['Heavy rain', '🌧'],
    71: ['Slight snow', '🌨'], 73: ['Snow', '❄️'], 75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '🌨'], 80: ['Rain showers', '🌦'], 81: ['Rain showers', '🌦'],
    82: ['Heavy showers', '⛈'], 85: ['Snow showers', '🌨'], 86: ['Heavy snow showers', '🌨'],
    95: ['Thunderstorm', '⛈'], 96: ['Thunderstorm + hail', '⛈'], 99: ['Severe thunderstorm', '⛈'],
  },
  COMPASS_DIRS: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'],
  API_TIMEOUTS: { GEOCODING: 5000, WEATHER: 8000, REVERSE: 5000 },
  DEBOUNCE_DELAY: 300,
  SUGGESTION_COUNT: 6,
  HOURLY_COUNT: 24,
  SAT_MESSAGE_WINDOWS: { SAILING: 160, ALPINE: 100 },
};

const STATE = {
  tempUnit: 'celsius',
  windUnit: 'kmh',
  distUnit: 'km',
  theme: 'dark',
  currentLat: null,
  currentLon: null,
  currentCity: null,
  currentData: null,
  map: null,
  mapLayer: null,
  loading: false,
  abortControllers: new Map(),
};

// ─── CACHED DOM ELEMENTS ───────────────────────────────────────
const DOM = {
  // Search/Nav
  tabCity: document.getElementById('tabCity'),
  tabCoords: document.getElementById('tabCoords'),
  cityRow: document.getElementById('cityRow'),
  coordRow: document.getElementById('coordRow'),
  coordHint: document.getElementById('coordHint'),
  suggestBox: document.getElementById('suggestions'),
  cityInput: document.getElementById('cityInput'),
  latInput: document.getElementById('latInput'),
  lonInput: document.getElementById('lonInput'),

  // Display
  message: document.getElementById('message'),
  weather: document.getElementById('weather'),
  currentCard: document.getElementById('currentCard'),
  hourlyRow: document.getElementById('hourlyRow'),
  dayList: document.getElementById('dayList'),
  detailGrid: document.getElementById('detailGrid'),

  // Settings
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsScrim: document.getElementById('settingsScrim'),
  settingsDrawer: document.getElementById('settingsDrawer'),

  // Satellite
  satToggleRow: document.getElementById('satToggleRow'),
  satToggleBtn: document.getElementById('satToggleBtn'),
  satCard: document.getElementById('satCard'),
  satMsgText: document.getElementById('satMsgText'),
  satCharCount: document.getElementById('satCharCount'),
  satTranslation: document.getElementById('satTranslation'),
  satWindowBadge: document.getElementById('satWindowBadge'),
  satOutput: document.getElementById('satOutput'),

  // Map
  mapToggleBtn: document.getElementById('mapToggleBtn'),
  mapPanel: document.getElementById('mapPanel'),
  mapCoordDisplay: document.getElementById('mapCoordDisplay'),
};

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────

function wmo(code) {
  return CONFIG.WMO_CODES[code] || ['Unknown', '🌡'];
}

function esc(s) {
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function degToCompass(deg) {
  const index = Math.round(deg / 22.5) % 16;
  return CONFIG.COMPASS_DIRS[index];
}

function formatHour(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', meridiem: 'short' });
}

function uvCategory(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

function convertTemp(celsius) {
  return STATE.tempUnit === 'fahrenheit' ? (celsius * 9/5) + 32 : celsius;
}

function convertWind(kmh) {
  switch(STATE.windUnit) {
    case 'mph': return (kmh * 0.621371).toFixed(1);
    case 'kn': return (kmh * 0.539957).toFixed(1);
    case 'ms': return (kmh / 3.6).toFixed(1);
    default: return kmh.toFixed(1);
  }
}

function convertDist(km) {
  return STATE.distUnit === 'mi' ? (km * 0.621371).toFixed(1) : km.toFixed(1);
}

// Enhanced fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Debounce utility
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function setLoading(isLoading) {
  STATE.loading = isLoading;
  // Visual feedback: could add spinner class
}

function showMsg(html) {
  DOM.message.innerHTML = html || '<span class="msg-icon">🌤</span><div class="msg-title">Welcome to Meteoron</div>';
  DOM.message.style.display = 'block';
  DOM.weather.classList.remove('visible');
}

// ─── TAB SWITCHING ─────────────────────────────────────────────

function switchToTab(isCity) {
  if (isCity) {
    DOM.tabCity.classList.add('active');
    DOM.tabCoords.classList.remove('active');
    DOM.cityRow.classList.remove('hidden');
    DOM.coordRow.classList.add('hidden');
    DOM.coordHint.classList.add('hidden');
  } else {
    DOM.tabCoords.classList.add('active');
    DOM.tabCity.classList.remove('active');
    DOM.coordRow.classList.remove('hidden');
    DOM.coordHint.classList.remove('hidden');
    DOM.cityRow.classList.add('hidden');
  }
  DOM.suggestBox.classList.remove('show');
}

DOM.tabCity.addEventListener('click', () => switchToTab(true));
DOM.tabCoords.addEventListener('click', () => switchToTab(false));

// ─── COORDINATE SEARCH ────────────────────────────────────────

async function doCoordSearch() {
  const latVal = DOM.latInput.value.trim();
  const lonVal = DOM.lonInput.value.trim();
  let valid = true;

  const lat = parseFloat(latVal);
  const lon = parseFloat(lonVal);

  DOM.latInput.classList.toggle('error', latVal === '' || isNaN(lat) || lat < -90 || lat > 90);
  DOM.lonInput.classList.toggle('error', lonVal === '' || isNaN(lon) || lon < -180 || lon > 180);

  if (DOM.latInput.classList.contains('error') || DOM.lonInput.classList.contains('error')) return;

  showMsg('<span class="m3-progress"></span> Resolving location…');

  let name = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  try {
    const data = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {},
      CONFIG.API_TIMEOUTS.REVERSE
    );
    if (data?.address) {
      const place = data.address.city || data.address.town || data.address.village ||
                    data.address.county || data.address.state_district || data.address.state;
      if (place) name = place + (data.address.country ? ', ' + data.address.country : '');
    }
  } catch (err) {
    console.warn('Reverse geocoding failed:', err.message);
  }

  fetchWeather(lat, lon, name);
}

[DOM.latInput, DOM.lonInput].forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') doCoordSearch(); });
  inp.addEventListener('input', () => inp.classList.remove('error'));
});

document.getElementById('coordBtn').addEventListener('click', doCoordSearch);

// ─── GEOCODING & CITY SEARCH ──────────────────────────────────

let suggestTimeout;

DOM.cityInput.addEventListener('input', debounce(async () => {
  const q = DOM.cityInput.value.trim();
  if (q.length < 2) {
    DOM.suggestBox.innerHTML = '';
    DOM.suggestBox.classList.remove('show');
    return;
  }
  await geocode(q, true);
}, CONFIG.DEBOUNCE_DELAY));

document.addEventListener('click', e => {
  if (!e.target.closest('.m3-search-field')) {
    DOM.suggestBox.classList.remove('show');
  }
});

DOM.cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    DOM.suggestBox.classList.remove('show');
    doSearch();
  }
});

document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('locBtn').addEventListener('click', useLocation);

async function geocode(q, showSuggestions) {
  try {
    const data = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${CONFIG.SUGGESTION_COUNT}&language=en&format=json`,
      {},
      CONFIG.API_TIMEOUTS.GEOCODING
    );

    if (!data.results?.length) {
      if (showSuggestions) {
        DOM.suggestBox.innerHTML = '';
        DOM.suggestBox.classList.remove('show');
      }
      return null;
    }

    if (showSuggestions) {
      DOM.suggestBox.innerHTML = data.results
        .map(loc => `
          <div class="suggestion-item" data-lat="${loc.latitude}" data-lon="${loc.longitude}" data-name="${esc(loc.name)}" data-country="${esc(loc.country || '')}">
            <span>${esc(loc.name)}${loc.admin1 ? ', ' + esc(loc.admin1) : ''}</span>
            <span class="country">${esc(loc.country || '')}</span>
          </div>
        `)
        .join('');
      
      DOM.suggestBox.classList.add('show');
      
      DOM.suggestBox.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          DOM.cityInput.value = el.dataset.name;
          DOM.suggestBox.classList.remove('show');
          fetchWeather(
            parseFloat(el.dataset.lat),
            parseFloat(el.dataset.lon),
            el.dataset.name + (el.dataset.country ? ', ' + el.dataset.country : '')
          );
        });
      });
    }
    return data.results;
  } catch (err) {
    console.error('Geocoding error:', err);
    if (showSuggestions) {
      showMsg('<span class="msg-icon">⚠️</span><div class="msg-title">Search failed</div><div class="msg-sub">Network error. Please try again.</div>');
    }
    return null;
  }
}

async function doSearch() {
  const q = DOM.cityInput.value.trim();
  if (!q) return;
  
  showMsg('<span class="m3-progress"></span> Finding location…');
  const results = await geocode(q, false);
  
  if (!results?.length) {
    showMsg('<span class="msg-icon">❓</span><div class="msg-title">City not found</div><div class="msg-sub">Try a different name</div>');
    return;
  }
  
  const loc = results[0];
  fetchWeather(loc.latitude, loc.longitude, loc.name + (loc.country ? ', ' + loc.country : ''));
}

function useLocation() {
  if (!navigator.geolocation) {
    showMsg('<span class="msg-icon">⚠️</span><div class="msg-title">Geolocation unavailable</div>');
    return;
  }
  
  showMsg('<span class="m3-progress"></span> Detecting your location…');
  
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude, longitude } = pos.coords;
      let name = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
      
      try {
        const data = await fetchWithTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          {},
          CONFIG.API_TIMEOUTS.REVERSE
        );
        name = data.address?.city || data.address?.town || data.address?.village || data.address?.county || name;
        if (data.address?.country) name += ', ' + data.address.country;
      } catch (err) {
        console.warn('Reverse geocoding failed:', err);
      }
      
      fetchWeather(latitude, longitude, name);
    },
    () => showMsg('<span class="msg-icon">🚫</span><div class="msg-title">Location access denied</div><div class="msg-sub">Please search manually</div>')
  );
}

// ─── WEATHER FETCHING ────────────────────────────────────────

async function fetchWeather(lat, lon, cityName) {
  setLoading(true);
  showMsg('<span class="m3-progress"></span> Loading forecast…');
  STATE.currentLat = lat;
  STATE.currentLon = lon;
  STATE.currentCity = cityName;

  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant',
      wind_speed_unit: 'kmh',
      timezone: 'auto',
      forecast_days: 7,
    });
    
    const data = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      {},
      CONFIG.API_TIMEOUTS.WEATHER
    );
    
    STATE.currentData = data;
    renderWeather(data, cityName, lat, lon);
    showSatellitePanel();
  } catch (err) {
    console.error('Weather fetch error:', err);
    showMsg('<span class="msg-icon">⚠️</span><div class="msg-title">Failed to load weather</div><div class="msg-sub">Check your connection and try again</div>');
  } finally {
    setLoading(false);
  }
}

// ─── WEATHER RENDERING ────────────────────────────────────────

function renderWeather(d, cityName, lat, lon) {
  const c = d.current;
  const [condLabel, condIcon] = wmo(c.weather_code);
  const windDir = degToCompass(c.wind_direction_10m);
  const tempVal = convertTemp(c.temperature_2m);
  const feelsVal = convertTemp(c.apparent_temperature);
  const windVal = convertWind(c.wind_speed_10m);
  const visVal = convertDist(c.visibility / 1000);
  const tempUnit = STATE.tempUnit === 'fahrenheit' ? '°F' : '°C';
  const windUnit = STATE.windUnit === 'mph' ? 'mph' : STATE.windUnit === 'kn' ? 'kn' : STATE.windUnit === 'ms' ? 'm/s' : 'km/h';

  DOM.currentCard.innerHTML = `
    <div class="location-eyebrow">Current Conditions</div>
    <div class="city-name">${esc(cityName)}</div>
    <div class="coord-sub">${lat.toFixed(4)}°, ${lon.toFixed(4)}° · ${esc(d.timezone)}</div>
    <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:20px">
      <div>
        <div class="big-temp">${Math.round(tempVal)}<sup>${tempUnit}</sup></div>
        <div class="feels-like">Feels like ${Math.round(feelsVal)}°</div>
      </div>
    </div>
    <div class="condition-pill"><span class="cond-icon">${condIcon}</span>${esc(condLabel)}</div>
    <div class="stats-grid">
      <div class="stat-chip">
        <div class="sc-label">Humidity</div>
        <div class="sc-val">${c.relative_humidity_2m}<span class="sc-unit">%</span></div>
      </div>
      <div class="stat-chip">
        <div class="sc-label">Wind</div>
        <div class="sc-val">${windVal}<span class="sc-unit"> ${windUnit} ${windDir}</span></div>
      </div>
      <div class="stat-chip">
        <div class="sc-label">Pressure</div>
        <div class="sc-val">${c.surface_pressure}<span class="sc-unit"> hPa</span></div>
      </div>
      <div class="stat-chip">
        <div class="sc-label">Visibility</div>
        <div class="sc-val">${visVal}<span class="sc-unit"> ${STATE.distUnit === 'mi' ? 'mi' : 'km'}</span></div>
      </div>
    </div>
  `;

  // Hourly
  const now = new Date();
  const hourly = d.hourly;
  const hourlyRows = [];
  let count = 0;
  
  for (let i = 0; i < hourly.time.length && count < CONFIG.HOURLY_COUNT; i++) {
    const t = new Date(hourly.time[i]);
    if (t < now) continue;
    
    const isNow = count === 0;
    const [, hIcon] = wmo(hourly.weather_code[i]);
    const hTemp = convertTemp(hourly.temperature_2m[i]);
    
    hourlyRows.push(`
      <div class="hour-card${isNow ? ' now' : ''}">
        <div class="h-time">${isNow ? 'Now' : formatHour(t)}</div>
        <div class="h-icon">${hIcon}</div>
        <div class="h-temp">${Math.round(hTemp)}°</div>
        <div class="h-rain">💧 ${hourly.precipitation_probability[i]}%</div>
      </div>
    `);
    count++;
  }
  
  DOM.hourlyRow.innerHTML = hourlyRows.join('');

  // Daily
  const daily = d.daily;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const dayItems = daily.time.map((t, i) => {
    const dt = new Date(t + 'T12:00:00');
    const isToday = i === 0;
    const [dLabel, dIcon] = wmo(daily.weather_code[i]);
    const dHi = convertTemp(daily.temperature_2m_max[i]);
    const dLo = convertTemp(daily.temperature_2m_min[i]);
    
    return `
      <div class="day-row${isToday ? ' today' : ''}">
        <div class="day-name">${isToday ? 'Today' : dayNames[dt.getDay()]}</div>
        <div class="day-icon">${dIcon}</div>
        <div class="day-desc">${esc(dLabel)}</div>
        <div class="day-rain">💧 ${daily.precipitation_probability_max[i]}%</div>
        <div class="day-range">
          <span class="day-hi">${Math.round(dHi)}°</span>
          <span class="day-lo">${Math.round(dLo)}°</span>
        </div>
      </div>
    `;
  });
  
  DOM.dayList.innerHTML = dayItems.join('');

  // Detail cards
  const uv = daily.uv_index_max[0];
  const uvColor = uv <= 2 ? '#5aff8a' : uv <= 5 ? '#ffe05a' : uv <= 7 ? '#ffaa5a' : '#ff6060';
  const uvW = Math.min((uv / 11) * 100, 100);
  const ws = convertWind(daily.wind_speed_10m_max[0]);
  const wsW = Math.min((ws / 80) * 100, 100);

  DOM.detailGrid.innerHTML = `
    <div class="detail-card">
      <div class="dc-label">UV Index — Today</div>
      <div class="dc-val">${uv}</div>
      <div class="dc-unit">${uvCategory(uv)}</div>
      <div class="m3-linear-bar"><div class="m3-linear-fill" style="width:${uvW}%;background:${uvColor}"></div></div>
    </div>
    <div class="detail-card">
      <div class="dc-label">Max Wind — Today</div>
      <div class="dc-val">${Math.round(ws)}</div>
      <div class="dc-unit">${windUnit}</div>
      <div class="m3-linear-bar"><div class="m3-linear-fill" style="width:${wsW}%;background:#A8C7FA"></div></div>
    </div>
  `;

  DOM.message.style.display = 'none';
  DOM.weather.classList.add('visible');
}

// ─── SETTINGS ──────────────────────────────────────────────────

DOM.themeToggleBtn.addEventListener('click', () => {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', STATE.theme);
  DOM.themeIcon.textContent = STATE.theme === 'dark' ? 'dark_mode' : 'light_mode';
  localStorage.setItem('theme', STATE.theme);
});

DOM.settingsBtn.addEventListener('click', () => {
  DOM.settingsScrim.classList.add('open');
  DOM.settingsDrawer.classList.add('open');
});

[document.getElementById('settingsCloseBtn'), DOM.settingsScrim].forEach(el => {
  el.addEventListener('click', () => {
    DOM.settingsScrim.classList.remove('open');
    DOM.settingsDrawer.classList.remove('open');
  });
});

['tempUnitGroup', 'windUnitGroup', 'distUnitGroup', 'themeGroup'].forEach(groupId => {
  document.getElementById(groupId).querySelectorAll('.m3-seg-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.getElementById(groupId).querySelectorAll('.m3-seg-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      if (groupId === 'tempUnitGroup') STATE.tempUnit = e.target.dataset.val;
      if (groupId === 'windUnitGroup') STATE.windUnit = e.target.dataset.val;
      if (groupId === 'distUnitGroup') STATE.distUnit = e.target.dataset.val;
      if (groupId === 'themeGroup') {
        STATE.theme = e.target.dataset.val;
        document.documentElement.setAttribute('data-theme', STATE.theme);
        DOM.themeIcon.textContent = STATE.theme === 'dark' ? 'dark_mode' : 'light_mode';
      }

      if (STATE.currentData) {
        renderWeather(STATE.currentData, STATE.currentCity, STATE.currentLat, STATE.currentLon);
      }
    });
  });
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
STATE.theme = savedTheme;
document.documentElement.setAttribute('data-theme', savedTheme);
DOM.themeIcon.textContent = savedTheme === 'dark' ? 'dark_mode' : 'light_mode';

// ─── MAP ────────────────────────────────────────────────────────

DOM.mapToggleBtn.addEventListener('click', () => {
  DOM.mapPanel.classList.toggle('open');
  DOM.mapToggleBtn.classList.toggle('open');
});

// ─── SATELLITE MESSAGE PANEL ───────────────────────────────────

function showSatellitePanel() {
  DOM.satToggleRow.classList.add('visible');
}

DOM.satToggleBtn.addEventListener('click', () => {
  DOM.satCard.classList.toggle('open');
  DOM.satToggleBtn.classList.toggle('open');
});

document.getElementById('satGenerateBtn').addEventListener('click', generateSatMessage);
document.getElementById('satCopyBtn').addEventListener('click', copySatMessage);

function generateSatMessage() {
  const profile = document.querySelector('#satProfileGroup .m3-seg-btn.active').dataset.val;
  const charLimit = parseInt(document.querySelector('#satDeviceGroup .m3-seg-btn.active').dataset.val);
  const weather = STATE.currentData;
  const c = weather.current;

  const tempVal = convertTemp(c.temperature_2m);
  const tempUnit = STATE.tempUnit === 'fahrenheit' ? 'F' : 'C';
  const windVal = convertWind(c.wind_speed_10m);
  const windUnit = STATE.windUnit === 'mph' ? 'mph' : STATE.windUnit === 'kn' ? 'kn' : STATE.windUnit === 'ms' ? 'm/s' : 'kmh';
  const [condLabel] = wmo(c.weather_code);

  let message = `WX: ${Math.round(tempVal)}${tempUnit} ${windVal}${windUnit} ${condLabel} Vis:${convertDist(c.visibility/1000)}${STATE.distUnit==='mi'?'mi':'km'} `;

  if (profile === 'sailing') {
    message += `Humidity:${c.relative_humidity_2m}% Press:${c.surface_pressure}hPa`;
  } else if (profile === 'alpine') {
    message += `UV:${Math.round(weather.daily.uv_index_max[0])} Humidity:${c.relative_humidity_2m}%`;
  }

  const truncated = message.substring(0, charLimit);
  DOM.satMsgText.value = truncated;
  DOM.satCharCount.textContent = `${truncated.length} / ${charLimit}`;
  DOM.satTranslation.textContent = `Weather update: ${Math.round(tempVal)}° with ${condLabel.toLowerCase()}, wind at ${windVal} ${windUnit}.`;
  DOM.satOutput.classList.add('show');

  DOM.satCharCount.classList.remove('warn', 'over');
  if (truncated.length > charLimit * 0.9) DOM.satCharCount.classList.add('warn');
  if (truncated.length >= charLimit) DOM.satCharCount.classList.add('over');
}

function copySatMessage() {
  const msg = DOM.satMsgText.value;
  navigator.clipboard.writeText(msg).then(() => {
    const feedback = document.getElementById('satCopyFeedback');
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 2000);
  }).catch(err => console.error('Copy failed:', err));
}

// Initialize
showMsg('<span class="msg-icon">🌤</span><div class="msg-title">Welcome to Meteoron</div><div class="msg-sub">Search for a city, enter coordinates, or click the map to get started.</div>');
