// ════════════════════════════════════════════════════════════════════════════
// METEORON — Complete JavaScript Implementation
// All missing functions for weather forecast & satellite messaging
// ════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────
// STATE & CONFIG
// ──────────────────────────────────────────────────────────────────────────
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
};

// ──────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────

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
    default: return kmh;
  }
}

function convertDist(km) {
  return STATE.distUnit === 'mi' ? (km * 0.621371).toFixed(1) : km.toFixed(1);
}

function showMsg(html) {
  const msg = document.getElementById('message');
  const weather = document.getElementById('weather');
  msg.innerHTML = html || '<span class="msg-icon">🌤</span><div class="msg-title">Welcome to Meteoron</div>';
  msg.style.display = 'block';
  weather.classList.remove('visible');
}

// ──────────────────────────────────────────────────────────────────────────
// TAB SWITCHING
// ──────────────────────────────────────────────────────────────────────────

const tabCity = document.getElementById('tabCity');
const tabCoords = document.getElementById('tabCoords');
const cityRow = document.getElementById('cityRow');
const coordRow = document.getElementById('coordRow');
const coordHint = document.getElementById('coordHint');
const suggestBox = document.getElementById('suggestions');

tabCity.addEventListener('click', () => {
  tabCity.classList.add('active');
  tabCoords.classList.remove('active');
  cityRow.classList.remove('hidden');
  coordRow.classList.add('hidden');
  coordHint.classList.add('hidden');
  suggestBox.classList.remove('show');
});

tabCoords.addEventListener('click', () => {
  tabCoords.classList.add('active');
  tabCity.classList.remove('active');
  coordRow.classList.remove('hidden');
  coordHint.classList.remove('hidden');
  cityRow.classList.add('hidden');
  suggestBox.classList.remove('show');
});

// ──────────────────────────────────────────────────────────────────────────
// COORDINATE SEARCH
// ──────────────────────────────────────────────────────────────────────────

const latInput = document.getElementById('latInput');
const lonInput = document.getElementById('lonInput');

document.getElementById('coordBtn').addEventListener('click', doCoordSearch);

[latInput, lonInput].forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') doCoordSearch(); });
  inp.addEventListener('input', () => inp.classList.remove('error'));
});

async function doCoordSearch() {
  const latVal = latInput.value.trim();
  const lonVal = lonInput.value.trim();
  let valid = true;

  const lat = parseFloat(latVal);
  const lon = parseFloat(lonVal);

  if (latVal === '' || isNaN(lat) || lat < -90 || lat > 90) {
    latInput.classList.add('error');
    valid = false;
  }
  if (lonVal === '' || isNaN(lon) || lon < -180 || lon > 180) {
    lonInput.classList.add('error');
    valid = false;
  }
  if (!valid) return;

  showMsg('<span class="m3-progress"></span> Resolving location…');

  let name = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const d = await r.json();
    if (d?.address) {
      const place = d.address.city || d.address.town || d.address.village ||
                    d.address.county || d.address.state_district || d.address.state;
      if (place) name = place + (d.address.country ? ', ' + d.address.country : '');
    }
  } catch {}

  fetchWeather(lat, lon, name);
}

// ──────────────────────────────────────────────────────────────────────────
// GEOCODING & CITY SEARCH
// ──────────────────────────────────────────────────────────────────────────

let suggestTimeout;
const cityInput = document.getElementById('cityInput');

cityInput.addEventListener('input', () => {
  clearTimeout(suggestTimeout);
  const q = cityInput.value.trim();
  if (q.length < 2) {
    suggestBox.innerHTML = '';
    suggestBox.classList.remove('show');
    return;
  }
  suggestTimeout = setTimeout(() => geocode(q, true), 300);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.m3-search-field')) {
    suggestBox.classList.remove('show');
  }
});

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    suggestBox.classList.remove('show');
    doSearch();
  }
});

document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('locBtn').addEventListener('click', useLocation);

async function geocode(q, showSuggestions) {
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    const d = await r.json();
    if (!d.results?.length) {
      if (showSuggestions) {
        suggestBox.innerHTML = '';
        suggestBox.classList.remove('show');
      }
      return null;
    }
    if (showSuggestions) {
      suggestBox.innerHTML = d.results
        .map((loc, i) => `
          <div class="suggestion-item" data-lat="${loc.latitude}" data-lon="${loc.longitude}" data-name="${esc(loc.name)}" data-country="${esc(loc.country || '')}">
            <span>${esc(loc.name)}${loc.admin1 ? ', ' + esc(loc.admin1) : ''}</span>
            <span class="country">${esc(loc.country || '')}</span>
          </div>
        `)
        .join('');
      suggestBox.classList.add('show');
      suggestBox.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          cityInput.value = el.dataset.name;
          suggestBox.classList.remove('show');
          fetchWeather(
            parseFloat(el.dataset.lat),
            parseFloat(el.dataset.lon),
            el.dataset.name + (el.dataset.country ? ', ' + el.dataset.country : '')
          );
        });
      });
    }
    return d.results;
  } catch (e) {
    console.error('Geocoding error:', e);
    return null;
  }
}

