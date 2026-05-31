/**
 * Meteoron — Cards
 * Renders: current conditions, hourly scroll, 7-day outlook,
 * detail grid (UV + max wind), and fire danger card.
 *
 * All weather iconography via Erik Flowers wi-* classes only.
 */

import { S }                   from '../core/state.js';
import { emit }                from '../core/state.js';
import { SUB_LABELS, SUB_CLASS } from '../core/config.js';
import {
  convertTemp, tempUnit,
  convertWind, windLabel, toKmh,
  degToCompass, formatHour, uvCategory,
}                              from '../core/units.js';
import { getPressureTrend }    from '../core/cache.js';
import { esc }                 from '../core/utils.js';
import {
  wmoEntryWith,
  beaufortLevel, beaufortSVG,
  getSunTimes, sunTimeToDisplay,
  getMoonPhase, moonWiClass, moonPhaseDesc,
}                              from './icons.js';
import { isFireProne, calcFFDI, fireRating, droughtFactor } from '../weather/fire.js';

// Re-export so sheets.js can import from here without a separate icons import
export { wmoEntryWith, beaufortLevel, beaufortSVG };

// ── Dew point ────────────────────────────────────────────────────────────

function calcDewPoint(tempC, rhPct) {
  const a = 17.27, b = 237.7;
  const gamma = a * tempC / (b + tempC) + Math.log(Math.max(rhPct, 1) / 100);
  return Math.round(b * gamma / (a - gamma));
}

// ── Context badge ────────────────────────────────────────────────────────

/**
 * Update the context badge text and CSS class.
 * Also updates S.ui.context for dynamic fire/alpine detection.
 *
 * @param {object} current  d.current from Open-Meteo response
 * @param {number} wsKmh    Current wind speed in km/h
 */
function updateContextBadge(current, wsKmh) {
  let displaySub = S.ui.subProfile;

  // Dynamic fire check for overland profiles
  if (['lowland', 'highland', 'alpine'].includes(S.ui.subProfile)) {
    if (isFireProne(current.temperature_2m, current.relative_humidity_2m, wsKmh)) {
      displaySub = 'fire';
      S.ui.context = 'fire';
    } else if (S.ui.subProfile === 'alpine') {
      S.ui.context = 'alpine';
    } else {
      S.ui.context = 'general';
    }
  } else if (S.ui.profile === 'marine') {
    S.ui.context = 'marine';
  } else if (S.ui.profile === 'aviation') {
    S.ui.context = 'general';
  }

  const badge = document.getElementById('contextBadge');
  badge.textContent = SUB_LABELS[displaySub] ?? 'General';
  badge.className   = 'context-badge ' + (SUB_CLASS[displaySub] ?? '');
}

// ── Current conditions card ───────────────────────────────────────────────

