/**
 * Meteoron — Sheets
 * Bottom sheet hourly detail panel.
 * Subscribes to 'sheet:open' event; handles close interactions.
 *
 * All weather iconography via Erik Flowers wi-* classes only.
 */

import { S }                    from '../core/state.js';
import { on }                   from '../core/state.js';
import { BFT_LABELS, BFT_MARINE } from '../core/config.js';
import {
  convertTemp, tempUnit,
  convertWind, windLabel, toKmh,
  degToCompass, formatHour,
}                               from '../core/units.js';
import { trapFocus, releaseFocus, esc } from '../core/utils.js';
import {
  wmoEntryWith, beaufortLevel, beaufortSVG,
}                               from './icons.js';
import { calcFFDI, fireRating, droughtFactor } from '../weather/fire.js';

const sheetEl   = document.getElementById('bottomSheet');
const sheetScrim = document.getElementById('sheetScrim');
const sheetInner = document.getElementById('sheetInner');

let _sheetOpener = null;

// ── Open / close ──────────────────────────────────────────────────────────

function closeSheet() {
  sheetEl.classList.remove('open');
  sheetScrim.classList.remove('open');
  releaseFocus(sheetEl, _sheetOpener);
}

sheetScrim.addEventListener('click', closeSheet);
sheetEl.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// ── Subscribe to open event ───────────────────────────────────────────────

on('sheet:open', ({ idx, data: d, lat, lon }) => {
  _sheetOpener = document.activeElement;
  buildSheet(idx, d, lat, lon);
  sheetEl.classList.add('open');
  sheetScrim.classList.add('open');
  trapFocus(sheetEl);
});

// ── Sheet builder ─────────────────────────────────────────────────────────

function buildSheet(idx, d, lat, lon) {
  const h      = d.hourly;
  const t      = new Date(h.time[idx]);
  const wsKmh  = toKmh(h.wind_speed_10m[idx]);
  const bft    = beaufortLevel(wsKmh);
  const [condLabel, condWiClass] = wmoEntryWith(h.weather_code[idx], t, lat, lon);
  const rh     = h.relative_humidity_2m?.[idx] ?? '—';
  const pres   = h.surface_pressure?.[idx] ? Math.round(h.surface_pressure[idx]) : '—';

  sheetInner.innerHTML = `
    <div class="sheet-time">${formatHour(t, d.timezone)} · ${t.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
    <div class="sheet-temp">${convertTemp(h.temperature_2m[idx])}<sup style="font-size:1rem;opacity:.6">${tempUnit()}</sup></div>
    <div class="sheet-condition">
      <i class="wi ${condWiClass}" style="font-size:1.5rem;margin-right:10px;vertical-align:middle"></i>${condLabel}
    </div>
    ${buildContextHTML(idx, d, lat, lon, h, t, wsKmh, bft, rh, pres)}`;
}

// ── Context-aware detail section ──────────────────────────────────────────

function buildContextHTML(idx, d, _lat, _lon, h, _t, wsKmh, bft, rh, pres) {
  switch (S.ui.context) {

    case 'marine':
      return buildMarineHTML(idx, wsKmh, bft, rh, pres);

    case 'alpine':
      return buildAlpineHTML(idx, h, wsKmh, bft, rh, pres);

    case 'fire':
      return buildFireHTML(idx, d, h, wsKmh, rh);

    default:
      return buildGeneralHTML(idx, h, wsKmh, bft, rh, pres);
  }
}

function buildMarineHTML(idx, wsKmh, bft, rh, pres) {
  if (!S.data.marine) return buildGeneralHTML(idx, null, wsKmh, bft, rh, pres);

  const m  = S.data.marine.hourly;
  const mi = Math.min(idx, m.time.length - 1);

  const wh = m.wave_height?.[mi]?.toFixed(1)          ?? '—';
  const wp = m.wave_period?.[mi]?.toFixed(0)           ?? '—';
  const wd = m.wave_direction?.[mi] != null ? degToCompass(m.wave_direction[mi]) : '—';
  const sh = m.swell_wave_height?.[mi]?.toFixed(1)     ?? '—';
  const sp = m.swell_wave_period?.[mi]?.toFixed(0)     ?? '—';
  const sd = m.swell_wave_direction?.[mi] != null ? degToCompass(m.swell_wave_direction[mi]) : '—';
  const cv = m.ocean_current_velocity?.[mi]?.toFixed(1) ?? '—';
  const cd = m.ocean_current_direction?.[mi] != null ? degToCompass(m.ocean_current_direction[mi]) : '—';

  return `
    <div class="sheet-context-title">Marine Conditions</div>
    <div class="sheet-beaufort">
      ${beaufortSVG(bft, 28)}
      <div>
        <div class="sheet-bft-label">Beaufort ${bft} — ${BFT_LABELS[bft]}</div>
        <div class="sheet-bft-desc">${BFT_MARINE[bft]}</div>
      </div>
    </div>
    <div class="sheet-grid">
      <div class="sheet-stat"><div class="sheet-stat-label">Wave Height</div><div class="sheet-stat-val">${wh}<span class="sheet-stat-unit"> m</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Wave Period</div><div class="sheet-stat-val">${wp}<span class="sheet-stat-unit"> s</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Wave Dir.</div><div class="sheet-stat-val">${wd}</div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Swell Height</div><div class="sheet-stat-val">${sh}<span class="sheet-stat-unit"> m</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Swell Period</div><div class="sheet-stat-val">${sp}<span class="sheet-stat-unit"> s</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Swell Dir.</div><div class="sheet-stat-val">${sd}</div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Current</div><div class="sheet-stat-val">${cv}<span class="sheet-stat-unit"> m/s</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Current Dir.</div><div class="sheet-stat-val">${cd}</div></div>
    </div>`;
}

