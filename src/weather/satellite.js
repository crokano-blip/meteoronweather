/**
 * Meteoron — Satellite
 * Satellite message generation (Marine, Overland, Aviation profiles).
 * Legend toggle and .txt download.
 *
 * Message format is compressed ASCII for Garmin inReach (160 ch) and SPOT X (100 ch).
 */

import { S }              from '../core/state.js';
import { WMO }            from '../core/config.js';
import {
  convertTemp, tempUnit,
  convertWind, windLabel, toKmh,
  degToCompass,
}                         from '../core/units.js';
import { beaufortLevel }  from '../ui/icons.js';

// ── Panel toggle ──────────────────────────────────────────────────────────

document.getElementById('satToggleBtn').addEventListener('click', () => {
  const open = document.getElementById('satCard').classList.toggle('open');
  const btn  = document.getElementById('satToggleBtn');
  btn.classList.toggle('open', open);
  document.getElementById('satToggleLabel').textContent =
    open ? 'Hide Satellite Message' : 'Satellite Message';
});

// ── Profile / device selectors ────────────────────────────────────────────

['satProfileGroup', 'satDeviceGroup'].forEach(gid => {
  document.querySelectorAll(`#${gid} .seg-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`#${gid} .seg-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

function getSatProfile() {
  return document.querySelector('#satProfileGroup .seg-btn.active')?.dataset.val ?? 'overland';
}
function getSatDevice() {
  return parseInt(document.querySelector('#satDeviceGroup .seg-btn.active')?.dataset.val ?? '160');
}

// ── Generate ──────────────────────────────────────────────────────────────

document.getElementById('satGenerateBtn').addEventListener('click', generateSatMessage);

function generateSatMessage() {
  if (!S.data.weather) return;

  const profile  = getSatProfile();
  const maxChars = getSatDevice();
  const hourly   = S.data.weather.hourly;
  const now      = new Date();
  let startIdx   = 0;

  for (let i = 0; i < hourly.time.length; i++) {
    if (new Date(hourly.time[i]) >= now) { startIdx = i; break; }
  }

  const loc = abbrLoc(S.runtime.city);
  const { window: fw, triggers } = determineForecastWindow(hourly, profile, startIdx);
  const offsets = fw === 24 ? [0, 6, 12, 18] : [0, 6, 12, 18, 24, 36, 48, 60, 72];
  const labels  = offsets.map(h => h === 0 ? 'Now' : `+${h}H`);

  let slots = [];
  for (let s = 0; s < offsets.length; s++) {
    const idx = startIdx + offsets[s];
    if (idx >= hourly.time.length) break;
    slots.push(buildSlot(hourly, idx, profile, labels[s]));
  }

  const warnStr = buildWarnings(triggers);
  let msg = `${loc} ${fw}H|${slots.join('|')}`;
  if (warnStr) msg += `|⚠${warnStr}`;

  // Truncate slots to fit character limit
  while (slots.length > 2 && msg.length > maxChars) {
    slots.splice(slots.length - (warnStr ? 2 : 1), 1);
    msg = `${loc} ${fw}H|${slots.join('|')}`;
    if (warnStr) msg += `|⚠${warnStr}`;
  }

  document.getElementById('satMsgText').value = msg;

  const cc = document.getElementById('satCharCount');
  cc.textContent = `${msg.length} / ${maxChars}`;
  cc.className   = 'sat-char-count'
    + (msg.length > maxChars ? ' over' : msg.length > maxChars * 0.85 ? ' warn' : '');

  document.getElementById('satWindowBadge').textContent = `${fw}H`;
  document.getElementById('satTranslation').textContent =
    buildTranslation(hourly, startIdx, profile, fw, triggers);
  document.getElementById('satOutput').classList.add('show');
}

// ── Copy ──────────────────────────────────────────────────────────────────

document.getElementById('satCopyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('satMsgText').value).then(() => {
    const ok = document.getElementById('satCopyOk');
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 2500);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────

function abbrLoc(name) {
  return (name ?? '???').split(',')[0].trim().split(' ')[0].substring(0, 6).toUpperCase();
}

function abbrWMO(code) {
  if ([95, 96, 99].includes(code)) return 'TSTM';
  if ([65, 82].includes(code))     return 'HVYRN';
  if ([75, 86].includes(code))     return 'HVYSN';
  if ([61, 63, 80, 81].includes(code)) return 'RN';
  if ([71, 73, 77, 85].includes(code)) return 'SN';
  if ([51, 53, 55].includes(code)) return 'DRZL';
  if ([45, 48].includes(code))     return 'FOG';
  if (code === 3)  return 'OCST';
  if (code === 2)  return 'PTCLD';
  return 'CLR';
}

function buildSlot(hourly, idx, profile, label) {
  const temp = convertTemp(hourly.temperature_2m[idx]);
  const ws   = convertWind(toKmh(hourly.wind_speed_10m[idx]));
  const wd   = degToCompass(hourly.wind_direction_10m[idx]);
  const wx   = abbrWMO(hourly.weather_code[idx]);

  if (profile === 'marine') {
    let s = `${label}:WS${ws}${windLabel()} WD${wd}`;
    if (wx !== 'CLR') s += ` ${wx}`;
    return s;
  }
  if (profile === 'overland') {
    let s = `${label}:${temp}${tempUnit()}`;
    if (wx !== 'CLR') s += ` ${wx}`;
    s += ` WS${ws}${windLabel()}`;
    return s;
  }
  // aviation (fallback)
  let s = `${label}:${temp}${tempUnit()}`;
  if (wx !== 'CLR') s += ` ${wx}`;
  s += ` WS${ws}`;
  return s;
}

function determineForecastWindow(hourly, profile, startIdx) {
  const triggers = [];
  for (let i = startIdx; i < Math.min(startIdx + 72, hourly.time.length - 1); i++) {
    const h      = i - startIdx;
    const wsKmh  = toKmh(hourly.wind_speed_10m[i]);
    const wsNext = toKmh(hourly.wind_speed_10m[i + 1] ?? hourly.wind_speed_10m[i]);
    const wdDiff = Math.abs((hourly.wind_direction_10m[i + 1] ?? 0) - hourly.wind_direction_10m[i]);
    const code   = hourly.weather_code[i];
    const tDiff  = (hourly.temperature_2m[i] ?? 0) - (hourly.temperature_2m[startIdx] ?? 0);

    if (profile === 'marine') {
      if (beaufortLevel(wsKmh) !== beaufortLevel(wsNext)) triggers.push({ h, reason: 'wind_change' });
      if (wdDiff > 45 && wdDiff < 315)           triggers.push({ h, reason: 'wind_shift' });
      if ([95, 96, 99].includes(code))            triggers.push({ h, reason: 'tstm' });
      if (beaufortLevel(wsKmh) >= 7 && h > 0)    triggers.push({ h, reason: 'gale' });
    } else if (profile === 'overland' || profile === 'aviation') {
      if (tDiff < -8)                             triggers.push({ h, reason: 'temp_drop' });
      if ([95, 96, 99].includes(code))            triggers.push({ h, reason: 'tstm' });
      if (wsKmh > 50)                             triggers.push({ h, reason: 'high_wind' });
      if ([71, 73, 75, 77, 85, 86].includes(code)) triggers.push({ h, reason: 'snow' });
    } else {
      if ([95, 96, 99].includes(code))            triggers.push({ h, reason: 'tstm' });
      if (wsKmh > 60)                             triggers.push({ h, reason: 'high_wind' });
      if ([65, 75, 82, 86, 95, 96, 99].includes(code)) triggers.push({ h, reason: 'heavy_wx' });
    }
  }
  return { window: triggers.some(t => t.h > 24) ? 72 : 24, triggers };
}

function buildWarnings(triggers) {
  const unique   = [...new Set(triggers.map(t => t.reason))];
  const earliest = r => Math.min(...triggers.filter(t => t.reason === r).map(t => t.h));
  const parts    = [];
  if (unique.includes('tstm'))        parts.push(`TSTM +${earliest('tstm')}H`);
  if (unique.includes('gale'))        parts.push(`GALE +${earliest('gale')}H`);
  if (unique.includes('high_wind'))   parts.push(`HIWIND +${earliest('high_wind')}H`);
  if (unique.includes('temp_drop'))   parts.push(`TDROP +${earliest('temp_drop')}H`);
  if (unique.includes('snow'))        parts.push(`SNOW +${earliest('snow')}H`);
  if (unique.includes('wind_shift'))  parts.push(`WDSHFT +${earliest('wind_shift')}H`);
  if (unique.includes('wind_change')) parts.push(`BFTCHG +${earliest('wind_change')}H`);
  if (unique.includes('heavy_wx'))    parts.push(`HVYWX +${earliest('heavy_wx')}H`);
  return parts.join('|');
}

function buildTranslation(hourly, startIdx, profile, fw, triggers) {
  const code  = hourly.weather_code[startIdx];
  const temp  = convertTemp(hourly.temperature_2m[startIdx]);
  const ws    = convertWind(toKmh(hourly.wind_speed_10m[startIdx]));
  const wd    = degToCompass(hourly.wind_direction_10m[startIdx]);
  const label = (WMO[code]?.[0] ?? 'mixed conditions').toLowerCase();
  const city  = (S.runtime.city ?? '').split(',')[0];

  let intro = `Current conditions near ${city}: ${temp}${tempUnit()}, ${label}, wind ${ws} ${windLabel()} from the ${wd}.`;

  const unique   = [...new Set(triggers.map(t => t.reason))];
  const earliest = r => Math.min(...triggers.filter(t => t.reason === r).map(t => t.h));
  const changes  = [];

  if (unique.includes('tstm'))       changes.push(`Thunderstorms expected around hour ${earliest('tstm')} — potentially dangerous.`);
  if (unique.includes('gale'))       changes.push(`Gale-force winds forecast from hour ${earliest('gale')} onward.`);
  if (unique.includes('wind_change'))changes.push(`Wind strength changes significantly around hour ${earliest('wind_change')}.`);
  if (unique.includes('wind_shift')) changes.push(`Significant wind direction shift forecast around hour ${earliest('wind_shift')}.`);
  if (unique.includes('temp_drop'))  changes.push(`Temperature drops sharply from hour ${earliest('temp_drop')} — cold weather risk.`);
  if (unique.includes('snow'))       changes.push(`Snow expected from hour ${earliest('snow')}.`);
  if (unique.includes('high_wind'))  changes.push(`High winds forecast from hour ${earliest('high_wind')}.`);
  if (unique.includes('heavy_wx'))   changes.push(`Heavy weather forecast from hour ${earliest('heavy_wx')}.`);

  const note = fw === 72
    ? 'The forecast extends to 72 hours due to significant changes ahead.'
    : 'Conditions are broadly stable for the next 24 hours.';

  return [intro, ...changes, note].join(' ');
}

// ── Legend toggle ─────────────────────────────────────────────────────────

document.getElementById('satLegendToggle').addEventListener('click', () => {
  const body  = document.getElementById('satLegendBody');
  const arrow = document.getElementById('satLegendArrow');
  const open  = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
});

// ── Legend download ───────────────────────────────────────────────────────

document.getElementById('satDownloadLegend').addEventListener('click', () => {
  const blob = new Blob([buildLegendText()], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: 'meteoron-message-key.txt',
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function buildLegendText() {
  const L = '='.repeat(54);
  return [
    'METEORON - SATELLITE MESSAGE KEY', 'Weather Intelligence', L, '',
    'TIME & STRUCTURE',
    '+6H / +12H    Hours from now',
    '24H / 72H     Forecast window length',
    'Now           Current conditions',
    '!             Warning - read carefully', '',
    'WIND',
    'WS            Wind speed', 'WD            Wind direction (from)',
    'kt            Knots', 'km/h          Kilometres per hour',
    'm/s           Metres per second', 'mph           Miles per hour',
    'N NE E SE S SW W NW  Compass direction',
    'BFTCHG        Beaufort scale change', 'WDSHFT        Wind direction shift',
    'GALE          Gale force winds (Bft 7+)', 'HIWIND        High wind warning', '',
    'WEATHER CONDITIONS',
    'CLR  Clear sky', 'PTCLD  Partly cloudy', 'OCST  Overcast', 'FOG  Fog or rime fog',
    'DRZL  Drizzle', 'RN  Rain', 'HVYRN  Heavy rain', 'SHWR  Rain showers',
    'HVSHWR  Heavy showers', 'SN  Snow', 'HVYSN  Heavy snow', 'SNSHWR  Snow showers',
    'TSTM  Thunderstorm', 'SVTSTM  Severe thunderstorm', 'HVYWX  Heavy weather',
    'TDROP  Temperature drop warning', 'SNOW  Snow onset warning', '',
    L, 'BEAUFORT SCALE REFERENCE', '',
    'Bft  Description        Knots    km/h',
    '---  -----------------  -------  -------',
    '0    Calm               <1       <1',
    '1    Light air          1-3      1-5',
    '2    Light breeze       4-6      6-11',
    '3    Gentle breeze      7-10     12-19',
    '4    Moderate breeze    11-16    20-28',
    '5    Fresh breeze       17-21    29-38',
    '6    Strong breeze      22-27    39-49',
    '7    Near gale          28-33    50-61',
    '8    Gale               34-40    62-74',
    '9    Severe gale        41-47    75-88',
    '10   Storm              48-55    89-102',
    '11   Violent storm      56-63    103-117',
    '12   Hurricane          64+      118+', '',
    L,
    'Generated by Meteoron | Data: open-meteo.com',
    'Not for emergency use. Verify with official sources.',
  ].join('\n');
}