export function renderCurrentCard(d, lat, lon) {
  const c    = d.current;
  const now  = new Date();
  const wsKmh = toKmh(c.wind_speed_10m);
  const bft  = beaufortLevel(wsKmh);
  const [condLabel, condWiClass] = wmoEntryWith(c.weather_code, now, lat, lon);

  updateContextBadge(c, wsKmh);

  // Pressure trend
  const trend = getPressureTrend(lat, lon, c.surface_pressure);
  let pressureStat;
  if (trend) {
    const col = trend.dir === '↑' ? 'var(--success)'
              : trend.dir === '↓' ? 'var(--error)'
              : 'var(--on-surface)';
    pressureStat = `<div class="stat">
      <div class="stat-label">Pressure</div>
      <div class="stat-val" style="font-size:.9rem;color:${col}">${trend.dir} ${trend.label}</div>
      <div style="font-family:var(--font-data);font-size:.5625rem;color:var(--on-surface-dim);margin-top:2px">${trend.rate} hPa/hr · ${Math.round(c.surface_pressure)} hPa</div>
    </div>`;
  } else {
    pressureStat = `<div class="stat">
      <div class="stat-label">Pressure</div>
      <div class="stat-val">${Math.round(c.surface_pressure)}<span class="stat-unit"> hPa</span></div>
    </div>`;
  }

  // Dew point / humidity
  const isFire = S.ui.context === 'fire';
  const dp = calcDewPoint(c.temperature_2m, c.relative_humidity_2m);
  const humidInner = isFire
    ? `<div class="stat-val">${c.relative_humidity_2m}<span class="stat-unit"> %</span></div>`
    : `<div class="stat-val">${convertTemp(dp)}<span class="stat-unit"> ${tempUnit()}</span></div>
       <div style="font-family:var(--font-data);font-size:.5625rem;color:var(--on-surface-dim);margin-top:2px">RH ${c.relative_humidity_2m}%</div>`;
  const humidStat = `<div class="stat"><div class="stat-label">${isFire ? 'Humidity' : 'Dew Point'}</div>${humidInner}</div>`;

  // Sunrise / sunset
  const sunT = getSunTimes(now, lat, lon);
  let sunStat;
  if (sunT.polarDay) {
    sunStat = `<div class="stat"><div class="stat-label">Sun</div><div class="stat-val" style="font-size:.75rem;line-height:1.5">Polar<br>Day</div></div>`;
  } else if (sunT.polarNight) {
    sunStat = `<div class="stat"><div class="stat-label">Sun</div><div class="stat-val" style="font-size:.75rem;line-height:1.5">Polar<br>Night</div></div>`;
  } else {
    const srStr = sunTimeToDisplay(sunT.sunrise, lon, d.timezone);
    const ssStr = sunTimeToDisplay(sunT.sunset,  lon, d.timezone);
    sunStat = `<div class="stat">
      <div class="stat-label">Sun</div>
      <div style="font-family:var(--font-data);font-size:.75rem;line-height:2;margin-top:2px">
        <i class="wi wi-sunrise" style="color:#F59E0B;margin-right:3px;font-size:.875rem"></i>${srStr}<br>
        <i class="wi wi-sunset"  style="color:#7C6AF5;margin-right:3px;font-size:.875rem"></i>${ssStr}
      </div>
    </div>`;
  }

  // Moon
  const moonPh  = getMoonPhase(now);
  const moonStat = `<div class="stat">
    <div class="stat-label">Moon</div>
    <div class="stat-val" style="font-size:1.5rem;line-height:1"><i class="wi ${moonWiClass(moonPh)}"></i></div>
    <div style="font-family:var(--font-data);font-size:.5625rem;color:var(--on-surface-dim);margin-top:3px;letter-spacing:.03em">${moonPhaseDesc(moonPh)}</div>
  </div>`;

  const { elevation, isLand } = S.runtime;
  const elevStr = elevation > 0
    ? `${Math.round(elevation)}m asl`
    : isLand ? 'Sea level' : 'Ocean';

  document.getElementById('currentCard').innerHTML = `
    <div class="location-eyebrow">Current Conditions</div>
    <div class="city-name">${esc(S.runtime.city)}</div>
    <div class="coord-sub">${lat.toFixed(4)}°, ${lon.toFixed(4)}° · ${esc(d.timezone)} · ${elevStr}</div>
    <div class="big-temp">${convertTemp(c.temperature_2m)}<sup>${tempUnit()}</sup></div>
    <div class="feels-like">Feels like ${convertTemp(c.apparent_temperature)}${tempUnit()}</div>
    <div class="condition-line">
      <i class="wi ${condWiClass} wi-lg" style="margin-right:8px"></i>${condLabel}
    </div>
    <div class="beaufort-badge">
      ${beaufortSVG(bft, 22)}
      <span style="font-weight:600;color:var(--on-surface)">Bft ${bft}</span>
      <span style="color:var(--on-surface-dim)"> — ${BFT_LABELS[bft]} · ${convertWind(wsKmh)} ${windLabel()} ${degToCompass(c.wind_direction_10m)}</span>
    </div>
    <div class="stats-row">
      ${pressureStat}
      ${humidStat}
      ${sunStat}
      ${moonStat}
    </div>`;
}

// ── Hourly scroll ─────────────────────────────────────────────────────────

export function renderHourlyScroll(d, lat, lon) {
  const hourly = d.hourly;
  const now    = new Date();
  const rows   = [];
  let count    = 0;

  for (let i = 0; i < hourly.time.length && count < 24; i++) {
    const t = new Date(hourly.time[i]);
    if (t < now) continue;

    const wsKmh = toKmh(hourly.wind_speed_10m[i]);
    const bft   = beaufortLevel(wsKmh);
    const [, wiClass] = wmoEntryWith(hourly.weather_code[i], t, lat, lon);

    rows.push(`<div class="hour-card${count === 0 ? ' now' : ''}" data-idx="${i}">
      <div class="h-time">${count === 0 ? 'Now' : formatHour(t, d.timezone)}</div>
      <div class="h-icon"><i class="wi ${wiClass}"></i></div>
      <div class="h-temp">${convertTemp(hourly.temperature_2m[i])}°</div>
      <div class="h-rain"><i class="wi wi-raindrop"></i> ${hourly.precipitation_probability[i]}%</div>
    </div>`);
    count++;
  }

  const container = document.getElementById('hourlyRow');
  container.innerHTML = rows.join('');

  // Delegate click → emit event for sheets.js to handle
  container.querySelectorAll('.hour-card').forEach(card => {
    card.addEventListener('click', () => {
      emit('sheet:open', { idx: parseInt(card.dataset.idx), data: d, lat, lon });
    });
  });
}

// ── 7-day daily list ──────────────────────────────────────────────────────

export function renderDailyList(d, lat, lon) {
  const daily    = d.daily;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  document.getElementById('dayList').innerHTML = daily.time.map((t, i) => {
    const dt = new Date(t + 'T12:00:00');
    const [dLabel, dWiClass] = wmoEntryWith(daily.weather_code[i], dt, lat, lon);

    return `<div class="day-row${i === 0 ? ' today' : ''}">
      <div class="day-name">${i === 0 ? 'Today' : dayNames[dt.getDay()]}</div>
      <div class="day-bft"><i class="wi ${dWiClass}" style="font-size:1.1rem"></i></div>
      <div class="day-desc">${esc(dLabel)}</div>
      <div class="day-rain"><i class="wi wi-raindrop"></i> ${daily.precipitation_probability_max[i]}%</div>
      <div class="day-range">
        <span class="day-hi">${convertTemp(daily.temperature_2m_max[i])}°</span>
        <span class="day-lo">${convertTemp(daily.temperature_2m_min[i])}°</span>
      </div>
    </div>`;
  }).join('');
}