function buildAlpineHTML(idx, h, wsKmh, bft, rh, pres) {
  const tc = h.temperature_2m[idx];
  const wc = Math.round(
    13.12 + 0.6215 * tc
    - 11.37 * Math.pow(wsKmh, 0.16)
    + 0.3965 * tc * Math.pow(wsKmh, 0.16)
  );
  return `
    <div class="sheet-context-title">Alpine Conditions</div>
    <div class="sheet-beaufort">
      ${beaufortSVG(bft, 28)}
      <div>
        <div class="sheet-bft-label">Beaufort ${bft} — ${BFT_LABELS[bft]}</div>
        <div class="sheet-bft-desc">Elevation ${Math.round(S.runtime.elevation)}m asl</div>
      </div>
    </div>
    <div class="sheet-grid">
      <div class="sheet-stat"><div class="sheet-stat-label">Wind Chill</div><div class="sheet-stat-val">${convertTemp(wc)}<span class="sheet-stat-unit"> ${tempUnit()}</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Humidity</div><div class="sheet-stat-val">${rh}<span class="sheet-stat-unit"> %</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Wind</div><div class="sheet-stat-val">${convertWind(wsKmh)}<span class="sheet-stat-unit"> ${windLabel()}</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Pressure</div><div class="sheet-stat-val">${pres}<span class="sheet-stat-unit"> hPa</span></div></div>
    </div>`;
}

function buildFireHTML(idx, d, h, wsKmh, rh) {
  const tc         = h.temperature_2m[idx];
  const recentRain = (d.daily.precipitation_sum ?? []).slice(0, 5).reduce((a, b) => a + (b ?? 0), 0);
  const df         = droughtFactor(recentRain);
  const ffdi       = calcFFDI(tc, rh, wsKmh, df);
  const fr         = fireRating(ffdi);
  return `
    <div class="sheet-context-title">Fire Conditions — McArthur Scale</div>
    <div class="sheet-grid">
      <div class="sheet-stat"><div class="sheet-stat-label">FFDI</div><div class="sheet-stat-val" style="color:${fr.color}">${Math.round(ffdi)}</div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Rating</div><div class="sheet-stat-val" style="color:${fr.color}">${fr.label}</div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Drought Factor</div><div class="sheet-stat-val">${df}</div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Humidity</div><div class="sheet-stat-val">${rh}<span class="sheet-stat-unit"> %</span></div></div>
    </div>`;
}

function buildGeneralHTML(idx, h, wsKmh, bft, rh, pres) {
  const wd   = h ? degToCompass(h.wind_direction_10m[idx]) : '—';
  const rain = h ? h.precipitation_probability[idx] : '—';
  return `
    <div class="sheet-context-title">Atmospheric Detail</div>
    <div class="sheet-beaufort">
      ${beaufortSVG(bft, 28)}
      <div>
        <div class="sheet-bft-label">Beaufort ${bft} — ${BFT_LABELS[bft]}</div>
        <div class="sheet-bft-desc">${convertWind(wsKmh)} ${windLabel()} from ${wd}</div>
      </div>
    </div>
    <div class="sheet-grid">
      <div class="sheet-stat"><div class="sheet-stat-label">Humidity</div><div class="sheet-stat-val">${rh}<span class="sheet-stat-unit"> %</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Pressure</div><div class="sheet-stat-val">${pres}<span class="sheet-stat-unit"> hPa</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Wind</div><div class="sheet-stat-val">${convertWind(wsKmh)}<span class="sheet-stat-unit"> ${windLabel()}</span></div></div>
      <div class="sheet-stat"><div class="sheet-stat-label">Rain prob.</div><div class="sheet-stat-val">${rain}<span class="sheet-stat-unit"> %</span></div></div>
    </div>`;
}

/** Called by settings.js after unit changes — re-render open sheet if visible. */
export function refreshSheetIfOpen() {
  if (!sheetEl.classList.contains('open')) return;
  // Sheet content is rebuilt on next open; no action needed here.
  // If we wanted live refresh we'd store the last idx/data and replay.
}