async function doSearch() {
  const q = cityInput.value.trim();
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
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const d = await r.json();
        name = d.address?.city || d.address?.town || d.address?.village || d.address?.county || name;
        if (d.address?.country) name += ', ' + d.address.country;
      } catch {}
      fetchWeather(latitude, longitude, name);
    },
    () => showMsg('<span class="msg-icon">🚫</span><div class="msg-title">Location access denied</div><div class="msg-sub">Please search manually</div>')
  );
}

// ──────────────────────────────────────────────────────────────────────────
// WEATHER FETCHING
// ──────────────────────────────────────────────────────────────────────────

async function fetchWeather(lat, lon, cityName) {
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
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    const d = await r.json();
    STATE.currentData = d;
    renderWeather(d, cityName, lat, lon);
    showSatellitePanel();
  } catch (err) {
    console.error('Weather fetch error:', err);
    showMsg('<span class="msg-icon">⚠️</span><div class="msg-title">Failed to load weather</div><div class="msg-sub">Check your connection and try again</div>');
  }
}

// ──────────────────────────────────────────────────────────────────────────
// WEATHER RENDERING
// ──────────────────────────────────────────────────────────────────────────

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

  document.getElementById('currentCard').innerHTML = `
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
  for (let i = 0; i < hourly.time.length && count < 24; i++) {
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
  document.getElementById('hourlyRow').innerHTML = hourlyRows.join('');

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
  document.getElementById('dayList').innerHTML = dayItems.join('');

  // Detail cards
  const uv = daily.uv_index_max[0];
  const uvColor = uv <= 2 ? '#5aff8a' : uv <= 5 ? '#ffe05a' : uv <= 7 ? '#ffaa5a' : '#ff6060';
  const uvW = Math.min((uv / 11) * 100, 100);
  const ws = convertWind(daily.wind_speed_10m_max[0]);
  const wsW = Math.min((ws / 80) * 100, 100);

  document.getElementById('detailGrid').innerHTML = `
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

  const msg = document.getElementById('message');
  const weather = document.getElementById('weather');
  msg.style.display = 'none';
  weather.classList.add('visible');
}

// ──────────────────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────────────────

const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');
const settingsScrim = document.getElementById('settingsScrim');
const settingsDrawer = document.getElementById('settingsDrawer');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');

themeToggleBtn.addEventListener('click', () => {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', STATE.theme);
  themeIcon.textContent = STATE.theme === 'dark' ? 'dark_mode' : 'light_mode';
  localStorage.setItem('theme', STATE.theme);
});

settingsBtn.addEventListener('click', () => {
  settingsScrim.classList.add('open');
  settingsDrawer.classList.add('open');
});

[settingsCloseBtn, settingsScrim].forEach(el => {
  el.addEventListener('click', () => {
    settingsScrim.classList.remove('open');
    settingsDrawer.classList.remove('open');
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
        themeIcon.textContent = STATE.theme === 'dark' ? 'dark_mode' : 'light_mode';
      }

      if (STATE.currentData) renderWeather(STATE.currentData, STATE.currentCity, STATE.currentLat, STATE.currentLon);
    });
  });
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
STATE.theme = savedTheme;
document.documentElement.setAttribute('data-theme', savedTheme);
themeIcon.textContent = savedTheme === 'dark' ? 'dark_mode' : 'light_mode';

// ──────────────────────────────────────────────────────────────────────────
// MAP
// ──────────────────────────────────────────────────────────────────────────

const mapToggleBtn = document.getElementById('mapToggleBtn');
const mapPanel = document.getElementById('mapPanel');

mapToggleBtn.addEventListener('click', () => {
  mapPanel.classList.toggle('open');
  mapToggleBtn.classList.toggle('open');
});

// ──────────────────────────────────────────────────────────────────────────
// SATELLITE MESSAGE PANEL
// ──────────────────────────────────────────────────────────────────────────

function showSatellitePanel() {
  document.getElementById('satToggleRow').classList.add('visible');
}

const satToggleBtn = document.getElementById('satToggleBtn');
const satCard = document.getElementById('satCard');

satToggleBtn.addEventListener('click', () => {
  satCard.classList.toggle('open');
  satToggleBtn.classList.toggle('open');
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
    message += `UV:${weather.daily.uv_index_max[0]} Humidity:${c.relative_humidity_2m}%`;
  }

  const truncated = message.substring(0, charLimit);
  document.getElementById('satMsgText').value = truncated;
  document.getElementById('satCharCount').textContent = `${truncated.length} / ${charLimit}`;
  document.getElementById('satTranslation').textContent = `Weather update: ${Math.round(tempVal)}° with ${condLabel.toLowerCase()}, wind at ${windVal} ${windUnit}.`;
  document.getElementById('satOutput').classList.add('show');

  const charCount = document.getElementById('satCharCount');
  charCount.classList.remove('warn', 'over');
  if (truncated.length > charLimit * 0.9) charCount.classList.add('warn');
  if (truncated.length >= charLimit) charCount.classList.add('over');
}

function copySatMessage() {
  const msg = document.getElementById('satMsgText').value;
  navigator.clipboard.writeText(msg).then(() => {
    const feedback = document.getElementById('satCopyFeedback');
    feedback.classList.add('show');
    setTimeout(() => feedback.classList.remove('show'), 2000);
  });
}

// Initialize
showMsg('<span class="msg-icon">🌤</span><div class="msg-title">Welcome to Meteoron</div><div class="msg-sub">Search for a city, enter coordinates, or click the map to get started.</div>');