// ── Detail grid — UV + max wind ───────────────────────────────────────────

export function renderDetailGrid(d) {
  const daily  = d.daily;
  const uv     = daily.uv_index_max[0];
  const uvColor = uv <= 2 ? '#2E7D32'
                : uv <= 5 ? '#F9A825'
                : uv <= 7 ? '#EF6C00'
                : '#C62828';

  const wsKmh  = toKmh(daily.wind_speed_10m_max[0]);
  const wsV    = parseFloat(convertWind(wsKmh));
  const wsMax  = { kn: 43, ms: 22, mph: 50 }[S.user.windUnit] ?? 80;

  document.getElementById('detailGrid').innerHTML = `
    <div class="detail-card">
      <div class="dc-label">UV Index — Today</div>
      <div class="dc-val">${uv}</div>
      <div class="dc-unit">${uvCategory(uv)}</div>
      <div class="linear-bar">
        <div class="linear-fill" style="width:${Math.min(uv / 11 * 100, 100)}%;background:${uvColor}"></div>
      </div>
    </div>
    <div class="detail-card">
      <div class="dc-label">Max Wind — Today</div>
      <div class="dc-val">${wsV}</div>
      <div class="dc-unit">${windLabel()} · ${degToCompass(daily.wind_direction_10m_dominant[0])}</div>
      <div class="linear-bar">
        <div class="linear-fill" style="width:${Math.min(wsV / wsMax * 100, 100)}%;background:var(--primary)"></div>
      </div>
    </div>`;
}

// ── Fire danger card ──────────────────────────────────────────────────────

export function renderFireCard(d) {
  const fireCard = document.getElementById('fireCard');
  if (S.ui.context !== 'fire' && S.ui.context !== 'general') {
    fireCard.className = 'fire-card';
    return;
  }

  const c         = d.current;
  const wsKmh     = toKmh(c.wind_speed_10m);
  const recentRain = (d.daily.precipitation_sum ?? []).slice(0, 5).reduce((a, b) => a + (b ?? 0), 0);
  const df         = droughtFactor(recentRain);
  const ffdi       = calcFFDI(c.temperature_2m, c.relative_humidity_2m, wsKmh, df);
  const fr         = fireRating(ffdi);

  if (ffdi > 5) {
    fireCard.className = 'fire-card show';
    fireCard.innerHTML = `
      <div class="dc-label">Forest Fire Danger Index — McArthur Scale</div>
      <div class="fire-rating" style="color:${fr.color}">${fr.label}</div>
      <div class="fire-index" style="font-family:var(--font-data)">
        FFDI ${Math.round(ffdi)} · DF ${df} · T${Math.round(c.temperature_2m)}° RH${Math.round(c.relative_humidity_2m)}% W${Math.round(wsKmh)}km/h
      </div>
      <div class="fire-bar"></div>
      <div class="fire-disclaimer">
        Approximate FFDI. Not for emergency use. Source: McArthur (1967).
      </div>`;
  } else {
    fireCard.className = 'fire-card';
  }
}

// ── Main render orchestrator ──────────────────────────────────────────────

// BFT_LABELS needed by renderCurrentCard — import from config via this file
import { BFT_LABELS } from '../core/config.js';

/**
 * Render all weather cards for a new data payload.
 * Called by main.js on 'weather:ready'.
 *
 * @param {object} d    Full Open-Meteo /forecast response
 * @param {number} lat
 * @param {number} lon
 */
export function renderWeather(d, lat, lon) {
  renderCurrentCard(d, lat, lon);
  renderHourlyScroll(d, lat, lon);
  renderDailyList(d, lat, lon);
  renderDetailGrid(d);
  renderFireCard(d);

  document.getElementById('message').style.display = 'none';
  document.getElementById('weather').classList.add('visible');
  document.getElementById('satToggleRow').classList.add('visible');
  document.getElementById('profileSection').style.display = '';
}

// ── Loading skeletons ─────────────────────────────────────────────────────

export function showLoadingSkeletons() {
  document.getElementById('message').style.display = 'none';
  document.getElementById('weather').classList.add('visible');

  document.getElementById('hourlyRow').innerHTML = Array(8).fill(0)
    .map(() => '<div class="hour-card skeleton skeleton-hour-card"></div>')
    .join('');

  document.getElementById('dayList').innerHTML = Array(7).fill(0)
    .map(() => '<div class="skeleton skeleton-day-row" style="margin-bottom:1px"></div>')
    .join('');

  document.getElementById('currentCard').innerHTML =
    '<div class="skeleton" style="height:220px;border-radius:var(--shape-xl)"></div>';
}